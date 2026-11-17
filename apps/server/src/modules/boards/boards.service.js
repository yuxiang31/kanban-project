/**
 * @fileoverview Board rules: creation with default stages, listing, the
 * full board payload, rename and delete.
 */

import {nextPosition} from '../../utils/position.js';
import {insertStage, listStages} from '../stages/stages.repository.js';
import {listTasks} from '../tasks/tasks.repository.js';
import {assertTeamMember} from '../teams/teams.service.js';
import {toPublicUser} from '../users/users.repository.js';
import {
  assertBoardAccess,
  assertCanDeleteBoard,
  canDeleteBoard,
} from './boards.access.js';
import {toBoardSummary, toStage, toTask} from './boards.mappers.js';
import * as repo from './boards.repository.js';

export const DEFAULT_STAGES = ['To Do', 'In Progress', 'Done'];

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Array<!Object>}
 */
export function listBoards(db, userId) {
  return repo.listBoardsForUser(db, userId).map((row) => ({
    ...toBoardSummary(row),
    taskCount: row.task_count,
  }));
}

/**
 * Builds the payload for a board page: stages and tasks in order.
 * @param {!Object} db
 * @param {!Object} board A boards row the user can access.
 * @param {number} userId
 * @return {!Object}
 */
export function fullBoard(db, board, userId) {
  const assignees = new Map();
  for (const {
    task_id: taskId,
    user_id: assigneeId,
  } of repo.listAssigneesForBoard(db, board.id)) {
    if (!assignees.has(taskId)) {
      assignees.set(taskId, []);
    }
    assignees.get(taskId).push(assigneeId);
  }
  return {
    ...toBoardSummary(board),
    canDelete: canDeleteBoard(board, userId),
    members: repo.listAssignableUsers(db, board).map(toPublicUser),
    stages: listStages(db, board.id).map(toStage),
    tasks: listTasks(db, board.id).map((row) =>
      toTask(row, assignees.get(row.id) ?? []),
    ),
  };
}

/**
 * @param {!Object} db
 * @param {number} boardId
 * @param {number} userId
 * @return {!Object}
 */
export function getBoard(db, boardId, userId) {
  return fullBoard(db, assertBoardAccess(db, boardId, userId), userId);
}

/**
 * Creates a board seeded with the default stages: personal, or shared with
 * a team the user belongs to.
 * @param {!Object} db
 * @param {{name: string, teamId?: number}} input
 * @param {number} userId
 * @return {!Object} The full board.
 */
export function createBoard(db, {name, teamId}, userId) {
  if (teamId != null) {
    assertTeamMember(db, teamId, userId);
  }
  const boardId = db.transaction(() => {
    const row = repo.insertBoard(db, {
      name: name.trim(),
      ownerUserId: teamId == null ? userId : null,
      teamId: teamId ?? null,
      createdBy: userId,
    });
    let position = null;
    for (const stageName of DEFAULT_STAGES) {
      position = nextPosition(position);
      insertStage(db, {boardId: row.id, name: stageName, position});
    }
    return row.id;
  })();
  return getBoard(db, boardId, userId);
}

/**
 * @param {!Object} db
 * @param {number} boardId
 * @param {{name: string}} input
 * @param {number} userId
 * @return {!Object} The board summary.
 */
export function renameBoard(db, boardId, {name}, userId) {
  assertBoardAccess(db, boardId, userId);
  repo.renameBoard(db, boardId, name.trim());
  return toBoardSummary(assertBoardAccess(db, boardId, userId));
}

/**
 * @param {!Object} db
 * @param {number} boardId
 * @param {number} userId
 * @return {!Object} The deleted board's row.
 */
export function deleteBoard(db, boardId, userId) {
  const board = assertCanDeleteBoard(db, boardId, userId);
  repo.deleteBoard(db, boardId);
  return board;
}
