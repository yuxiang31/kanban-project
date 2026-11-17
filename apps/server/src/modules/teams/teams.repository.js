/**
 * @fileoverview SQL access for teams and their members.
 */

/** @param {!Object} db @param {number} id */
export function findTeam(db, id) {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
}

/**
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} userId
 * @return {boolean}
 */
export function isMember(db, teamId, userId) {
  return (
    db
      .prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?')
      .get(teamId, userId) !== undefined
  );
}

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Array<!Object>} Team rows with `member_count`, by name.
 */
export function listTeamsForUser(db, userId) {
  return db
    .prepare(
      `SELECT t.*,
              (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id)
                AS member_count
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
       ORDER BY t.name COLLATE NOCASE, t.id`,
    )
    .all(userId);
}

/**
 * @param {!Object} db
 * @param {number} teamId
 * @return {!Array<!Object>} User rows, owner first, then by username.
 */
export function listMembers(db, teamId) {
  return db
    .prepare(
      `SELECT u.*
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.team_id = ?
       ORDER BY (u.id = t.owner_id) DESC, u.username COLLATE NOCASE`,
    )
    .all(teamId);
}

/**
 * @param {!Object} db
 * @param {{name: string, ownerId: number}} team
 * @return {!Object} The inserted row.
 */
export function insertTeam(db, {name, ownerId}) {
  return db
    .prepare('INSERT INTO teams (name, owner_id) VALUES (?, ?) RETURNING *')
    .get(name, ownerId);
}

/**
 * @param {!Object} db
 * @param {number} id
 * @param {string} name
 * @return {!Object} The updated row.
 */
export function renameTeam(db, id, name) {
  return db
    .prepare('UPDATE teams SET name = ? WHERE id = ? RETURNING *')
    .get(name, id);
}

/**
 * Deletes a team. Its memberships and boards (with their stages, tasks and
 * assignments) go with it via ON DELETE CASCADE.
 * @param {!Object} db
 * @param {number} id
 */
export function deleteTeam(db, id) {
  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
}

/** @param {!Object} db @param {number} teamId @return {number} */
export function countBoards(db, teamId) {
  return db
    .prepare('SELECT COUNT(*) AS n FROM boards WHERE team_id = ?')
    .get(teamId).n;
}

/** @param {!Object} db @param {number} teamId @param {number} userId */
export function addMember(db, teamId, userId) {
  db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(
    teamId,
    userId,
  );
}

/** @param {!Object} db @param {number} teamId @param {number} userId */
export function removeMember(db, teamId, userId) {
  db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(
    teamId,
    userId,
  );
}

/**
 * Drops a user's task assignments on one team's boards.
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} userId
 */
export function removeAssignmentsOnTeamBoards(db, teamId, userId) {
  db.prepare(
    `DELETE FROM task_assignees
     WHERE user_id = ?
       AND task_id IN (
         SELECT t.id FROM tasks t JOIN boards b ON b.id = t.board_id
         WHERE b.team_id = ?
       )`,
  ).run(userId, teamId);
}
