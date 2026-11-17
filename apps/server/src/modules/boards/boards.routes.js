/**
 * @fileoverview Board routes.
 */

import {CLOSE_BOARD_DELETED} from '../../plugins/realtime.js';
import {publish} from '../../utils/events.js';
import {idParams, nonBlank} from '../../utils/schemas.js';
import {findUserById} from '../users/users.repository.js';
import {
  createBoard,
  deleteBoard,
  getBoard,
  listBoards,
  renameBoard,
} from './boards.service.js';

const nameBody = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {name: nonBlank(100)},
};

const createBody = {
  ...nameBody,
  properties: {...nameBody.properties, teamId: {type: 'integer', minimum: 1}},
};

export default async function boardRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  app.get('/boards', async (request) => ({
    boards: listBoards(app.db, request.user.id),
  }));

  app.post('/boards', {schema: {body: createBody}}, async (request, reply) => {
    const board = createBoard(app.db, request.body, request.user.id);
    return reply.status(201).send({board});
  });

  app.get(
    '/boards/:boardId',
    {schema: {params: idParams('boardId')}},
    async (request) => ({
      board: getBoard(app.db, request.params.boardId, request.user.id),
    }),
  );

  app.patch(
    '/boards/:boardId',
    {schema: {params: idParams('boardId'), body: nameBody}},
    async (request) => {
      const board = renameBoard(
        app.db,
        request.params.boardId,
        request.body,
        request.user.id,
      );
      publish(app, request, board.id, 'board.updated', {board});
      return {board};
    },
  );

  app.delete(
    '/boards/:boardId',
    {schema: {params: idParams('boardId')}},
    async (request, reply) => {
      const {boardId} = request.params;
      deleteBoard(app.db, boardId, request.user.id);
      publish(app, request, boardId, 'board.deleted', {
        boardId,
        actorName: findUserById(app.db, request.user.id).display_name,
      });
      app.realtime.closeRoom(boardId, CLOSE_BOARD_DELETED, 'Board deleted');
      return reply.status(204).send();
    },
  );
}
