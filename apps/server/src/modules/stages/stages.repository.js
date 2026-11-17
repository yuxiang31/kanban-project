/**
 * @fileoverview SQL access for stages.
 */

import {STEP} from '../../utils/position.js';

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

/**
 * Renumbers positions in one container to evenly spaced steps, keeping the
 * current order. Used when neighbours get too close to split. The order is
 * read first: a single correlated UPDATE would re-rank rows mid-update.
 * @param {!Object} db
 * @param {number} containerId
 */
export function rebalanceStages(db, containerId) {
  const ids = db
    .prepare('SELECT id FROM stages WHERE board_id = ? ORDER BY position, id')
    .all(containerId);
  const update = db.prepare('UPDATE stages SET position = ? WHERE id = ?');
  db.transaction(() => {
    ids.forEach(({id}, i) => update.run((i + 1) * STEP, id));
  })();
}
