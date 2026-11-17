/**
 * @fileoverview Keeps an open board live. Listens on the board's WebSocket
 * and refetches the board whenever someone else changes it; reconnects with
 * exponential backoff and catches up after a drop.
 */

import {useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {CLIENT_ID} from '../api/client.js';
import {boardKey, boardsKey} from '../features/boards/boardQueries.js';

const CLOSE_NORMAL = 1000;
const CLOSE_FORBIDDEN = 4403;
const CLOSE_BOARD_DELETED = 4404;
const MAX_RETRY_MS = 30_000;

/** Events that also change what the board list shows. */
const LIST_EVENTS = new Set(['board.updated', 'task.created', 'task.deleted']);

/**
 * @param {number} boardId
 * @param {{protocol: string, host: string}=} location
 * @return {string}
 */
export function socketUrl(boardId, location = window.location) {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/ws/boards/${boardId}`;
}

/**
 * 1s, 2s, 4s… up to 30s, with up to 20% jitter so many tabs do not
 * reconnect in lockstep after a server restart.
 * @param {number} attempt 0 for the first retry.
 * @return {number} Milliseconds.
 */
export function defaultRetryDelay(attempt) {
  const base = Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt);
  return Math.min(MAX_RETRY_MS, Math.round(base * (1 + Math.random() * 0.2)));
}

/**
 * @param {number} boardId
 * @param {{
 *   onBoardDeleted: function(?string),
 *   onAccessLost: function(),
 *   retryDelay?: function(number): number,
 * }} options `onBoardDeleted` gets the deleter's name (null if unknown).
 * @return {string} 'connecting' | 'live' | 'reconnecting'.
 */
export function useBoardSocket(boardId, options) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('connecting');
  // Latest callbacks, without reconnecting when their identity changes.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    let socket = null;
    let retryTimer = null;
    let attempt = 0;
    let stopped = false;
    let deletionHandled = false;

    const refreshBoard = () =>
      queryClient.invalidateQueries({queryKey: boardKey(boardId)});

    function handleEvent(event) {
      const mine = event.origin === CLIENT_ID;
      if (event.type === 'board.deleted') {
        // This tab already navigates away after its own delete.
        deletionHandled = true;
        if (!mine) {
          optionsRef.current.onBoardDeleted(event.payload?.actorName ?? null);
        }
        return;
      }
      if (mine) {
        return;
      }
      refreshBoard();
      if (LIST_EVENTS.has(event.type)) {
        queryClient.invalidateQueries({queryKey: boardsKey, exact: true});
      }
    }

    function connect() {
      socket = new WebSocket(socketUrl(boardId));
      socket.onopen = () => {
        if (attempt > 0) {
          // Changes made while disconnected were never pushed.
          refreshBoard();
        }
        attempt = 0;
        setStatus('live');
      };
      socket.onmessage = (message) => {
        let event;
        try {
          event = JSON.parse(message.data);
        } catch {
          return;
        }
        handleEvent(event);
      };
      socket.onclose = ({code}) => {
        if (stopped) {
          return;
        }
        if (code === CLOSE_BOARD_DELETED) {
          if (!deletionHandled) {
            optionsRef.current.onBoardDeleted(null);
          }
          return;
        }
        if (code === CLOSE_FORBIDDEN) {
          optionsRef.current.onAccessLost();
          return;
        }
        setStatus('reconnecting');
        const delay = (optionsRef.current.retryDelay ?? defaultRetryDelay)(
          attempt,
        );
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      socket?.close(CLOSE_NORMAL);
    };
  }, [boardId, queryClient]);

  return status;
}
