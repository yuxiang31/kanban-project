/**
 * @fileoverview SQL access for tasks.
 */

import {STEP} from '../../utils/position.js';

/** @param {!Object} db @param {number} id */
export function findTask(db, id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

/** @param {!Object} db @param {number} boardId */
export function listTasks(db, boardId) {
  return db
    .prepare(
      'SELECT * FROM tasks WHERE board_id = ? ORDER BY stage_id, position, id',
    )
    .all(boardId);
}

/** @param {!Object} db @param {number} stageId @return {?number} */
export function maxTaskPosition(db, stageId) {
  return db
    .prepare('SELECT MAX(position) AS max FROM tasks WHERE stage_id = ?')
    .get(stageId).max;
}

/**
 * @param {!Object} db
 * @param {{boardId: number, stageId: number, title: string,
 *     description: string, position: number, createdBy: number,
 *     color?: ?string}} task
 * @return {!Object} The inserted row.
 */
export function insertTask(db, task) {
  return db
    .prepare(
      `INSERT INTO tasks
         (board_id, stage_id, title, description, position, created_by, color)
       VALUES (@boardId, @stageId, @title, @description, @position, @createdBy,
               @color)
       RETURNING *`,
    )
    .get({color: null, ...task});
}

/**
 * @param {!Object} db
 * @param {number} id
 * @param {{stageId: number, title: string, description: string,
 *     position: number, color: ?string}} fields
 * @return {!Object} The updated row.
 */
export function updateTask(db, id, fields) {
  return db
    .prepare(
      `UPDATE tasks
       SET stage_id = @stageId, title = @title, description = @description,
           position = @position, color = @color, updated_at = datetime('now')
       WHERE id = @id RETURNING *`,
    )
    .get({...fields, id});
}

/** @param {!Object} db @param {number} id */
export function deleteTask(db, id) {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

/**
 * @param {!Object} db
 * @param {number} taskId
 * @return {!Array<number>}
 */
export function listAssigneeIds(db, taskId) {
  return db
    .prepare(
      'SELECT user_id FROM task_assignees WHERE task_id = ? ORDER BY user_id',
    )
    .all(taskId)
    .map((row) => row.user_id);
}

/**
 * Renumbers positions in one container to evenly spaced steps, keeping the
 * current order. Used when neighbours get too close to split. The order is
 * read first: a single correlated UPDATE would re-rank rows mid-update.
 * @param {!Object} db
 * @param {number} containerId
 */
export function rebalanceTasks(db, containerId) {
  const ids = db
    .prepare('SELECT id FROM tasks WHERE stage_id = ? ORDER BY position, id')
    .all(containerId);
  const update = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
  db.transaction(() => {
    ids.forEach(({id}, i) => update.run((i + 1) * STEP, id));
  })();
}

/**
 * Replaces a task's assignees.
 * @param {!Object} db
 * @param {number} taskId
 * @param {!Array<number>} userIds
 */
export function replaceAssignees(db, taskId, userIds) {
  db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
  const insert = db.prepare(
    'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
  );
  for (const userId of userIds) {
    insert.run(taskId, userId);
  }
}
