import {describe, expect, it} from 'vitest';
import {
  applyStageMove,
  applyTaskMove,
  containerOf,
  groupTaskIds,
  makeAnnouncements,
  makeCollisionDetection,
  moveTaskToStage,
  neighboursIn,
  parseDndId,
  reorderInStage,
  stageDndId,
  taskDndId,
} from '../src/features/boards/dnd.js';
import {positionBetween} from '../src/utils/position.js';

const board = {
  id: 1,
  stages: [
    {id: 10, name: 'To Do', position: 1024},
    {id: 20, name: 'Doing', position: 2048},
    {id: 30, name: 'Done', position: 3072},
  ],
  tasks: [
    {id: 2, stageId: 10, title: 'B', position: 2048},
    {id: 1, stageId: 10, title: 'A', position: 1024},
    {id: 3, stageId: 20, title: 'C', position: 1024},
  ],
};

describe('positionBetween', () => {
  it('matches the server rules', () => {
    expect(positionBetween(null, null)).toBe(1024);
    expect(positionBetween(null, 100)).toBe(50);
    expect(positionBetween(100, null)).toBe(1124);
    expect(positionBetween(100, 200)).toBe(150);
  });
});

describe('dnd ids', () => {
  it('round-trips task and stage ids', () => {
    expect(parseDndId(taskDndId(5))).toEqual({type: 'task', id: 5});
    expect(parseDndId(stageDndId(7))).toEqual({type: 'stage', id: 7});
    expect(parseDndId('nonsense')).toBeNull();
    expect(parseDndId(null)).toBeNull();
  });
});

describe('grouping and moving', () => {
  const groups = groupTaskIds(board);

  it('groups task ids per stage in position order, including empty stages', () => {
    expect(groups).toEqual({10: [1, 2], 20: [3], 30: []});
  });

  it('finds the stage of a task or stage dnd id', () => {
    expect(containerOf(groups, taskDndId(2))).toBe(10);
    expect(containerOf(groups, stageDndId(30))).toBe(30);
    expect(containerOf(groups, taskDndId(99))).toBeNull();
    expect(containerOf(groups, stageDndId(99))).toBeNull();
  });

  it('moves a task into another stage before a given task', () => {
    expect(moveTaskToStage(groups, 1, 20, 3)).toEqual({
      10: [2],
      20: [1, 3],
      30: [],
    });
  });

  it('moves a task to the end of a stage', () => {
    expect(moveTaskToStage(groups, 3, 30, null)).toEqual({
      10: [1, 2],
      20: [],
      30: [3],
    });
    expect(groups[20]).toEqual([3]);
  });

  it('reorders within a stage', () => {
    expect(reorderInStage(groups, 10, 1, 2)).toEqual({...groups, 10: [2, 1]});
    expect(reorderInStage(groups, 10, 1, 99)).toBe(groups);
  });

  it('reports neighbours', () => {
    expect(neighboursIn([1, 2, 3], 2)).toEqual({prevId: 1, nextId: 3});
    expect(neighboursIn([1, 2, 3], 1)).toEqual({prevId: null, nextId: 2});
    expect(neighboursIn([7], 7)).toEqual({prevId: null, nextId: null});
  });
});

describe('optimistic updates', () => {
  it('moves a task between neighbours', () => {
    const next = applyTaskMove(board, {
      taskId: 3,
      stageId: 10,
      prevId: 1,
      nextId: 2,
    });
    expect(next.tasks.find((t) => t.id === 3)).toMatchObject({
      stageId: 10,
      position: 1536,
    });
    expect(board.tasks.find((t) => t.id === 3).stageId).toBe(20);
  });

  it('moves a task to an empty stage', () => {
    const next = applyTaskMove(board, {
      taskId: 1,
      stageId: 30,
      prevId: null,
      nextId: null,
    });
    expect(next.tasks.find((t) => t.id === 1)).toMatchObject({
      stageId: 30,
      position: 1024,
    });
  });

  it('moves a stage', () => {
    const next = applyStageMove(board, {stageId: 30, prevId: null, nextId: 10});
    expect(next.stages.map((s) => s.id)).toEqual([30, 10, 20]);
  });

  it('leaves the board alone when data is missing', () => {
    expect(applyTaskMove(undefined, {taskId: 1})).toBeUndefined();
    expect(applyStageMove(undefined, {stageId: 1})).toBeUndefined();
  });
});

describe('announcements', () => {
  const a = makeAnnouncements(board);
  const task = (id) => ({id: taskDndId(id)});
  const stage = (id) => ({id: stageDndId(id)});

  it('describes picking up, moving, dropping and cancelling', () => {
    expect(a.onDragStart({active: task(1)})).toBe('Picked up task "A".');
    expect(a.onDragOver({active: task(1), over: task(3)})).toBe(
      'Task "A" is over task "C" in stage "Doing".',
    );
    expect(a.onDragOver({active: task(1), over: stage(30)})).toBe(
      'Task "A" is over stage "Done".',
    );
    expect(a.onDragOver({active: task(1), over: task(1)})).toBeUndefined();
    expect(a.onDragOver({active: task(1), over: null})).toBe(
      'Task "A" is not over a drop area.',
    );
    expect(a.onDragEnd({active: stage(10), over: stage(20)})).toBe(
      'Stage "To Do" was dropped on stage "Doing".',
    );
    expect(a.onDragEnd({active: task(1), over: null})).toBe(
      'Task "A" was dropped.',
    );
    expect(a.onDragCancel({active: task(2)})).toBe(
      'Moving task "B" was cancelled.',
    );
  });

  it('falls back for unknown items', () => {
    expect(a.onDragStart({active: {id: 'task-999'}})).toBe('Picked up item.');
  });
});

describe('makeCollisionDetection', () => {
  const rect = (left, top, width = 100, height = 40) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
  // Stage 10 holds tasks 1 (y 40-80) and 2 (y 90-130); stage 20 holds task 3;
  // stage 30 is empty.
  const droppableRects = new Map([
    ['stage-10', rect(0, 0, 200, 400)],
    ['stage-20', rect(300, 0, 200, 400)],
    ['stage-30', rect(600, 0, 200, 400)],
    ['task-1', rect(10, 40)],
    ['task-2', rect(10, 90)],
    ['task-3', rect(310, 40)],
  ]);
  const droppableContainers = [...droppableRects.keys()].map((id) => ({
    id,
    data: {current: {type: id.split('-')[0]}},
  }));
  const groups = {10: [1, 2], 20: [3], 30: []};
  const detect = makeCollisionDetection(groups);
  const args = (type, pointer) => ({
    active: {
      id: type === 'stage' ? 'stage-30' : 'task-9',
      data: {current: {type}},
    },
    collisionRect: rect((pointer?.x ?? 300) - 50, (pointer?.y ?? 40) - 20),
    droppableRects,
    droppableContainers,
    pointerCoordinates: pointer ?? null,
  });

  it('only lets stages collide with stages', () => {
    const hits = detect(args('stage', {x: 320, y: 50}));
    expect(hits.every((h) => String(h.id).startsWith('stage-'))).toBe(true);
    expect(hits[0].id).toBe('stage-20');
  });

  it('picks the nearest task in the stage under the pointer', () => {
    expect(detect(args('task', {x: 360, y: 60}))[0].id).toBe('task-3');
  });

  it('still picks a task when the pointer is in the gap between two', () => {
    // y=85 is between task 1 (ends 80) and task 2 (starts 90).
    const [hit] = detect(args('task', {x: 60, y: 86}));
    expect(hit.id).toMatch(/^task-[12]$/);
  });

  it('targets an empty stage itself', () => {
    expect(detect(args('task', {x: 650, y: 300}))[0].id).toBe('stage-30');
  });

  it('falls back to closest corners outside stages or without a pointer', () => {
    expect(detect(args('task', {x: 1000, y: 900})).length).toBeGreaterThan(0);
    expect(detect(args('task', null)).length).toBeGreaterThan(0);
  });
});

describe('keyboardCoordinates', () => {
  it('limits a dragged stage to other stages', async () => {
    const {keyboardCoordinates} = await import('../src/features/boards/dnd.js');
    const seen = [];
    const containers = [
      {id: 'stage-1', data: {current: {type: 'stage'}}},
      {id: 'task-1', data: {current: {type: 'task'}}},
    ];
    const droppableContainers = {
      get: (id) => containers.find((c) => c.id === id),
      getEnabled: () => {
        seen.push('all');
        return containers;
      },
    };
    const args = (type) => ({
      active: 'x',
      currentCoordinates: {x: 0, y: 0},
      context: {
        active: {id: 'x', data: {current: {type}}},
        collisionRect: null,
        droppableRects: new Map(),
        droppableContainers,
        over: null,
        scrollableAncestors: [],
      },
    });
    const event = {code: 'ArrowRight', preventDefault() {}};
    expect(keyboardCoordinates(event, args('stage'))).toBeUndefined();
    expect(keyboardCoordinates(event, args('task'))).toBeUndefined();
  });
});
