/**
 * @fileoverview SQL access for boards.
 */

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Array<!Object>} Personal boards plus boards of the user's teams,
 *     newest first, each with `team_name` and `task_count`.
 */
export function listBoardsForUser(db, userId) {
  return db
    .prepare(
      `SELECT b.*, t.name AS team_name,
              (SELECT COUNT(*) FROM tasks k WHERE k.board_id = b.id)
                AS task_count
       FROM boards b
       LEFT JOIN teams t ON t.id = b.team_id
       WHERE b.owner_user_id = @userId
          OR b.team_id IN (
            SELECT team_id FROM team_members WHERE user_id = @userId
          )
       ORDER BY b.created_at DESC, b.id DESC`,
    )
    .all({userId});
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
