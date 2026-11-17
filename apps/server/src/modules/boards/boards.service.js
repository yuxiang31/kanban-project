/**
 * @fileoverview Board rules: creation with default stages, listing, the
 * full board payload, rename and delete.
 */

import {badRequest} from '../../utils/errors.js';
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
 * The schema only checks the YYYY-MM-DD shape; this rejects days that do
 * not exist, such as 2026-02-30.
 * @param {?string|undefined} dueDate
 * @return {?string|undefined} The same value.
 */
function checkDueDate(dueDate) {
  if (dueDate != null) {
    const parsed = new Date(`${dueDate}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== dueDate
    ) {
      throw badRequest('Due date is not a real date.');
    }
  }
  return dueDate;
}

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Array<!Object>}
 */
export function listBoards(db, userId) {
  return repo.listBoardsForUser(db, userId).map((row) => ({
    ...toBoardSummary(row),
    taskCount: row.task_count,
    memberCount: row.member_count,
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
 * @param {{name: string, description?: string, teamId?: number,
 *     color?: ?string, dueDate?: ?string}} input
 * @param {number} userId
 * @return {!Object} The full board.
 */
export function createBoard(
  db,
  {name, description, teamId, color, dueDate},
  userId,
) {
  checkDueDate(dueDate);
  if (teamId != null) {
    assertTeamMember(db, teamId, userId);
  }
  const boardId = db.transaction(() => {
    const row = repo.insertBoard(db, {
      name: name.trim(),
      description: description?.trim() ?? '',
      ownerUserId: teamId == null ? userId : null,
      teamId: teamId ?? null,
      createdBy: userId,
      color,
      dueDate,
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
 * Changes a board's name, description, colour and/or due date (null clears
 * the colour or due date).
 * @param {!Object} db
 * @param {number} boardId
 * @param {{name?: string, description?: string, color?: ?string,
 *     dueDate?: ?string}} input
 * @param {number} userId
 * @return {!Object} The board summary.
 */
export function updateBoard(db, boardId, input, userId) {
  const board = assertBoardAccess(db, boardId, userId);
  repo.updateBoard(db, boardId, {
    name: input.name?.trim() ?? board.name,
    description: input.description?.trim() ?? board.description,
    color: 'color' in input ? input.color : board.color,
    dueDate: 'dueDate' in input ? checkDueDate(input.dueDate) : board.due_date,
  });
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
