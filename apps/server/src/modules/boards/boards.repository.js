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
 *     createdBy: number, color?: ?string}} board
 * @return {!Object} The inserted row.
 */
export function insertBoard(db, {name, ownerUserId, teamId, createdBy, color}) {
  return db
    .prepare(
      `INSERT INTO boards (name, owner_user_id, team_id, created_by, color)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(name, ownerUserId, teamId, createdBy, color ?? null);
}

/**
 * @param {!Object} db
 * @param {number} id
 * @param {{name: string, color: ?string}} fields
 * @return {!Object} The updated row.
 */
export function updateBoard(db, id, {name, color}) {
  return db
    .prepare('UPDATE boards SET name = ?, color = ? WHERE id = ? RETURNING *')
    .get(name, color, id);
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

/**
 * @param {!Object} db
 * @param {number} teamId
 * @return {!Array<!Object>} The team's boards, with `team_name`.
 */
export function listBoardsOfTeam(db, teamId) {
  return db
    .prepare(
      `SELECT b.*, t.name AS team_name
       FROM boards b JOIN teams t ON t.id = b.team_id
       WHERE b.team_id = ?`,
    )
    .all(teamId);
}

/**
 * People who can be assigned to the board's tasks: the owner of a personal
 * board, or every member of a team board's team.
 * @param {!Object} db
 * @param {!Object} board A boards row.
 * @return {!Array<!Object>} Users rows, by display name.
 */
export function listAssignableUsers(db, board) {
  if (board.team_id == null) {
    return db
      .prepare('SELECT * FROM users WHERE id = ?')
      .all(board.owner_user_id);
  }
  return db
    .prepare(
      `SELECT u.* FROM users u
       JOIN team_members tm ON tm.user_id = u.id
       WHERE tm.team_id = ?
       ORDER BY u.display_name COLLATE NOCASE, u.username COLLATE NOCASE`,
    )
    .all(board.team_id);
}
