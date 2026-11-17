/**
 * @fileoverview Board permission rules, shared by every board, stage, task
 * and (later) websocket route.
 *
 * - Access: the personal owner, or any member of the board's team.
 * - Delete: the personal owner; for team boards, the board's creator or the
 *   team's owner.
 *
 * Missing and inaccessible boards both answer 404 so ids cannot be probed.
 */

import {forbidden, notFound} from '../../utils/errors.js';

const BOARD_WITH_ACCESS_SQL = `
  SELECT b.*,
         t.name AS team_name,
         t.owner_id AS team_owner_id,
         EXISTS (
           SELECT 1 FROM team_members tm
           WHERE tm.team_id = b.team_id AND tm.user_id = @userId
         ) AS is_team_member
  FROM boards b
  LEFT JOIN teams t ON t.id = b.team_id
  WHERE b.id = @boardId`;

/**
 * @param {!Object} board A row from assertBoardAccess.
 * @param {number} userId
 * @return {boolean}
 */
export function canDeleteBoard(board, userId) {
  if (board.team_id == null) {
    return board.owner_user_id === userId;
  }
  return board.created_by === userId || board.team_owner_id === userId;
}

/**
 * Returns the board row (with team_name, team_owner_id) if the user can
 * access it; otherwise throws 404.
 * @param {!Object} db
 * @param {number} boardId
 * @param {number} userId
 * @return {!Object}
 */
export function assertBoardAccess(db, boardId, userId) {
  const board = db.prepare(BOARD_WITH_ACCESS_SQL).get({boardId, userId});
  const allowed =
    board && (board.owner_user_id === userId || board.is_team_member === 1);
  if (!allowed) {
    throw notFound('Board not found.');
  }
  return board;
}

/**
 * Returns the board row if the user may delete it; throws 404/403.
 * @param {!Object} db
 * @param {number} boardId
 * @param {number} userId
 * @return {!Object}
 */
export function assertCanDeleteBoard(db, boardId, userId) {
  const board = assertBoardAccess(db, boardId, userId);
  if (!canDeleteBoard(board, userId)) {
    throw forbidden(
      'Only the board creator or the team owner can delete this board.',
    );
  }
  return board;
}
