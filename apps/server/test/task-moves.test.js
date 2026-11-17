import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTestApp, signUp} from './helpers.js';

describe('moving tasks', () => {
  let app;
  let alice;
  let board;
  let todo;
  let doing;
  let tasks;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    board = (await alice.request('POST', '/api/boards', {name: 'B'})).json()
      .board;
    [todo, doing] = board.stages;
    tasks = {};
    for (const title of ['A', 'B', 'C']) {
      tasks[title] = (
        await alice.request('POST', `/api/boards/${board.id}/tasks`, {
          stageId: todo.id,
          title,
        })
      ).json().task;
    }
  });
  afterEach(() => app.close());

  const move = (task, body) =>
    alice.request('PATCH', `/api/tasks/${task.id}`, body);
  const titlesIn = async (stage) => {
    const {board: b} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json();
    return b.tasks
      .filter((t) => t.stageId === stage.id)
      .sort((x, y) => x.position - y.position)
      .map((t) => t.title);
  };

  it('reorders within a stage', async () => {
    const res = await move(tasks.C, {prevId: tasks.A.id, nextId: tasks.B.id});
    expect(res.statusCode).toBe(200);
    expect(await titlesIn(todo)).toEqual(['A', 'C', 'B']);
  });

  it('moves to the top of a stage', async () => {
    await move(tasks.C, {prevId: null, nextId: tasks.A.id});
    expect(await titlesIn(todo)).toEqual(['C', 'A', 'B']);
  });

  it('moves to an empty stage', async () => {
    const res = await move(tasks.B, {
      stageId: doing.id,
      prevId: null,
      nextId: null,
    });
    expect(res.json().task.stageId).toBe(doing.id);
    expect(await titlesIn(todo)).toEqual(['A', 'C']);
    expect(await titlesIn(doing)).toEqual(['B']);
  });

  it('appends to the end of another stage when only stageId is given', async () => {
    await move(tasks.A, {stageId: doing.id});
    await move(tasks.B, {stageId: doing.id});
    expect(await titlesIn(doing)).toEqual(['A', 'B']);
  });

  it('moves between tasks of another stage', async () => {
    await move(tasks.A, {stageId: doing.id});
    await move(tasks.B, {stageId: doing.id});
    await move(tasks.C, {
      stageId: doing.id,
      prevId: tasks.A.id,
      nextId: tasks.B.id,
    });
    expect(await titlesIn(doing)).toEqual(['A', 'C', 'B']);
    expect(await titlesIn(todo)).toEqual([]);
  });

  it('can edit and move in one request', async () => {
    const res = await move(tasks.A, {title: 'A!', stageId: doing.id});
    expect(res.json().task).toMatchObject({title: 'A!', stageId: doing.id});
  });

  it('rejects a stage on another board', async () => {
    const other = (
      await alice.request('POST', '/api/boards', {name: 'O'})
    ).json().board;
    const res = await move(tasks.A, {stageId: other.stages[0].id});
    expect(res.statusCode).toBe(400);
  });

  it('rejects neighbours that are not in the destination stage', async () => {
    const res = await move(tasks.A, {
      stageId: doing.id,
      prevId: tasks.B.id,
      nextId: null,
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects neighbours in the wrong order or itself', async () => {
    expect(
      (await move(tasks.A, {prevId: tasks.C.id, nextId: tasks.B.id}))
        .statusCode,
    ).toBe(400);
    expect((await move(tasks.A, {prevId: tasks.A.id})).statusCode).toBe(400);
  });

  it('renumbers a stage when neighbours get too close', async () => {
    // Squeeze A and B together so no usable midpoint is left between them.
    app.db
      .prepare('UPDATE tasks SET position = ? WHERE id = ?')
      .run(1000, tasks.A.id);
    app.db
      .prepare('UPDATE tasks SET position = ? WHERE id = ?')
      .run(1000 + 1e-9, tasks.B.id);
    const res = await move(tasks.C, {prevId: tasks.A.id, nextId: tasks.B.id});
    expect(res.statusCode).toBe(200);
    expect(await titlesIn(todo)).toEqual(['A', 'C', 'B']);
    const positions = app.db
      .prepare(
        'SELECT position FROM tasks WHERE stage_id = ? ORDER BY position',
      )
      .all(todo.id)
      .map((r) => r.position);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i] - positions[i - 1]).toBeGreaterThan(1);
    }
  });

  it('renumbers stages when they get too close', async () => {
    const [s1, s2, s3] = board.stages;
    app.db.prepare('UPDATE stages SET position = 5 WHERE id = ?').run(s1.id);
    app.db
      .prepare('UPDATE stages SET position = ? WHERE id = ?')
      .run(5 + 1e-9, s2.id);
    const res = await alice.request('PATCH', `/api/stages/${s3.id}`, {
      prevId: s1.id,
      nextId: s2.id,
    });
    expect(res.statusCode).toBe(200);
    const {board: b} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json();
    expect(b.stages.map((s) => s.id)).toEqual([s1.id, s3.id, s2.id]);
  });
});

describe('position helper rebalancing', () => {
  it('asks for a rebalance only when the gap is too small', async () => {
    const {positionFromNeighbours} = await import('../src/utils/position.js');
    const rows = new Map([
      [1, {id: 1, position: 1}],
      [2, {id: 2, position: 1 + 1e-9}],
    ]);
    let rebalanced = 0;
    const position = positionFromNeighbours({
      movingId: 3,
      prevId: 1,
      nextId: 2,
      find: (id) => rows.get(id),
      belongs: () => true,
      rebalance: () => {
        rebalanced++;
        rows.set(1, {id: 1, position: 1024});
        rows.set(2, {id: 2, position: 2048});
      },
    });
    expect(rebalanced).toBe(1);
    expect(position).toBe(1536);
  });
});
