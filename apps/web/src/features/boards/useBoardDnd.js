/**
 * @fileoverview Drag-and-drop state for a board. While a task is dragged,
 * a local copy of the stage → task order lets it preview in other stages;
 * on drop, the neighbours it landed between are sent to the server.
 *
 * The dropped order stays on screen until the board data changes. The
 * optimistic cache update lands a moment after the drop (TanStack notifies
 * observers asynchronously), and without this the board would flash back
 * to the old order for a frame before jumping to the new one.
 */

import {useState} from 'react';
import {arrayMove} from '@dnd-kit/sortable';
import {
  containerOf,
  groupTaskIds,
  moveTaskToStage,
  neighboursIn,
  parseDndId,
  reorderInStage,
} from './dnd.js';

/**
 * @param {{
 *   board: !Object,
 *   onMoveTask: function({taskId: number, stageId: number, prevId: ?number,
 *       nextId: ?number}),
 *   onMoveStage: function({stageId: number, prevId: ?number,
 *       nextId: ?number}),
 * }} args
 * @return {{
 *   groups: !Object<number, !Array<number>>,
 *   stages: !Array<!Object>,
 *   activeId: ?string,
 *   handlers: !Object,
 * }}
 */
export function useBoardDnd({board, onMoveTask, onMoveStage}) {
  const [activeId, setActiveId] = useState(null);
  const [dragGroups, setDragGroups] = useState(null);
  // What was dropped, shown until `board` changes: {board, groups?, stageIds?}.
  const [settled, setSettled] = useState(null);
  if (settled && settled.board !== board) {
    // New board data (the optimistic update, a refetch or a rollback)
    // supersedes the dropped order.
    setSettled(null);
  }
  const shown = settled?.board === board ? settled : null;

  function reset() {
    setActiveId(null);
    setDragGroups(null);
  }

  function finishTaskDrag(taskId, overId) {
    let groups = dragGroups ?? groupTaskIds(board);
    const stageId = containerOf(groups, overId);
    if (stageId == null) {
      return;
    }
    const over = parseDndId(overId);
    if (over.type === 'task' && over.id !== taskId) {
      groups = reorderInStage(groups, stageId, taskId, over.id);
    }
    const target = neighboursIn(groups[stageId], taskId);
    const task = board.tasks.find((t) => t.id === taskId);
    const original = neighboursIn(groupTaskIds(board)[task.stageId], taskId);
    const unchanged =
      stageId === task.stageId &&
      target.prevId === original.prevId &&
      target.nextId === original.nextId;
    if (!unchanged) {
      setSettled({board, groups});
      onMoveTask({taskId, stageId, ...target});
    }
  }

  function finishStageDrag(stageId, overId) {
    const over = parseDndId(overId);
    if (over?.type !== 'stage' || over.id === stageId) {
      return;
    }
    const ids = board.stages.map((s) => s.id);
    const order = arrayMove(ids, ids.indexOf(stageId), ids.indexOf(over.id));
    setSettled({board, stageIds: order});
    onMoveStage({stageId, ...neighboursIn(order, stageId)});
  }

  const handlers = {
    onDragStart({active}) {
      setActiveId(active.id);
      if (parseDndId(active.id)?.type === 'task') {
        setDragGroups(groupTaskIds(board));
      }
    },
    onDragOver({active, over}) {
      const dragged = parseDndId(active.id);
      if (dragged?.type !== 'task' || !over || !dragGroups) {
        return;
      }
      const from = containerOf(dragGroups, active.id);
      const to = containerOf(dragGroups, over.id);
      if (to == null || from === to) {
        return;
      }
      const overTask = parseDndId(over.id);
      setDragGroups(
        moveTaskToStage(
          dragGroups,
          dragged.id,
          to,
          overTask.type === 'task' ? overTask.id : null,
        ),
      );
    },
    onDragEnd({active, over}) {
      const dragged = parseDndId(active.id);
      if (over && dragged?.type === 'task') {
        finishTaskDrag(dragged.id, over.id);
      } else if (over && dragged?.type === 'stage') {
        finishStageDrag(dragged.id, over.id);
      }
      reset();
    },
    onDragCancel: reset,
  };

  const stages = shown?.stageIds
    ? shown.stageIds.map((id) => board.stages.find((s) => s.id === id))
    : board.stages;
  return {
    groups: dragGroups ?? shown?.groups ?? groupTaskIds(board),
    stages,
    activeId,
    handlers,
  };
}
