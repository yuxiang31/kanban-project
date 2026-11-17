import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createTeamWith, createTestApp, signUp} from './helpers.js';

describe('teams', () => {
  let app;
  let alice;
  let bob;
  let carol;
  beforeEach(async () => {
    app = await createTestApp();
    alice = await signUp(app, 'alice');
    bob = await signUp(app, 'bob');
    carol = await signUp(app, 'carol');
  });
  afterEach(() => app.close());

  it('creates a team with the creator as owner and member', async () => {
    const res = await alice.request('POST', '/api/teams', {name: ' Core '});
    expect(res.statusCode).toBe(201);
    expect(res.json().team).toMatchObject({
      name: 'Core',
      ownerId: alice.user.id,
      isOwner: true,
      members: [alice.user],
    });
  });

  it('validates the team name', async () => {
    expect(
      (await alice.request('POST', '/api/teams', {name: ' '})).statusCode,
    ).toBe(400);
  });

  it('lists only teams I belong to', async () => {
    await createTeamWith(alice, 'Core', [bob]);
    await createTeamWith(carol, 'Other');
    const res = await bob.request('GET', '/api/teams');
    expect(res.json().teams).toEqual([
      expect.objectContaining({name: 'Core', isOwner: false, memberCount: 2}),
    ]);
  });

  it('shows members to members and hides the team from others', async () => {
    const team = await createTeamWith(alice, 'Core', [bob]);
    const res = await bob.request('GET', `/api/teams/${team.id}`);
    expect(res.json().team.members.map((m) => m.username)).toEqual([
      'alice',
      'bob',
    ]);
    expect(
      (await carol.request('GET', `/api/teams/${team.id}`)).statusCode,
    ).toBe(404);
  });

  describe('adding members', () => {
    it('lets the owner add by username, case-insensitively', async () => {
      const team = await createTeamWith(alice, 'Core');
      const res = await alice.request('POST', `/api/teams/${team.id}/members`, {
        username: 'BOB',
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().member).toEqual(bob.user);
    });

    it('404s for an unknown username', async () => {
      const team = await createTeamWith(alice, 'Core');
      const res = await alice.request('POST', `/api/teams/${team.id}/members`, {
        username: 'nobody',
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().message).toMatch(/nobody/);
    });

    it('409s for an existing member', async () => {
      const team = await createTeamWith(alice, 'Core', [bob]);
      const res = await alice.request('POST', `/api/teams/${team.id}/members`, {
        username: 'bob',
      });
      expect(res.statusCode).toBe(409);
    });

    it('is forbidden for non-owners', async () => {
      const team = await createTeamWith(alice, 'Core', [bob]);
      const res = await bob.request('POST', `/api/teams/${team.id}/members`, {
        username: 'carol',
      });
      expect(res.statusCode).toBe(403);
      expect(
        (
          await carol.request('POST', `/api/teams/${team.id}/members`, {
            username: 'carol',
          })
        ).statusCode,
      ).toBe(404);
    });
  });

  describe('removing members', () => {
    it('lets the owner remove a member', async () => {
      const team = await createTeamWith(alice, 'Core', [bob]);
      const res = await alice.request(
        'DELETE',
        `/api/teams/${team.id}/members/${bob.user.id}`,
      );
      expect(res.statusCode).toBe(204);
      expect(
        (await bob.request('GET', `/api/teams/${team.id}`)).statusCode,
      ).toBe(404);
    });

    it('lets a member leave', async () => {
      const team = await createTeamWith(alice, 'Core', [bob]);
      const res = await bob.request(
        'DELETE',
        `/api/teams/${team.id}/members/${bob.user.id}`,
      );
      expect(res.statusCode).toBe(204);
    });

    it('does not let a member remove someone else', async () => {
      const team = await createTeamWith(alice, 'Core', [bob, carol]);
      const res = await bob.request(
        'DELETE',
        `/api/teams/${team.id}/members/${carol.user.id}`,
      );
      expect(res.statusCode).toBe(403);
    });

    it('does not let the owner leave', async () => {
      const team = await createTeamWith(alice, 'Core', [bob]);
      const res = await alice.request(
        'DELETE',
        `/api/teams/${team.id}/members/${alice.user.id}`,
      );
      expect(res.statusCode).toBe(400);
    });

    it('404s for someone who is not a member', async () => {
      const team = await createTeamWith(alice, 'Core');
      const res = await alice.request(
        'DELETE',
        `/api/teams/${team.id}/members/${carol.user.id}`,
      );
      expect(res.statusCode).toBe(404);
    });
  });
});
