/**
 * @fileoverview SQL access for the users table.
 */

/**
 * Maps a users row to the public shape sent to clients.
 * @param {!Object} row
 * @return {{id: number, username: string, displayName: string}}
 */
export function toPublicUser(row) {
  return {id: row.id, username: row.username, displayName: row.display_name};
}

/**
 * @param {!Object} db
 * @param {string} username Matched case-insensitively.
 * @return {(!Object|undefined)} The full row, including password_hash.
 */
export function findUserByUsername(db, username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

/**
 * @param {!Object} db
 * @param {number} id
 * @return {(!Object|undefined)}
 */
export function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * @param {!Object} db
 * @param {{username: string, passwordHash: string, displayName: string}} user
 * @return {!Object} The inserted row.
 */
export function insertUser(db, {username, passwordHash, displayName}) {
  return db
    .prepare(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES (?, ?, ?) RETURNING *`,
    )
    .get(username, passwordHash, displayName);
}
