/**
 * @fileoverview SQL access for stages.
 */

/** @param {!Object} db @param {number} id */
export function findStage(db, id) {
  return db.prepare('SELECT * FROM stages WHERE id = ?').get(id);
}

/** @param {!Object} db @param {number} boardId */
export function listStages(db, boardId) {
  return db
    .prepare('SELECT * FROM stages WHERE board_id = ? ORDER BY position, id')
    .all(boardId);
}

/** @param {!Object} db @param {number} boardId */
export function countStages(db, boardId) {
  return db
    .prepare('SELECT COUNT(*) AS n FROM stages WHERE board_id = ?')
    .get(boardId).n;
}

/** @param {!Object} db @param {number} boardId @return {?number} */
export function maxStagePosition(db, boardId) {
  return db
    .prepare('SELECT MAX(position) AS max FROM stages WHERE board_id = ?')
    .get(boardId).max;
}

/**
 * @param {!Object} db
 * @param {{boardId: number, name: string, position: number}} stage
 * @return {!Object} The inserted row.
 */
export function insertStage(db, {boardId, name, position}) {
  return db
    .prepare(
      `INSERT INTO stages (board_id, name, position) VALUES (?, ?, ?)
       RETURNING *`,
    )
    .get(boardId, name, position);
}

/**
 * @param {!Object} db
 * @param {number} id
 * @param {{name: string, position: number}} fields
 * @return {!Object} The updated row.
 */
export function updateStage(db, id, {name, position}) {
  return db
    .prepare(
      'UPDATE stages SET name = ?, position = ? WHERE id = ? RETURNING *',
    )
    .get(name, position, id);
}

/** @param {!Object} db @param {number} id */
export function deleteStage(db, id) {
  db.prepare('DELETE FROM stages WHERE id = ?').run(id);
}
