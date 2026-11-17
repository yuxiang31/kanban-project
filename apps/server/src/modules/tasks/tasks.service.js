/**
 * @fileoverview Task rules: create, edit and delete.
 */

import {badRequest, notFound} from '../../utils/errors.js';
import {nextPosition} from '../../utils/position.js';
import {assertBoardAccess} from '../boards/boards.access.js';
import {toTask} from '../boards/boards.mappers.js';
import {findStage} from '../stages/stages.repository.js';
import * as repo from './tasks.repository.js';

/**
 * Loads a task the user may change; 404 if missing or not accessible.
 * @param {!Object} db
 * @param {number} taskId
 * @param {number} userId
 * @return {!Object} The tasks row.
 */
export function assertTaskAccess(db, taskId, userId) {
  const task = repo.findTask(db, taskId);
  if (!task) {
    throw notFound('Task not found.');
  }
  assertBoardAccess(db, task.board_id, userId);
  return task;
}

/**
 * @param {!Object} db
 * @param {number} boardId
 * @param {number} stageId
 * @return {!Object} The stages row.
 */
function assertStageOnBoard(db, boardId, stageId) {
  const stage = findStage(db, stageId);
  if (!stage || stage.board_id !== boardId) {
    throw badRequest('That stage is not on this board.');
  }
  return stage;
}

/**
 * @param {!Object} db
 * @param {number} boardId
 * @param {{stageId: number, title: string, description?: string}} input
 * @param {number} userId
 * @return {!Object}
 */
export function createTask(db, boardId, input, userId) {
  assertBoardAccess(db, boardId, userId);
  assertStageOnBoard(db, boardId, input.stageId);
  const row = repo.insertTask(db, {
    boardId,
    stageId: input.stageId,
    title: input.title.trim(),
    description: input.description ?? '',
    position: nextPosition(repo.maxTaskPosition(db, input.stageId)),
    createdBy: userId,
  });
  return toTask(row);
}

/**
 * Edits a task's title and/or description.
 * @param {!Object} db
 * @param {number} taskId
 * @param {{title?: string, description?: string}} input
 * @param {number} userId
 * @return {!Object}
 */
export function updateTask(db, taskId, input, userId) {
  const task = assertTaskAccess(db, taskId, userId);
  const row = repo.updateTask(db, task.id, {
    stageId: task.stage_id,
    title: input.title?.trim() ?? task.title,
    description: input.description ?? task.description,
    position: task.position,
  });
  return toTask(row, repo.listAssigneeIds(db, task.id));
}

/**
 * @param {!Object} db
 * @param {number} taskId
 * @param {number} userId
 * @return {!Object} The deleted task.
 */
export function deleteTask(db, taskId, userId) {
  const task = assertTaskAccess(db, taskId, userId);
  repo.deleteTask(db, task.id);
  return toTask(task);
}
