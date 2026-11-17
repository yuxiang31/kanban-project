/**
 * @fileoverview SQL access for boards.
 */

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Array<!Object>} Boards visible to the user, newest first, each
 *     with a `task_count`.
 */
export function listBoardsForUser(db, userId) {
  return db
    .prepare(
      `SELECT b.*, (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id)
                   AS task_count
       FROM boards b
       WHERE b.owner_user_id = ?
       ORDER BY b.created_at DESC, b.id DESC`,
    )
    .all(userId);
}

/**
 * @param {!Object} db
 * @param {{name: string, ownerUserId: ?number, teamId: ?number,
 *     createdBy: number}} board
 * @return {!Object} The inserted row.
 */
export function insertBoard(db, {name, ownerUserId, teamId, createdBy}) {
  return db
    .prepare(
      `INSERT INTO boards (name, owner_user_id, team_id, created_by)
       VALUES (?, ?, ?, ?) RETURNING *`,
    )
    .get(name, ownerUserId, teamId, createdBy);
}

/**
 * @param {!Object} db
 * @param {number} id
 * @param {string} name
 * @return {!Object} The updated row.
 */
export function renameBoard(db, id, name) {
  return db
    .prepare('UPDATE boards SET name = ? WHERE id = ? RETURNING *')
    .get(name, id);
}

/**
 * @param {!Object} db
 * @param {number} id
 */
export function deleteBoard(db, id) {
  db.prepare('DELETE FROM boards WHERE id = ?').run(id);
}

/**
 * Assignee pairs for every task on a board.
 * @param {!Object} db
 * @param {number} boardId
 * @return {!Array<{task_id: number, user_id: number}>}
 */
export function listAssigneesForBoard(db, boardId) {
  return db
    .prepare(
      `SELECT ta.task_id, ta.user_id
       FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
       WHERE t.board_id = ?
       ORDER BY ta.task_id, ta.user_id`,
    )
    .all(boardId);
}
