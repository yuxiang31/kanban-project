import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('board due dates', () => {
  let app;
  let alice;
  let board;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    board = (await alice.request('POST', '/api/boards', {name: 'B'})).json()
      .board;
  });
  afterEach(() => app.close());

  const patch = (body) =>
    alice.request('PATCH', `/api/boards/${board.id}`, body);

  it('start unset, or with the date given at creation', async () => {
    expect(board.dueDate).toBeNull();
    const res = await alice.request('POST', '/api/boards', {
      name: 'Launch',
      dueDate: '2026-12-01',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().board.dueDate).toBe('2026-12-01');
  });

  it('can be set, changed and cleared, and show in the list', async () => {
    expect((await patch({dueDate: '2027-01-15'})).json().board.dueDate).toBe(
      '2027-01-15',
    );
    const {boards} = (await alice.request('GET', '/api/boards')).json();
    expect(boards[0].dueDate).toBe('2027-01-15');
    expect((await patch({dueDate: null})).json().board.dueDate).toBeNull();
  });

  it('survive other changes to the board', async () => {
    await patch({dueDate: '2027-01-15'});
    await patch({name: 'Renamed', description: 'Why', color: 'sky'});
    const {board: full} = (
      await alice.request('GET', `/api/boards/${board.id}`)
    ).json();
    expect(full).toMatchObject({name: 'Renamed', dueDate: '2027-01-15'});
  });

  it.each(['2026-13-01', '2026-02-30', '26-12-01', '2026-12-01T10:00', ''])(
    'reject %j as a date',
    async (dueDate) => {
      expect((await patch({dueDate})).statusCode).toBe(400);
      const created = await alice.request('POST', '/api/boards', {
        name: 'X',
        dueDate,
      });
      expect(created.statusCode).toBe(400);
    },
  );

  it('are stored only as real calendar dates', () => {
    expect(() =>
      app.db
        .prepare('UPDATE boards SET due_date = ? WHERE id = ?')
        .run('2026-02-30', board.id),
    ).toThrow(/CHECK/);
  });

  it('are sent live to people viewing the board', async () => {
    const ws = await app.injectWS(`/ws/boards/${board.id}`, {
      headers: {cookie: alice.cookie},
    });
    const received = new Promise((resolve) =>
      ws.on('message', (data) => resolve(JSON.parse(data.toString()))),
    );
    await patch({dueDate: '2027-02-02'});
    expect(await received).toMatchObject({
      type: 'board.updated',
      payload: {board: {dueDate: '2027-02-02'}},
    });
    ws.terminate();
  });
});

describe('board member counts', () => {
  let app;
  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(() => app.close());

  it('are 1 for a personal board and the team size for a team board', async () => {
    const alice = await signUp(app, 'alice');
    const bob = await signUp(app, 'bob');
    const carol = await signUp(app, 'carol');
    const team = await createTeamWith(alice, 'Core', [bob, carol]);
    await alice.request('POST', '/api/boards', {name: 'Mine'});
    await alice.request('POST', '/api/boards', {name: 'Ours', teamId: team.id});

    const {boards} = (await alice.request('GET', '/api/boards')).json();
    const byName = Object.fromEntries(boards.map((b) => [b.name, b]));
    expect(byName.Mine.memberCount).toBe(1);
    expect(byName.Ours.memberCount).toBe(3);

    await alice.request(
      'DELETE',
      `/api/teams/${team.id}/members/${carol.user.id}`,
    );
    const after = (await bob.request('GET', '/api/boards')).json().boards;
    expect(after.find((b) => b.name === 'Ours').memberCount).toBe(2);
  });
});
