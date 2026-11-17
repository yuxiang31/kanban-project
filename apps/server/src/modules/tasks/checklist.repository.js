/**
 * @fileoverview SQL access for task checklist items.
 */

/** @param {!Object} db @param {number} id */
export function findItem(db, id) {
  return db.prepare('SELECT * FROM task_checklist_items WHERE id = ?').get(id);
}

/**
 * @param {!Object} db
 * @param {number} taskId
 * @return {!Array<!Object>} In list order.
 */
export function listItems(db, taskId) {
  return db
    .prepare(
      `SELECT * FROM task_checklist_items WHERE task_id = ?
       ORDER BY position, id`,
    )
    .all(taskId);
}

/**
 * Every item on a board's tasks, in list order within each task.
 * @param {!Object} db
 * @param {number} boardId
 * @return {!Array<!Object>}
 */
export function listItemsForBoard(db, boardId) {
  return db
    .prepare(
      `SELECT c.* FROM task_checklist_items c
       JOIN tasks t ON t.id = c.task_id
       WHERE t.board_id = ?
       ORDER BY c.task_id, c.position, c.id`,
    )
    .all(boardId);
}

/**
 * @param {!Object} db
 * @param {number} taskId
 * @return {{count: number, max: ?number}}
 */
export function itemStats(db, taskId) {
  return db
    .prepare(
      `SELECT COUNT(*) AS count, MAX(position) AS max
       FROM task_checklist_items WHERE task_id = ?`,
    )
    .get(taskId);
}

/**
 * @param {!Object} db
 * @param {{taskId: number, text: string, position: number}} item
 * @return {!Object} The inserted row.
 */
export function insertItem(db, {taskId, text, position}) {
  return db
    .prepare(
      `INSERT INTO task_checklist_items (task_id, text, position)
       VALUES (?, ?, ?) RETURNING *`,
    )
    .get(taskId, text, position);
}

/**
 * @param {!Object} db
 * @param {number} id
 * @param {{text: string, done: boolean}} fields
 * @return {!Object} The updated row.
 */
export function updateItem(db, id, {text, done}) {
  return db
    .prepare(
      `UPDATE task_checklist_items SET text = ?, done = ?
       WHERE id = ? RETURNING *`,
    )
    .get(text, done ? 1 : 0, id);
}

/** @param {!Object} db @param {number} id */
export function deleteItem(db, id) {
  db.prepare('DELETE FROM task_checklist_items WHERE id = ?').run(id);
}
