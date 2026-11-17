import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTestApp, signUp} from './helpers.js';

describe('stages', () => {
  let app;
  let alice;
  let bob;
  let board;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    bob = await signUp(app, 'bob');
    board = (await alice.request('POST', '/api/boards', {name: 'B'})).json()
      .board;
  });
  afterEach(() => app.close());

  const stageNames = async () =>
    (await alice.request('GET', `/api/boards/${board.id}`))
      .json()
      .board.stages.map((s) => s.name);
  const [todo, doing, done] = [0, 1, 2].map((i) => () => board.stages[i]);

  it('adds a stage at the end', async () => {
    const res = await alice.request('POST', `/api/boards/${board.id}/stages`, {
      name: 'Review',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().stage).toMatchObject({name: 'Review'});
    expect(await stageNames()).toEqual([
      'To Do',
      'In Progress',
      'Done',
      'Review',
    ]);
  });

  it('validates stage names', async () => {
    const url = `/api/boards/${board.id}/stages`;
    expect((await alice.request('POST', url, {name: ' '})).statusCode).toBe(
      400,
    );
    expect(
      (await alice.request('POST', url, {name: 'x'.repeat(51)})).statusCode,
    ).toBe(400);
  });

  it('renames a stage', async () => {
    const res = await alice.request('PATCH', `/api/stages/${todo().id}`, {
      name: 'Backlog',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().stage.name).toBe('Backlog');
  });

  it('moves a stage between two others', async () => {
    const res = await alice.request('PATCH', `/api/stages/${done().id}`, {
      prevId: todo().id,
      nextId: doing().id,
    });
    expect(res.statusCode).toBe(200);
    expect(await stageNames()).toEqual(['To Do', 'Done', 'In Progress']);
  });

  it('moves a stage to the start and to the end', async () => {
    await alice.request('PATCH', `/api/stages/${done().id}`, {
      prevId: null,
      nextId: todo().id,
    });
    expect(await stageNames()).toEqual(['Done', 'To Do', 'In Progress']);
    await alice.request('PATCH', `/api/stages/${done().id}`, {
      prevId: doing().id,
      nextId: null,
    });
    expect(await stageNames()).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('rejects bad neighbours', async () => {
    const other = (await bob.request('POST', '/api/boards', {name: 'X'})).json()
      .board;
    const cases = [
      {prevId: other.stages[0].id},
      {prevId: done().id},
      {prevId: doing().id, nextId: todo().id},
      {prevId: 99999},
    ];
    for (const body of cases) {
      const res = await alice.request(
        'PATCH',
        `/api/stages/${done().id}`,
        body,
      );
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('deletes a stage and its tasks', async () => {
    await alice.request('POST', `/api/boards/${board.id}/tasks`, {
      stageId: todo().id,
      title: 'Gone with the stage',
    });
    const res = await alice.request('DELETE', `/api/stages/${todo().id}`);
    expect(res.statusCode).toBe(204);
    expect(await stageNames()).toEqual(['In Progress', 'Done']);
    expect(app.db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n).toBe(0);
  });

  it('refuses to delete the last stage', async () => {
    await alice.request('DELETE', `/api/stages/${todo().id}`);
    await alice.request('DELETE', `/api/stages/${doing().id}`);
    const res = await alice.request('DELETE', `/api/stages/${done().id}`);
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/at least one stage/i);
  });

  it('hides stages on other people’s boards', async () => {
    const id = todo().id;
    expect(
      (await bob.request('POST', `/api/boards/${board.id}/stages`, {name: 'x'}))
        .statusCode,
    ).toBe(404);
    expect(
      (await bob.request('PATCH', `/api/stages/${id}`, {name: 'x'})).statusCode,
    ).toBe(404);
    expect((await bob.request('DELETE', `/api/stages/${id}`)).statusCode).toBe(
      404,
    );
    expect(
      (await alice.request('DELETE', '/api/stages/99999')).statusCode,
    ).toBe(404);
  });
});
