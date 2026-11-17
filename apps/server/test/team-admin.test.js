import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('team administration', () => {
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
    team = await createTeamWith(alice, 'Core', [bob]);
  });
  afterEach(() => app.close());

  const patch = (client, body) =>
    client.request('PATCH', `/api/teams/${team.id}`, body);

  it('reports how many boards the team has', async () => {
    await bob.request('POST', '/api/boards', {name: 'One', teamId: team.id});
    await alice.request('POST', '/api/boards', {name: 'Mine'});
    const res = await alice.request('GET', `/api/teams/${team.id}`);
    expect(res.json().team.boardCount).toBe(1);
  });

  describe('rename', () => {
    it('lets the owner rename the team', async () => {
      const res = await patch(alice, {name: ' Platform '});
      expect(res.statusCode).toBe(200);
      expect(res.json().team.name).toBe('Platform');
    });

    it('is forbidden for members and hidden from outsiders', async () => {
      expect((await patch(bob, {name: 'Mine now'})).statusCode).toBe(403);
      expect((await patch(carol, {name: 'X'})).statusCode).toBe(404);
    });

    it('validates the name', async () => {
      expect((await patch(alice, {name: '  '})).statusCode).toBe(400);
      expect((await patch(alice, {})).statusCode).toBe(400);
    });
  });

  describe('single owner', () => {
    it('has no way to add or hand over ownership', async () => {
      expect((await patch(alice, {ownerId: bob.user.id})).statusCode).toBe(400);
      const res = await alice.request(
        'PATCH',
        `/api/teams/${team.id}/members/${bob.user.id}`,
        {role: 'owner'},
      );
      expect(res.statusCode).toBe(404);
      const {team: t} = (
        await alice.request('GET', `/api/teams/${team.id}`)
      ).json();
      expect(t.ownerId).toBe(alice.user.id);
      expect(t.members[0]).not.toHaveProperty('role');
    });
  });

  describe('delete', () => {
    it('lets the owner delete the team and its boards', async () => {
      const {board} = (
        await bob.request('POST', '/api/boards', {name: 'B', teamId: team.id})
      ).json();
      await bob.request('POST', `/api/boards/${board.id}/tasks`, {
        stageId: board.stages[0].id,
        title: 'Gone',
      });
      const {board: personal} = (
        await alice.request('POST', '/api/boards', {name: 'Mine'})
      ).json();

      const res = await alice.request('DELETE', `/api/teams/${team.id}`);
      expect(res.statusCode).toBe(204);
      expect(
        (await bob.request('GET', `/api/teams/${team.id}`)).statusCode,
      ).toBe(404);
      expect((await bob.request('GET', '/api/boards')).json().boards).toEqual(
        [],
      );
      const counts = app.db
        .prepare(
          `SELECT (SELECT COUNT(*) FROM boards) AS boards,
                  (SELECT COUNT(*) FROM tasks) AS tasks,
                  (SELECT COUNT(*) FROM team_members) AS members`,
        )
        .get();
      expect(counts).toEqual({boards: 1, tasks: 0, members: 0});
      expect(
        (await alice.request('GET', `/api/boards/${personal.id}`)).statusCode,
      ).toBe(200);
    });

    it('is forbidden for members and hidden from outsiders', async () => {
      expect(
        (await bob.request('DELETE', `/api/teams/${team.id}`)).statusCode,
      ).toBe(403);
      expect(
        (await carol.request('DELETE', `/api/teams/${team.id}`)).statusCode,
      ).toBe(404);
    });
  });
});
