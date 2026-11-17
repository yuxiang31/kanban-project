import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTestApp, signUp} from './helpers.js';

describe('task checklists', () => {
  let app;
  let alice;
  let board;
  let task;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    board = (await alice.request('POST', '/api/boards', {name: 'B'})).json()
      .board;
    task = (
      await alice.request('POST', `/api/boards/${board.id}/tasks`, {
        stageId: board.stages[0].id,
        title: 'Launch',
      })
    ).json().task;
  });
  afterEach(() => app.close());

  const add = (text, taskId = task.id, client = alice) =>
    client.request('POST', `/api/tasks/${taskId}/checklist`, {text});
  const patch = (itemId, body, client = alice) =>
    client.request('PATCH', `/api/checklist/${itemId}`, body);
  const boardTask = async () =>
    (await alice.request('GET', `/api/boards/${board.id}`))
      .json()
      .board.tasks.find((t) => t.id === task.id);

  it('are empty on a new task', async () => {
    expect(task.checklist).toEqual([]);
    expect((await boardTask()).checklist).toEqual([]);
  });

  it('take items in the order they are added', async () => {
    const res = await add('  Write the post  ');
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toMatchObject({
      text: 'Write the post',
      done: false,
    });
    await add('Get sign-off');
    expect((await boardTask()).checklist.map((i) => i.text)).toEqual([
      'Write the post',
      'Get sign-off',
    ]);
    // The response carries the whole task, so a client can show it at once.
    expect(res.json().task.checklist).toHaveLength(1);
  });

  it('can tick, untick and rename items', async () => {
    const {item} = (await add('Write')).json();
    expect((await patch(item.id, {done: true})).json().item.done).toBe(true);
    expect(
      (await patch(item.id, {text: 'Write the post'})).json().item,
    ).toEqual(expect.objectContaining({text: 'Write the post', done: true}));
    await patch(item.id, {done: false});
    expect((await boardTask()).checklist[0]).toMatchObject({
      id: item.id,
      text: 'Write the post',
      done: false,
    });
  });

  it('can delete items', async () => {
    const {item} = (await add('Write')).json();
    await add('Keep');
    const res = await alice.request('DELETE', `/api/checklist/${item.id}`);
    expect(res.statusCode).toBe(204);
    expect((await boardTask()).checklist.map((i) => i.text)).toEqual(['Keep']);
  });

  it('are deleted with their task', async () => {
    await add('Write');
    await alice.request('DELETE', `/api/tasks/${task.id}`);
    expect(
      app.db.prepare('SELECT COUNT(*) AS n FROM task_checklist_items').get().n,
    ).toBe(0);
  });

  it('are returned when the task is edited or assigned', async () => {
    await add('Write');
    const edited = await alice.request('PATCH', `/api/tasks/${task.id}`, {
      title: 'Launch v2',
    });
    expect(edited.json().task.checklist).toHaveLength(1);
    const assigned = await alice.request(
      'PUT',
      `/api/tasks/${task.id}/assignees`,
      {userIds: [alice.user.id]},
    );
    expect(assigned.json().task.checklist).toHaveLength(1);
  });

  it.each([
    ['blank text', {text: '   '}],
    ['text over 300 characters', {text: 'x'.repeat(301)}],
    ['no text', {}],
  ])('reject %s', async (_name, body) => {
    const res = await alice.request(
      'POST',
      `/api/tasks/${task.id}/checklist`,
      body,
    );
    expect(res.statusCode).toBe(400);
  });

  it('ignore unknown fields, like the rest of the API', async () => {
    const res = await alice.request('POST', `/api/tasks/${task.id}/checklist`, {
      text: 'ok',
      done: true,
      extra: 1,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().item).toEqual({
      id: expect.any(Number),
      text: 'ok',
      done: false,
    });
  });

  it('reject an empty change', async () => {
    const {item} = (await add('Write')).json();
    expect((await patch(item.id, {})).statusCode).toBe(400);
    expect((await patch(item.id, {text: ''})).statusCode).toBe(400);
  });

  it('allow at most 100 items per task', async () => {
    const insert = app.db.prepare(
      'INSERT INTO task_checklist_items (task_id, text, position) VALUES (?, ?, ?)',
    );
    for (let i = 0; i < 100; i++) {
      insert.run(task.id, `Item ${i}`, i + 1);
    }
    const res = await add('One too many');
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/100/);
  });

  it('are hidden from people without access to the board', async () => {
    const mallory = await signUp(app, 'mallory');
    const {item} = (await add('Write')).json();
    expect((await add('Sneaky', task.id, mallory)).statusCode).toBe(404);
    expect((await patch(item.id, {done: true}, mallory)).statusCode).toBe(404);
    expect(
      (await mallory.request('DELETE', `/api/checklist/${item.id}`)).statusCode,
    ).toBe(404);
    expect((await patch(9999, {done: true})).statusCode).toBe(404);
  });

  it('push changes live as task updates', async () => {
    const ws = await app.injectWS(`/ws/boards/${board.id}`, {
      headers: {cookie: alice.cookie},
    });
    const received = [];
    ws.on('message', (data) => received.push(JSON.parse(data.toString())));
    const {item} = (await add('Write')).json();
    await patch(item.id, {done: true});
    await alice.request('DELETE', `/api/checklist/${item.id}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.map((e) => e.type)).toEqual([
      'task.updated',
      'task.updated',
      'task.updated',
    ]);
    expect(received[1].payload.task.checklist[0].done).toBe(true);
    expect(received[2].payload.task.checklist).toEqual([]);
    ws.terminate();
  });
});
