import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('task assignees', () => {
  let app;
  let alice;
  let bob;
  let carol;
  let team;
  let board;
  let task;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    bob = await signUp(app, 'bob');
    carol = await signUp(app, 'carol');
    team = await createTeamWith(alice, 'Core', [bob]);
    board = (
      await alice.request('POST', '/api/boards', {name: 'B', teamId: team.id})
    ).json().board;
    task = (
      await alice.request('POST', `/api/boards/${board.id}/tasks`, {
        stageId: board.stages[0].id,
        title: 'T',
      })
    ).json().task;
  });
  afterEach(() => app.close());

  const assign = (client, userIds, taskId = task.id) =>
    client.request('PUT', `/api/tasks/${taskId}/assignees`, {userIds});

  it('lists who can be assigned on the board', async () => {
    const {members} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json().board;
    expect(members).toEqual([alice.user, bob.user]);
    const personal = (
      await carol.request('POST', '/api/boards', {name: 'Mine'})
    ).json().board;
    expect(personal.members).toEqual([carol.user]);
  });

  it('assigns several people at once', async () => {
    const res = await assign(bob, [bob.user.id, alice.user.id]);
    expect(res.statusCode).toBe(200);
    expect(res.json().task.assigneeIds).toEqual([alice.user.id, bob.user.id]);
    const {tasks} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json().board;
    expect(tasks[0].assigneeIds).toEqual([alice.user.id, bob.user.id]);
  });

  it('replaces the set, and can clear it', async () => {
    await assign(alice, [alice.user.id, bob.user.id]);
    expect(
      (await assign(alice, [bob.user.id])).json().task.assigneeIds,
    ).toEqual([bob.user.id]);
    expect((await assign(alice, [])).json().task.assigneeIds).toEqual([]);
  });

  it('ignores duplicates', async () => {
    const res = await assign(alice, [bob.user.id, bob.user.id]);
    expect(res.statusCode).toBe(200);
    expect(res.json().task.assigneeIds).toEqual([bob.user.id]);
  });

  it('only assigns people who can see the board', async () => {
    const res = await assign(alice, [alice.user.id, carol.user.id]);
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/carol/);
    expect((await assign(alice, [99999])).statusCode).toBe(400);
    // Nothing was half-applied.
    const {tasks} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json().board;
    expect(tasks[0].assigneeIds).toEqual([]);
  });

  it('only lets the owner be assigned on a personal board', async () => {
    const personal = (
      await alice.request('POST', '/api/boards', {name: 'Mine'})
    ).json().board;
    const {task: mine} = (
      await alice.request('POST', `/api/boards/${personal.id}/tasks`, {
        stageId: personal.stages[0].id,
        title: 'Solo',
      })
    ).json();
    expect((await assign(alice, [alice.user.id], mine.id)).statusCode).toBe(
      200,
    );
    expect((await assign(alice, [bob.user.id], mine.id)).statusCode).toBe(400);
  });

  it('validates the body', async () => {
    expect(
      (await alice.request('PUT', `/api/tasks/${task.id}/assignees`, {}))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await assign(
          alice,
          Array.from({length: 51}, (_, i) => i + 1),
        )
      ).statusCode,
    ).toBe(400);
  });

  it('hides tasks on boards the user cannot access', async () => {
    expect((await assign(carol, [])).statusCode).toBe(404);
    expect((await assign(alice, [], 99999)).statusCode).toBe(404);
  });

  it('keeps assignees through edits and moves', async () => {
    await assign(alice, [bob.user.id]);
    const res = await alice.request('PATCH', `/api/tasks/${task.id}`, {
      title: 'Renamed',
      stageId: board.stages[1].id,
    });
    expect(res.json().task.assigneeIds).toEqual([bob.user.id]);
  });

  it('pushes the change to people watching the board', async () => {
    const ws = await app.injectWS(`/ws/boards/${board.id}`, {
      headers: {cookie: bob.cookie},
    });
    const received = new Promise((resolve) =>
      ws.on('message', (data) => resolve(JSON.parse(data.toString()))),
    );
    await assign(alice, [bob.user.id]);
    expect(await received).toMatchObject({
      type: 'task.updated',
      payload: {task: {id: task.id, assigneeIds: [bob.user.id]}},
    });
    ws.terminate();
  });
});
