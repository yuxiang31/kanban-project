import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTestApp, signUp} from './helpers.js';

describe('boards', () => {
  let app;
  let alice;
  let bob;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    bob = await signUp(app, 'bob');
  });
  afterEach(() => app.close());

  const createBoard = (client, name = 'Launch') =>
    client.request('POST', '/api/boards', {name});

  it('requires login', async () => {
    const res = await app.inject({method: 'GET', url: '/api/boards'});
    expect(res.statusCode).toBe(401);
  });

  it('creates a board with the default stages in order', async () => {
    const res = await createBoard(alice, '  Launch  ');
    expect(res.statusCode).toBe(201);
    const {board} = res.json();
    expect(board).toMatchObject({
      name: 'Launch',
      teamId: null,
      canDelete: true,
    });
    expect(board.stages.map((s) => s.name)).toEqual([
      'To Do',
      'In Progress',
      'Done',
    ]);
    expect(board.tasks).toEqual([]);
  });

  it('validates the board name', async () => {
    expect((await createBoard(alice, '')).statusCode).toBe(400);
    expect((await createBoard(alice, '   ')).statusCode).toBe(400);
    expect((await createBoard(alice, 'x'.repeat(101))).statusCode).toBe(400);
  });

  it('lists only my boards, newest first, with task counts', async () => {
    const first = (await createBoard(alice, 'First')).json().board;
    await createBoard(alice, 'Second');
    await createBoard(bob, 'Bob board');
    await alice.request('POST', `/api/boards/${first.id}/tasks`, {
      stageId: first.stages[0].id,
      title: 'A task',
    });
    const res = await alice.request('GET', '/api/boards');
    expect(res.statusCode).toBe(200);
    const {boards} = res.json();
    expect(boards.map((b) => b.name)).toEqual(['Second', 'First']);
    expect(boards[1]).toMatchObject({taskCount: 1, teamId: null});
  });

  it('gets a full board', async () => {
    const {board} = (await createBoard(alice)).json();
    const res = await alice.request('GET', `/api/boards/${board.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().board).toEqual(board);
  });

  it('hides other people’s boards with 404', async () => {
    const {board} = (await createBoard(alice)).json();
    for (const [method, payload] of [
      ['GET'],
      ['PATCH', {name: 'Hacked'}],
      ['DELETE'],
    ]) {
      const res = await bob.request(method, `/api/boards/${board.id}`, payload);
      expect(res.statusCode).toBe(404);
    }
    expect((await bob.request('GET', '/api/boards/9999')).statusCode).toBe(404);
  });

  it('renames a board', async () => {
    const {board} = (await createBoard(alice)).json();
    const res = await alice.request('PATCH', `/api/boards/${board.id}`, {
      name: 'Renamed',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().board.name).toBe('Renamed');
  });

  it('deletes a board with its stages and tasks', async () => {
    const {board} = (await createBoard(alice)).json();
    await alice.request('POST', `/api/boards/${board.id}/tasks`, {
      stageId: board.stages[0].id,
      title: 'Doomed',
    });
    const res = await alice.request('DELETE', `/api/boards/${board.id}`);
    expect(res.statusCode).toBe(204);
    expect(
      (await alice.request('GET', `/api/boards/${board.id}`)).statusCode,
    ).toBe(404);
    const counts = app.db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM stages) AS stages,
                (SELECT COUNT(*) FROM tasks) AS tasks`,
      )
      .get();
    expect(counts).toEqual({stages: 0, tasks: 0});
  });
});
