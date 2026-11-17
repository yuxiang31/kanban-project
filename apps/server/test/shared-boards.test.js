import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('team boards', () => {
  let app;
  let alice;
  let bob;
  let carol;
  let team;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    bob = await signUp(app, 'bob');
    carol = await signUp(app, 'carol');
    team = await createTeamWith(alice, 'Core', [bob, carol]);
  });
  afterEach(() => app.close());

  const createTeamBoard = (client, name = 'Shared') =>
    client.request('POST', '/api/boards', {name, teamId: team.id});

  it('creates a board for a team I belong to', async () => {
    const res = await createTeamBoard(bob);
    expect(res.statusCode).toBe(201);
    expect(res.json().board).toMatchObject({
      teamId: team.id,
      team: {id: team.id, name: 'Core'},
    });
  });

  it('refuses a team I do not belong to', async () => {
    const outsider = await signUp(app, 'dave');
    const res = await outsider.request('POST', '/api/boards', {
      name: 'X',
      teamId: team.id,
    });
    expect(res.statusCode).toBe(404);
  });

  it('lists personal and team boards with their team', async () => {
    await alice.request('POST', '/api/boards', {name: 'Mine'});
    await createTeamBoard(bob, 'Ours');
    const {boards} = (await alice.request('GET', '/api/boards')).json();
    expect(boards.map((b) => [b.name, b.team?.name ?? null]).sort()).toEqual([
      ['Mine', null],
      ['Ours', 'Core'],
    ]);
    const bobs = (await bob.request('GET', '/api/boards')).json().boards;
    expect(bobs.map((b) => b.name)).toEqual(['Ours']);
  });

  it('lets every member read and edit a team board', async () => {
    const {board} = (await createTeamBoard(alice)).json();
    const res = await carol.request('POST', `/api/boards/${board.id}/tasks`, {
      stageId: board.stages[0].id,
      title: 'From Carol',
    });
    expect(res.statusCode).toBe(201);
    expect(
      (await bob.request('PATCH', `/api/boards/${board.id}`, {name: 'Renamed'}))
        .statusCode,
    ).toBe(200);
  });

  it('lets the creator or the team owner delete, not other members', async () => {
    const byBob = (await createTeamBoard(bob, 'Bob board')).json().board;
    const byCarol = (await createTeamBoard(carol, 'Carol board')).json().board;

    const asCarol = await carol.request('GET', `/api/boards/${byBob.id}`);
    expect(asCarol.json().board.canDelete).toBe(false);
    expect(
      (await carol.request('DELETE', `/api/boards/${byBob.id}`)).statusCode,
    ).toBe(403);

    expect(
      (await bob.request('DELETE', `/api/boards/${byBob.id}`)).statusCode,
    ).toBe(204);
    expect(
      (await alice.request('DELETE', `/api/boards/${byCarol.id}`)).statusCode,
    ).toBe(204);
  });

  it('removes access and assignments when a member leaves', async () => {
    const {board} = (await createTeamBoard(alice)).json();
    const {task} = (
      await alice.request('POST', `/api/boards/${board.id}/tasks`, {
        stageId: board.stages[0].id,
        title: 'Assigned',
      })
    ).json();
    app.db
      .prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)')
      .run(task.id, bob.user.id);

    await alice.request(
      'DELETE',
      `/api/teams/${team.id}/members/${bob.user.id}`,
    );

    expect(
      (await bob.request('GET', `/api/boards/${board.id}`)).statusCode,
    ).toBe(404);
    expect((await bob.request('GET', '/api/boards')).json().boards).toEqual([]);
    const assignees = app.db
      .prepare('SELECT COUNT(*) AS n FROM task_assignees WHERE user_id = ?')
      .get(bob.user.id).n;
    expect(assignees).toBe(0);
  });

  it('keeps personal boards private from team mates', async () => {
    const {board} = (
      await alice.request('POST', '/api/boards', {name: 'Private'})
    ).json();
    expect(
      (await bob.request('GET', `/api/boards/${board.id}`)).statusCode,
    ).toBe(404);
  });
});
