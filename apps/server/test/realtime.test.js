import WebSocket from 'ws';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

/**
 * Opens a board socket as a client and records what it receives.
 * @return {!Promise<!Object>}
 */
async function watch(app, client, boardId, headers = {}) {
  const events = [];
  const waiters = [];
  const ws = await app.injectWS(`/ws/boards/${boardId}`, {
    headers: {cookie: client.cookie, ...headers},
  });
  let closed;
  const closedPromise = new Promise((resolve) => {
    closed = resolve;
  });
  ws.on('message', (data) => {
    const event = JSON.parse(data.toString());
    events.push(event);
    for (const waiter of [...waiters]) {
      if (waiter.match(event)) {
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(event);
      }
    }
  });
  ws.on('close', (code, reason) => closed({code, reason: reason.toString()}));
  return {
    ws,
    events,
    closed: closedPromise,
    /** Resolves with the next (or an already received) event of a type. */
    next(type) {
      const seen = events.find((e) => e.type === type);
      if (seen) {
        return Promise.resolve(seen);
      }
      return new Promise((resolve) => {
        waiters.push({match: (e) => e.type === type, resolve});
      });
    },
  };
}

describe('realtime board updates', () => {
  let app;
  let alice;
  let bob;
  let carol;
  let team;
  let board;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    bob = await signUp(app, 'bob');
    carol = await signUp(app, 'carol');
    team = await createTeamWith(alice, 'Core', [bob]);
    board = (
      await alice.request('POST', '/api/boards', {name: 'B', teamId: team.id})
    ).json().board;
  });
  afterEach(() => app.close());

  describe('connecting', () => {
    it('requires a session', async () => {
      await expect(app.injectWS(`/ws/boards/${board.id}`)).rejects.toThrow(
        /401/,
      );
    });

    it('hides boards the user cannot access', async () => {
      await expect(watch(app, carol, board.id)).rejects.toThrow(/404/);
      await expect(watch(app, alice, 99999)).rejects.toThrow(/404/);
    });

    it('rejects connections from another origin', async () => {
      await expect(
        watch(app, alice, board.id, {
          origin: 'https://evil.example',
          host: 'localhost:3000',
        }),
      ).rejects.toThrow(/403/);
    });

    it('accepts a same-origin connection and forgets it on close', async () => {
      // A real socket: injectWS's in-memory stream never reports the
      // server side as closed, so cleanup can only be seen over TCP.
      const address = await app.listen({port: 0, host: '127.0.0.1'});
      const {host} = new URL(address);
      const ws = new WebSocket(
        `${address.replace('http', 'ws')}/ws/boards/${board.id}`,
        {
          headers: {cookie: alice.cookie, origin: `http://${host}`},
        },
      );
      await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });
      expect(app.realtime.roomSize(board.id)).toBe(1);
      ws.close();
      await vi.waitFor(() => expect(app.realtime.roomSize(board.id)).toBe(0));
    });
  });

  it('pushes task changes to everyone on the board, tagged with the sender', async () => {
    const asBob = await watch(app, bob, board.id);
    const asAlice = await watch(app, alice, board.id);
    const res = await app.inject({
      method: 'POST',
      url: `/api/boards/${board.id}/tasks`,
      headers: {cookie: alice.cookie, 'x-client-id': 'tab-1'},
      payload: {stageId: board.stages[0].id, title: 'Live'},
    });
    const event = await asBob.next('task.created');
    expect(event).toMatchObject({
      type: 'task.created',
      boardId: board.id,
      actorId: alice.user.id,
      origin: 'tab-1',
      payload: {task: {id: res.json().task.id, title: 'Live'}},
    });
    // The sender's own tabs get it too; they skip it by `origin`.
    expect((await asAlice.next('task.created')).origin).toBe('tab-1');
  });

  it('pushes edits, moves and deletes of tasks', async () => {
    const asBob = await watch(app, bob, board.id);
    const {task} = (
      await alice.request('POST', `/api/boards/${board.id}/tasks`, {
        stageId: board.stages[0].id,
        title: 'T',
      })
    ).json();
    await alice.request('PATCH', `/api/tasks/${task.id}`, {
      stageId: board.stages[1].id,
    });
    expect((await asBob.next('task.updated')).payload.task.stageId).toBe(
      board.stages[1].id,
    );
    await alice.request('DELETE', `/api/tasks/${task.id}`);
    expect((await asBob.next('task.deleted')).payload).toEqual({
      taskId: task.id,
    });
  });

  it('pushes stage and board changes', async () => {
    const asBob = await watch(app, bob, board.id);
    const {stage} = (
      await alice.request('POST', `/api/boards/${board.id}/stages`, {
        name: 'Review',
      })
    ).json();
    expect((await asBob.next('stage.created')).payload.stage.name).toBe(
      'Review',
    );
    await alice.request('PATCH', `/api/stages/${stage.id}`, {name: 'QA'});
    expect((await asBob.next('stage.updated')).payload.stage.name).toBe('QA');
    await alice.request('DELETE', `/api/stages/${stage.id}`);
    expect((await asBob.next('stage.deleted')).payload).toEqual({
      stageId: stage.id,
    });
    await alice.request('PATCH', `/api/boards/${board.id}`, {name: 'Renamed'});
    expect((await asBob.next('board.updated')).payload.board.name).toBe(
      'Renamed',
    );
  });

  it('does not leak events to other boards', async () => {
    const other = (
      await alice.request('POST', '/api/boards', {
        name: 'Other',
        teamId: team.id,
      })
    ).json().board;
    const asBob = await watch(app, bob, other.id);
    await alice.request('POST', `/api/boards/${board.id}/tasks`, {
      stageId: board.stages[0].id,
      title: 'Elsewhere',
    });
    await alice.request('PATCH', `/api/boards/${other.id}`, {name: 'Ping'});
    await asBob.next('board.updated');
    expect(asBob.events.map((e) => e.type)).toEqual(['board.updated']);
  });

  it('tells viewers when the board is deleted, then disconnects them', async () => {
    const asBob = await watch(app, bob, board.id);
    await alice.request('DELETE', `/api/boards/${board.id}`);
    const event = await asBob.next('board.deleted');
    expect(event).toMatchObject({
      actorId: alice.user.id,
      // signUp leaves the display name at its default, the username.
      payload: {boardId: board.id, actorName: 'alice'},
    });
    expect((await asBob.closed).code).toBe(4404);
    expect(app.realtime.roomSize(board.id)).toBe(0);
  });

  it('disconnects a member removed from the team, and tells the others', async () => {
    const asBob = await watch(app, bob, board.id);
    const asAlice = await watch(app, alice, board.id);
    await alice.request(
      'DELETE',
      `/api/teams/${team.id}/members/${bob.user.id}`,
    );
    expect((await asBob.closed).code).toBe(4403);
    expect((await asAlice.next('team.members')).payload).toEqual({
      teamId: team.id,
    });
    expect(app.realtime.roomSize(board.id)).toBe(1);
  });

  it('tells team boards when a member is added', async () => {
    const asAlice = await watch(app, alice, board.id);
    await alice.request('POST', `/api/teams/${team.id}/members`, {
      username: 'carol',
    });
    await asAlice.next('team.members');
  });

  it('updates team boards when the team is renamed', async () => {
    const asBob = await watch(app, bob, board.id);
    await alice.request('PATCH', `/api/teams/${team.id}`, {name: 'Platform'});
    expect((await asBob.next('board.updated')).payload.board.team).toEqual({
      id: team.id,
      name: 'Platform',
    });
  });

  it('deletes every team board live when the team is deleted', async () => {
    const asBob = await watch(app, bob, board.id);
    await alice.request('DELETE', `/api/teams/${team.id}`);
    expect((await asBob.next('board.deleted')).payload.boardId).toBe(board.id);
    expect((await asBob.closed).code).toBe(4404);
  });

  it('ignores a client id that is not a short token', async () => {
    const asBob = await watch(app, bob, board.id);
    await app.inject({
      method: 'PATCH',
      url: `/api/boards/${board.id}`,
      headers: {cookie: alice.cookie, 'x-client-id': 'x'.repeat(200)},
      payload: {name: 'N'},
    });
    expect((await asBob.next('board.updated')).origin).toBeNull();
  });

  it('ignores messages sent by clients', async () => {
    const asBob = await watch(app, bob, board.id);
    asBob.ws.send('hello');
    await alice.request('PATCH', `/api/boards/${board.id}`, {name: 'Still ok'});
    await asBob.next('board.updated');
  });
});
