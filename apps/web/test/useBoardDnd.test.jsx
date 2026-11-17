import {act, renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useBoardDnd} from '../src/features/boards/useBoardDnd.js';

const board = {
  id: 1,
  stages: [
    {id: 10, name: 'To Do', position: 1024},
    {id: 20, name: 'Doing', position: 2048},
    {id: 30, name: 'Done', position: 3072},
  ],
  tasks: [
    {id: 1, stageId: 10, title: 'A', position: 1024},
    {id: 2, stageId: 10, title: 'B', position: 2048},
    {id: 3, stageId: 20, title: 'C', position: 1024},
  ],
};
const ev = (activeId, overId) => ({
  active: {id: activeId},
  over: overId ? {id: overId} : null,
});

function setup() {
  const onMoveTask = vi.fn();
  const onMoveStage = vi.fn();
  const hook = renderHook((props) => useBoardDnd(props), {
    initialProps: {board, onMoveTask, onMoveStage},
  });
  const h = () => hook.result.current.handlers;
  return {hook, h, onMoveTask, onMoveStage};
}

describe('useBoardDnd', () => {
  it('shows the server order when idle', () => {
    const {hook} = setup();
    expect(hook.result.current.groups).toEqual({10: [1, 2], 20: [3], 30: []});
    expect(hook.result.current.stages).toBe(board.stages);
    expect(hook.result.current.activeId).toBeNull();
  });

  it('keeps the dropped task order until the board data catches up', () => {
    const {h, hook, onMoveTask, onMoveStage} = setup();
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragOver(ev('task-1', 'task-3')));
    act(() => h().onDragEnd(ev('task-1', 'task-1')));
    // No snap back to the old order while the cache update is pending.
    expect(hook.result.current.groups).toEqual({10: [2], 20: [1, 3], 30: []});
    const updated = {
      ...board,
      tasks: board.tasks.map((t) =>
        t.id === 1 ? {...t, stageId: 20, position: 512} : t,
      ),
    };
    hook.rerender({board: updated, onMoveTask, onMoveStage});
    expect(hook.result.current.groups).toEqual({10: [2], 20: [1, 3], 30: []});
    // A rollback to the original data shows the original order again.
    hook.rerender({board, onMoveTask, onMoveStage});
    expect(hook.result.current.groups).toEqual({10: [1, 2], 20: [3], 30: []});
  });

  it('keeps the dropped stage order until the board data catches up', () => {
    const {h, hook, onMoveTask, onMoveStage} = setup();
    act(() => h().onDragStart(ev('stage-30')));
    act(() => h().onDragEnd(ev('stage-30', 'stage-10')));
    expect(hook.result.current.stages.map((s) => s.id)).toEqual([30, 10, 20]);
    hook.rerender({board: {...board}, onMoveTask, onMoveStage});
    expect(hook.result.current.stages.map((s) => s.id)).toEqual([10, 20, 30]);
  });

  it('reorders within a stage', () => {
    const {h, onMoveTask, hook} = setup();
    act(() => h().onDragStart(ev('task-1')));
    expect(hook.result.current.activeId).toBe('task-1');
    act(() => h().onDragOver(ev('task-1', 'task-2')));
    act(() => h().onDragEnd(ev('task-1', 'task-2')));
    expect(onMoveTask).toHaveBeenCalledWith({
      taskId: 1,
      stageId: 10,
      prevId: 2,
      nextId: null,
    });
    expect(hook.result.current.activeId).toBeNull();
  });

  it('previews a move into another stage and drops it there', () => {
    const {h, onMoveTask, hook} = setup();
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragOver(ev('task-1', 'task-3')));
    expect(hook.result.current.groups).toEqual({10: [2], 20: [1, 3], 30: []});
    // The card now fills that slot, so the drop lands over itself.
    act(() => h().onDragEnd(ev('task-1', 'task-1')));
    expect(onMoveTask).toHaveBeenCalledWith({
      taskId: 1,
      stageId: 20,
      prevId: null,
      nextId: 3,
    });
  });

  it('drops below a task when released over it after entering the stage', () => {
    const {h, onMoveTask} = setup();
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragOver(ev('task-1', 'task-3')));
    act(() => h().onDragEnd(ev('task-1', 'task-3')));
    expect(onMoveTask).toHaveBeenCalledWith({
      taskId: 1,
      stageId: 20,
      prevId: 3,
      nextId: null,
    });
  });

  it('moves into an empty stage when dropped on the stage', () => {
    const {h, onMoveTask} = setup();
    act(() => h().onDragStart(ev('task-2')));
    act(() => h().onDragOver(ev('task-2', 'stage-30')));
    act(() => h().onDragEnd(ev('task-2', 'stage-30')));
    expect(onMoveTask).toHaveBeenCalledWith({
      taskId: 2,
      stageId: 30,
      prevId: null,
      nextId: null,
    });
  });

  it('does nothing when dropped where it started', () => {
    const {h, onMoveTask} = setup();
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragEnd(ev('task-1', 'task-1')));
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragEnd(ev('task-1', 'stage-10')));
    expect(onMoveTask).not.toHaveBeenCalled();
  });

  it('restores the order when cancelled or dropped outside', () => {
    const {h, onMoveTask, hook} = setup();
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragOver(ev('task-1', 'task-3')));
    act(() => h().onDragCancel());
    expect(hook.result.current.groups).toEqual({10: [1, 2], 20: [3], 30: []});
    act(() => h().onDragStart(ev('task-1')));
    act(() => h().onDragOver(ev('task-1', null)));
    act(() => h().onDragEnd(ev('task-1', null)));
    expect(onMoveTask).not.toHaveBeenCalled();
    expect(hook.result.current.activeId).toBeNull();
  });

  it('reorders stages', () => {
    const {h, onMoveStage} = setup();
    act(() => h().onDragStart(ev('stage-30')));
    act(() => h().onDragOver(ev('stage-30', 'stage-10')));
    act(() => h().onDragEnd(ev('stage-30', 'stage-10')));
    expect(onMoveStage).toHaveBeenCalledWith({
      stageId: 30,
      prevId: null,
      nextId: 10,
    });
  });

  it('moves a stage to the right', () => {
    const {h, onMoveStage} = setup();
    act(() => h().onDragStart(ev('stage-10')));
    act(() => h().onDragEnd(ev('stage-10', 'stage-20')));
    expect(onMoveStage).toHaveBeenCalledWith({
      stageId: 10,
      prevId: 20,
      nextId: 30,
    });
  });

  it('ignores a stage dropped on itself or on a task', () => {
    const {h, onMoveStage} = setup();
    act(() => h().onDragStart(ev('stage-10')));
    act(() => h().onDragEnd(ev('stage-10', 'stage-10')));
    act(() => h().onDragStart(ev('stage-10')));
    act(() => h().onDragEnd(ev('stage-10', 'task-3')));
    expect(onMoveStage).not.toHaveBeenCalled();
  });
});
