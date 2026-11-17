/**
 * @fileoverview Board permission rules, shared by every board, stage, task
 * and (later) websocket route.
 *
 * - Access: the personal owner. (Team access arrives with teams.)
 * - Delete: anyone with access to a personal board.
 *
 * Missing and forbidden boards both answer 404 so ids cannot be probed.
 */

import {notFound} from '../../utils/errors.js';

/**
 * @param {!Object} board A boards row.
 * @param {number} userId
 * @return {boolean}
 */
export function canDeleteBoard(board, userId) {
  return board.owner_user_id === userId;
}

/**
 * Returns the board row if the user can access it; otherwise throws 404.
 * @param {!Object} db
 * @param {number} boardId
 * @param {number} userId
 * @return {!Object}
 */
export function assertBoardAccess(db, boardId, userId) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board || board.owner_user_id !== userId) {
    throw notFound('Board not found.');
  }
  return board;
}
