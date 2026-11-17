/**
 * @fileoverview Task rules: create, edit, move, assign and delete. A task
 * can be handled by several people; each must be able to see the board.
 */

import {badRequest, notFound} from '../../utils/errors.js';
import {nextPosition, positionFromNeighbours} from '../../utils/position.js';
import {assertBoardAccess} from '../boards/boards.access.js';
import {toTask} from '../boards/boards.mappers.js';
import {listAssignableUsers} from '../boards/boards.repository.js';
import {findStage} from '../stages/stages.repository.js';
import {findUserById} from '../users/users.repository.js';
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
    color: input.color ?? null,
  });
  return toTask(row);
}

/**
 * Works out where a moved task lands. A move is requested by sending
 * `stageId` and/or `prevId`/`nextId` (the tasks it lands between, in the
 * destination stage). With only `stageId`, the task goes to the end.
 * @param {!Object} db
 * @param {!Object} task The tasks row being moved.
 * @param {{stageId?: number, prevId?: ?number, nextId?: ?number}} input
 * @return {{stageId: number, position: number}}
 */
function resolveMove(db, task, input) {
  const stageId = input.stageId ?? task.stage_id;
  if (stageId !== task.stage_id) {
    assertStageOnBoard(db, task.board_id, stageId);
  }
  const hasNeighbours = 'prevId' in input || 'nextId' in input;
  if (!hasNeighbours) {
    return stageId === task.stage_id
      ? {stageId, position: task.position}
      : {stageId, position: nextPosition(repo.maxTaskPosition(db, stageId))};
  }
  const position = positionFromNeighbours({
    movingId: task.id,
    prevId: input.prevId ?? null,
    nextId: input.nextId ?? null,
    find: (id) => repo.findTask(db, id),
    belongs: (row) => row.stage_id === stageId,
    rebalance: () => repo.rebalanceTasks(db, stageId),
  });
  return {stageId, position};
}

/**
 * Edits and/or moves a task.
 * @param {!Object} db
 * @param {number} taskId
 * @param {{title?: string, description?: string, color?: ?string,
 *     stageId?: number, prevId?: ?number, nextId?: ?number}} input
 * @param {number} userId
 * @return {!Object}
 */
export function updateTask(db, taskId, input, userId) {
  const task = assertTaskAccess(db, taskId, userId);
  const row = db.transaction(() => {
    const {stageId, position} = resolveMove(db, task, input);
    return repo.updateTask(db, task.id, {
      stageId,
      title: input.title?.trim() ?? task.title,
      description: input.description ?? task.description,
      position,
      color: 'color' in input ? input.color : task.color,
    });
  })();
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

/**
 * Sets who handles a task, replacing the previous set.
 * @param {!Object} db
 * @param {number} taskId
 * @param {!Array<number>} userIds
 * @param {number} actorId
 * @return {!Object} The task.
 */
export function setAssignees(db, taskId, userIds, actorId) {
  const task = assertTaskAccess(db, taskId, actorId);
  const board = assertBoardAccess(db, task.board_id, actorId);
  const allowed = new Set(listAssignableUsers(db, board).map((u) => u.id));
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    if (!allowed.has(userId)) {
      const user = findUserById(db, userId);
      throw badRequest(
        user
          ? `${user.username} cannot be assigned: they are not on this board.`
          : 'Unknown user.',
      );
    }
  }
  db.transaction(() => repo.replaceAssignees(db, task.id, unique))();
  return toTask(repo.findTask(db, task.id), repo.listAssigneeIds(db, task.id));
}
