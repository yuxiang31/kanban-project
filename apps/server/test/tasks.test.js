import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTestApp, signUp} from './helpers.js';

describe('tasks', () => {
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

  const addTask = (client, body) =>
    client.request('POST', `/api/boards/${board.id}/tasks`, {
      stageId: board.stages[0].id,
      ...body,
    });

  it('creates tasks appended to the stage', async () => {
    const first = await addTask(alice, {title: ' First ', description: 'Why'});
    expect(first.statusCode).toBe(201);
    expect(first.json().task).toMatchObject({
      title: 'First',
      description: 'Why',
      stageId: board.stages[0].id,
      assigneeIds: [],
    });
    const second = (await addTask(alice, {title: 'Second'})).json().task;
    expect(second.position).toBeGreaterThan(first.json().task.position);
    const {tasks} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json().board;
    expect(tasks.map((t) => t.title)).toEqual(['First', 'Second']);
  });

  it('validates the title', async () => {
    expect((await addTask(alice, {title: '  '})).statusCode).toBe(400);
    expect((await addTask(alice, {title: 'x'.repeat(201)})).statusCode).toBe(
      400,
    );
  });

  it('rejects a stage from another board', async () => {
    const other = (
      await alice.request('POST', '/api/boards', {name: 'O'})
    ).json().board;
    const res = await addTask(alice, {title: 'T', stageId: other.stages[0].id});
    expect(res.statusCode).toBe(400);
  });

  it('edits title and description', async () => {
    const {task} = (await addTask(alice, {title: 'Old'})).json();
    const res = await alice.request('PATCH', `/api/tasks/${task.id}`, {
      title: 'New',
      description: 'Details',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().task).toMatchObject({
      title: 'New',
      description: 'Details',
    });
  });

  it('rejects an empty edit title', async () => {
    const {task} = (await addTask(alice, {title: 'Old'})).json();
    const res = await alice.request('PATCH', `/api/tasks/${task.id}`, {
      title: ' ',
    });
    expect(res.statusCode).toBe(400);
  });

  it('deletes a task', async () => {
    const {task} = (await addTask(alice, {title: 'Bye'})).json();
    expect(
      (await alice.request('DELETE', `/api/tasks/${task.id}`)).statusCode,
    ).toBe(204);
    expect(
      (await alice.request('DELETE', `/api/tasks/${task.id}`)).statusCode,
    ).toBe(404);
  });

  it('hides tasks on other people’s boards', async () => {
    const {task} = (await addTask(alice, {title: 'Mine'})).json();
    expect((await addTask(bob, {title: 'Intruder'})).statusCode).toBe(404);
    expect(
      (await bob.request('PATCH', `/api/tasks/${task.id}`, {title: 'x'}))
        .statusCode,
    ).toBe(404);
    expect(
      (await bob.request('DELETE', `/api/tasks/${task.id}`)).statusCode,
    ).toBe(404);
  });
});
