/**
 * @fileoverview Stage rules: add, rename, reorder and delete. A board always
 * keeps at least one stage so tasks have somewhere to live.
 */

import {badRequest, notFound} from '../../utils/errors.js';
import {nextPosition, positionFromNeighbours} from '../../utils/position.js';
import {assertBoardAccess} from '../boards/boards.access.js';
import {toStage} from '../boards/boards.mappers.js';
import * as repo from './stages.repository.js';

/**
 * Loads a stage the user may change; 404 if missing or not accessible.
 * @param {!Object} db
 * @param {number} stageId
 * @param {number} userId
 * @return {!Object} The stages row.
 */
export function assertStageAccess(db, stageId, userId) {
  const stage = repo.findStage(db, stageId);
  if (!stage) {
    throw notFound('Stage not found.');
  }
  assertBoardAccess(db, stage.board_id, userId);
  return stage;
}

/**
 * @param {!Object} db
 * @param {number} boardId
 * @param {{name: string}} input
 * @param {number} userId
 * @return {!Object}
 */
export function createStage(db, boardId, {name}, userId) {
  assertBoardAccess(db, boardId, userId);
  const position = nextPosition(repo.maxStagePosition(db, boardId));
  return toStage(repo.insertStage(db, {boardId, name: name.trim(), position}));
}

/**
 * Renames and/or moves a stage. A move is requested by sending `prevId`
 * and/or `nextId` (the stages it should land between).
 * @param {!Object} db
 * @param {number} stageId
 * @param {{name?: string, prevId?: ?number, nextId?: ?number}} input
 * @param {number} userId
 * @return {!Object}
 */
export function updateStage(db, stageId, input, userId) {
  const stage = assertStageAccess(db, stageId, userId);
  const isMove = 'prevId' in input || 'nextId' in input;
  const position = isMove
    ? positionFromNeighbours({
        movingId: stage.id,
        prevId: input.prevId ?? null,
        nextId: input.nextId ?? null,
        find: (id) => repo.findStage(db, id),
        belongs: (row) => row.board_id === stage.board_id,
        rebalance: () => repo.rebalanceStages(db, stage.board_id),
      })
    : stage.position;
  return toStage(
    repo.updateStage(db, stage.id, {
      name: input.name?.trim() ?? stage.name,
      position,
    }),
  );
}

/**
 * Deletes a stage and its tasks.
 * @param {!Object} db
 * @param {number} stageId
 * @param {number} userId
 * @return {!Object} The deleted stage.
 */
export function deleteStage(db, stageId, userId) {
  const stage = assertStageAccess(db, stageId, userId);
  if (repo.countStages(db, stage.board_id) <= 1) {
    throw badRequest('A board needs at least one stage.');
  }
  repo.deleteStage(db, stage.id);
  return toStage(stage);
}
