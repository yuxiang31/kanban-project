/**
 * @fileoverview Live board updates. Clients open `/ws/boards/:boardId` and
 * receive JSON events whenever that board changes. REST remains the only
 * write path; sockets only receive.
 *
 * Every event is `{type, boardId, actorId, origin, payload}`. `origin` is
 * the sending tab's `X-Client-Id`, so a tab can skip its own echoes while
 * the same user's other tabs still update.
 *
 * Close codes: 4403 = no longer allowed (removed from the team),
 * 4404 = the board was deleted.
 */

import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import {forbidden} from '../utils/errors.js';
import {idParams} from '../utils/schemas.js';
import {assertBoardAccess} from '../modules/boards/boards.access.js';

const OPEN = 1;
export const CLOSE_FORBIDDEN = 4403;
export const CLOSE_BOARD_DELETED = 4404;

/**
 * Refuses cross-site connections. Browsers always send Origin on WebSocket
 * handshakes; it must name this server.
 * @param {!Object} request
 */
function assertSameOrigin(request) {
  const {origin, host} = request.headers;
  if (!origin) {
    return;
  }
  let originHost = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // Unparseable origin: refuse below.
  }
  if (originHost !== host) {
    throw forbidden('Cross-origin connection refused.');
  }
}

export default fp(
  async (app) => {
    // Clients never send data, so keep accepted frames tiny.
    await app.register(websocket, {options: {maxPayload: 1024}});

    /** @type {!Map<number, !Set<{socket: !Object, userId: number}>>} */
    const rooms = new Map();

    function leave(boardId, member) {
      const room = rooms.get(boardId);
      room?.delete(member);
      if (room?.size === 0) {
        rooms.delete(boardId);
      }
    }

    const realtime = {
      /**
       * @param {number} boardId
       * @param {{type: string, actorId: number, origin: ?string,
       *     payload: *}} event
       */
      broadcast(boardId, event) {
        const message = JSON.stringify({...event, boardId});
        for (const {socket} of rooms.get(boardId) ?? []) {
          if (socket.readyState === OPEN) {
            socket.send(message);
          }
        }
      },

      /** Disconnects everyone watching a board. */
      closeRoom(boardId, code, reason) {
        for (const {socket} of rooms.get(boardId) ?? []) {
          socket.close(code, reason);
        }
        rooms.delete(boardId);
      },

      /** Disconnects one user from the given boards. */
      closeUser(boardIds, userId, code, reason) {
        for (const boardId of boardIds) {
          for (const member of [...(rooms.get(boardId) ?? [])]) {
            if (member.userId === userId) {
              member.socket.close(code, reason);
              leave(boardId, member);
            }
          }
        }
      },

      /** @param {number} boardId @return {number} Open sockets on it. */
      roomSize(boardId) {
        return rooms.get(boardId)?.size ?? 0;
      },
    };
    app.decorate('realtime', realtime);

    app.get(
      '/ws/boards/:boardId',
      {
        websocket: true,
        schema: {params: idParams('boardId')},
        preHandler: async (request) => {
          assertSameOrigin(request);
          await app.authenticate(request);
          assertBoardAccess(app.db, request.params.boardId, request.user.id);
        },
      },
      (socket, request) => {
        const {boardId} = request.params;
        const member = {socket, userId: request.user.id};
        if (!rooms.has(boardId)) {
          rooms.set(boardId, new Set());
        }
        rooms.get(boardId).add(member);
        socket.on('close', () => leave(boardId, member));
        // Incoming messages are ignored: REST is the only write path.
      },
    );
  },
  {name: 'realtime', dependencies: ['db', 'auth']},
);
