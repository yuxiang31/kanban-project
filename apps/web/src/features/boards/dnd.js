/**
 * @fileoverview Pure helpers for drag and drop on a board. Tasks and stages
 * share one DndContext, so their draggable ids are prefixed (`task-1`,
 * `stage-1`). During a task drag the UI works from "groups": stage id →
 * ordered task ids.
 */

import {closestCenter, closestCorners, pointerWithin} from '@dnd-kit/core';
import {arrayMove, sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {positionBetween} from '../../utils/position.js';

/** @param {number} id */
export const taskDndId = (id) => `task-${id}`;
/** @param {number} id */
export const stageDndId = (id) => `stage-${id}`;

/**
 * @param {*} dndId
 * @return {?{type: string, id: number}}
 */
export function parseDndId(dndId) {
  const match = /^(task|stage)-(\d+)$/.exec(String(dndId));
  return match ? {type: match[1], id: Number(match[2])} : null;
}

const byPosition = (a, b) => a.position - b.position;

/**
 * @param {!Object} board
 * @return {!Object<number, !Array<number>>} Stage id → task ids in order.
 */
export function groupTaskIds(board) {
  const groups = {};
  for (const stage of board.stages) {
    groups[stage.id] = [];
  }
  for (const task of [...board.tasks].sort(byPosition)) {
    groups[task.stageId]?.push(task.id);
  }
  return groups;
}

/**
 * @param {!Object<number, !Array<number>>} groups
 * @param {*} dndId A task or stage dnd id.
 * @return {?number} The stage it belongs to (or is).
 */
export function containerOf(groups, dndId) {
  const parsed = parseDndId(dndId);
  if (parsed?.type === 'stage') {
    return parsed.id in groups ? parsed.id : null;
  }
  for (const [stageId, ids] of Object.entries(groups)) {
    if (ids.includes(parsed?.id)) {
      return Number(stageId);
    }
  }
  return null;
}

/**
 * Moves a task into another stage, before `overTaskId` (or at the end).
 * @param {!Object<number, !Array<number>>} groups
 * @param {number} taskId
 * @param {number} toStageId
 * @param {?number} overTaskId
 * @return {!Object<number, !Array<number>>} New groups.
 */
export function moveTaskToStage(groups, taskId, toStageId, overTaskId) {
  const next = {};
  for (const [stageId, ids] of Object.entries(groups)) {
    next[stageId] = ids.filter((id) => id !== taskId);
  }
  const target = next[toStageId];
  const index = overTaskId == null ? -1 : target.indexOf(overTaskId);
  target.splice(index === -1 ? target.length : index, 0, taskId);
  return next;
}

/**
 * Moves a task to where `overTaskId` is, within one stage.
 * @param {!Object<number, !Array<number>>} groups
 * @param {number} stageId
 * @param {number} taskId
 * @param {number} overTaskId
 * @return {!Object<number, !Array<number>>} New groups (or the same object if
 *     nothing moved).
 */
export function reorderInStage(groups, stageId, taskId, overTaskId) {
  const ids = groups[stageId];
  const from = ids.indexOf(taskId);
  const to = ids.indexOf(overTaskId);
  if (from === -1 || to === -1) {
    return groups;
  }
  return {...groups, [stageId]: arrayMove(ids, from, to)};
}

/**
 * @param {!Array<number>} ids
 * @param {number} id
 * @return {{prevId: ?number, nextId: ?number}}
 */
export function neighboursIn(ids, id) {
  const index = ids.indexOf(id);
  return {prevId: ids[index - 1] ?? null, nextId: ids[index + 1] ?? null};
}

/**
 * Optimistically applies a task move to a cached board.
 * @param {(!Object|undefined)} board
 * @param {{taskId: number, stageId: number, prevId: ?number,
 *     nextId: ?number}} move
 * @return {(!Object|undefined)}
 */
export function applyTaskMove(board, {taskId, stageId, prevId, nextId}) {
  if (!board) {
    return board;
  }
  const pos = (id) => board.tasks.find((t) => t.id === id)?.position ?? null;
  const position = positionBetween(pos(prevId), pos(nextId));
  return {
    ...board,
    tasks: board.tasks.map((t) =>
      t.id === taskId ? {...t, stageId, position} : t,
    ),
  };
}

/**
 * Optimistically applies a stage move to a cached board.
 * @param {(!Object|undefined)} board
 * @param {{stageId: number, prevId: ?number, nextId: ?number}} move
 * @return {(!Object|undefined)}
 */
export function applyStageMove(board, {stageId, prevId, nextId}) {
  if (!board) {
    return board;
  }
  const pos = (id) => board.stages.find((s) => s.id === id)?.position ?? null;
  const position = positionBetween(pos(prevId), pos(nextId));
  return {
    ...board,
    stages: board.stages
      .map((s) => (s.id === stageId ? {...s, position} : s))
      .sort(byPosition),
  };
}

/**
 * Screen reader announcements for dnd-kit, naming tasks and stages.
 * @param {!Object} board
 * @return {!Object}
 */
export function makeAnnouncements(board) {
  const describe = (dndId, {capital = false, withStage = false} = {}) => {
    const parsed = parseDndId(dndId);
    const item =
      parsed?.type === 'task'
        ? board.tasks.find((t) => t.id === parsed.id)
        : board.stages.find((s) => s.id === parsed?.id);
    if (!item) {
      return capital ? 'Item' : 'item';
    }
    const kind = capital
      ? `${parsed.type[0].toUpperCase()}${parsed.type.slice(1)}`
      : parsed.type;
    let text = `${kind} "${item.title ?? item.name}"`;
    if (withStage && parsed.type === 'task') {
      const stage = board.stages.find((s) => s.id === item.stageId);
      text += ` in stage "${stage?.name}"`;
    }
    return text;
  };
  return {
    onDragStart: ({active}) => `Picked up ${describe(active.id)}.`,
    // Returning undefined skips the announcement: "over itself" is noise
    // right after pick-up and would replace the "Picked up" message.
    onDragOver: ({active, over}) =>
      over?.id === active.id
        ? undefined
        : over
          ? `${describe(active.id, {capital: true})} is over ${describe(over.id, {withStage: true})}.`
          : `${describe(active.id, {capital: true})} is not over a drop area.`,
    onDragEnd: ({active, over}) =>
      over
        ? `${describe(active.id, {capital: true})} was dropped on ${describe(over.id, {withStage: true})}.`
        : `${describe(active.id, {capital: true})} was dropped.`,
    onDragCancel: ({active}) => `Moving ${describe(active.id)} was cancelled.`,
  };
}

/**
 * Builds collision detection for one context holding both stages and tasks.
 *
 * - A dragged stage only collides with stages.
 * - A dragged task targets the nearest task in the stage under the pointer,
 *   or that stage itself when it is empty. Always resolving to a task (even
 *   in the gaps between cards) keeps the sortable preview from snapping
 *   back and forth as the pointer moves.
 * - Without a pointer (keyboard drags) or outside every stage, it falls
 *   back to closest corners.
 * @param {!Object<number, !Array<number>>} groups The order being shown.
 * @return {function(!Object): !Array<!Object>}
 */
export function makeCollisionDetection(groups) {
  return (args) => {
    const only = (keep) => ({
      ...args,
      droppableContainers: args.droppableContainers.filter(keep),
    });
    const isStage = (c) => c.data.current?.type === 'stage';
    if (args.active.data.current?.type === 'stage') {
      return closestCenter(only(isStage));
    }
    const [stageHit] = args.pointerCoordinates
      ? pointerWithin(only(isStage))
      : [];
    if (!stageHit) {
      return closestCorners(args);
    }
    const taskIds = new Set(
      (groups[parseDndId(stageHit.id).id] ?? []).map(taskDndId),
    );
    if (taskIds.size === 0) {
      return [stageHit];
    }
    return closestCenter(only((c) => taskIds.has(c.id)));
  };
}

/**
 * Keyboard coordinate getter: like dnd-kit's sortable one, but a dragged
 * stage only considers other stages (not the task cards inside them).
 * @param {!KeyboardEvent} event
 * @param {!Object} args dnd-kit keyboard coordinate args.
 * @return {(!Object|undefined)}
 */
export function keyboardCoordinates(event, args) {
  const {context} = args;
  if (context.active?.data.current?.type !== 'stage') {
    return sortableKeyboardCoordinates(event, args);
  }
  const containers = context.droppableContainers;
  const stagesOnly = {
    get: (id) => containers.get(id),
    getEnabled: () =>
      containers.getEnabled().filter((c) => c.data.current?.type === 'stage'),
  };
  return sortableKeyboardCoordinates(event, {
    ...args,
    context: {...context, droppableContainers: stagesOnly},
  });
}
