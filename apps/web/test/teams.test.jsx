import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {createFakeApi, users} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
beforeEach(() => {
  api = createFakeApi();
  mockFetch(loggedInAsAlice, api.handle);
});

describe('navigation', () => {
  it('links to boards and teams from the header', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', {name: /main/i});
    expect(within(nav).getByRole('link', {name: 'Boards'})).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(nav).getByRole('link', {name: 'Teams'})).toHaveAttribute(
      'href',
      '/teams',
    );
  });
});

describe('teams page', () => {
  it('shows an empty state', async () => {
    renderApp('/teams');
    expect(await screen.findByText(/not in any teams/i)).toBeVisible();
  });

  it('lists my teams with member counts and ownership', async () => {
    api.seedTeam('Core', {memberIds: [users.bob.id]});
    api.seedTeam('Design', {
      ownerId: users.bob.id,
      memberIds: [users.alice.id],
    });
    renderApp('/teams');
    const core = await screen.findByRole('link', {name: /core/i});
    expect(core).toHaveTextContent('2 members');
    expect(core).toHaveTextContent(/owner/i);
    expect(screen.getByRole('link', {name: /design/i})).not.toHaveTextContent(
      /owner/i,
    );
  });

  it('creates a team and opens it', async () => {
    renderApp('/teams');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/team name/i), 'Core{Enter}');
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Core'}),
    ).toBeVisible();
    expect(screen.getByRole('listitem')).toHaveTextContent('Alice');
  });

  it('shows an error if the teams list fails', async () => {
    api.failNext('GET /api/teams', 500, 'Teams broke.');
    renderApp('/teams');
    expect(await screen.findByRole('alert')).toHaveTextContent('Teams broke.');
  });
});

describe('team detail as owner', () => {
  let team;
  beforeEach(() => {
    team = api.seedTeam('Core', {memberIds: [users.bob.id]});
  });

  const members = () =>
    screen.getAllByRole('listitem').map((li) => li.textContent);

  it('lists members with the owner marked', async () => {
    renderApp(`/teams/${team.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Core'});
    expect(members()[0]).toMatch(/Alice.*@alice.*Owner/);
    expect(members()[1]).toMatch(/Bob.*@bob/);
  });

  it('adds a member by username', async () => {
    renderApp(`/teams/${team.id}`);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'carol');
    await user.click(screen.getByRole('button', {name: /add member/i}));
    await waitFor(() => expect(members()).toHaveLength(3));
    expect(screen.getByLabelText(/username/i)).toHaveValue('');
  });

  it('shows why adding failed', async () => {
    renderApp(`/teams/${team.id}`);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/username/i), 'zed{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No user named "zed".',
    );
  });

  it('removes a member after confirming', async () => {
    renderApp(`/teams/${team.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /remove bob/i}));
    const confirm = screen.getByRole('alertdialog');
    expect(confirm).toHaveTextContent(/Bob/);
    await user.click(within(confirm).getByRole('button', {name: /remove/i}));
    await waitFor(() => expect(members()).toHaveLength(1));
  });

  it('has no remove button for the owner and no leave button', async () => {
    renderApp(`/teams/${team.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Core'});
    expect(screen.queryByRole('button', {name: /remove alice/i})).toBeNull();
    expect(screen.queryByRole('button', {name: /leave team/i})).toBeNull();
  });
});

describe('team detail as member', () => {
  it('can leave but not manage members', async () => {
    const team = api.seedTeam('Design', {
      ownerId: users.bob.id,
      memberIds: [users.alice.id],
    });
    renderApp(`/teams/${team.id}`);
    const user = userEvent.setup();
    await screen.findByRole('heading', {level: 1, name: 'Design'});
    expect(screen.queryByLabelText(/username/i)).toBeNull();
    expect(screen.queryByRole('button', {name: /remove/i})).toBeNull();

    await user.click(screen.getByRole('button', {name: /leave team/i}));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: /leave/i,
      }),
    );
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Teams'}),
    ).toBeVisible();
    // The heading renders before the refetched (now empty) list arrives.
    expect(await screen.findByText(/not in any teams/i)).toBeVisible();
  });

  it('shows not found for a team I am not in', async () => {
    renderApp('/teams/999');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(screen.getByRole('link', {name: /back to teams/i})).toBeVisible();
  });
});

describe('team boards', () => {
  it('creates a board shared with a team', async () => {
    const team = api.seedTeam('Core');
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/board name/i), 'Roadmap');
    await waitFor(() =>
      expect(within(dialog).getByRole('option', {name: 'Core'})).toBeTruthy(),
    );
    await user.selectOptions(
      within(dialog).getByLabelText(/share with/i),
      String(team.id),
    );
    await user.click(within(dialog).getByRole('button', {name: /create/i}));
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Roadmap'}),
    ).toBeVisible();
    expect(screen.getByText(/shared with/i)).toHaveTextContent(
      'Shared with Core',
    );
    expect(screen.getByRole('link', {name: 'Core'})).toHaveAttribute(
      'href',
      `/teams/${team.id}`,
    );
    expect(api.state.boards[0].teamId).toBe(team.id);
  });

  it('groups the board list into personal and team sections', async () => {
    const team = api.seedTeam('Core');
    api.seedBoard('Mine');
    api.seedBoard('Ours', undefined, {teamId: team.id});
    renderApp('/');
    const personal = await screen.findByRole('region', {name: 'Personal'});
    expect(within(personal).getByRole('link', {name: /mine/i})).toBeVisible();
    const core = screen.getByRole('region', {name: 'Core'});
    expect(within(core).getByRole('link', {name: /ours/i})).toBeVisible();
  });

  it('hides delete for boards I cannot delete', async () => {
    const board = api.seedBoard('Theirs');
    api.state.boards[0].canDeleteOverride = false;
    renderApp(`/boards/${board.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Theirs'});
    expect(screen.queryByRole('button', {name: /delete board/i})).toBeNull();
  });
});

describe('team administration', () => {
  let team;
  beforeEach(() => {
    team = api.seedTeam('Core', {memberIds: [users.bob.id]});
  });

  it('lets the owner rename the team', async () => {
    renderApp(`/teams/${team.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /rename team/i}));
    const input = screen.getByLabelText(/team name/i);
    await user.clear(input);
    await user.type(input, 'Platform{Enter}');
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Platform'}),
    ).toBeVisible();
  });

  it('lets the owner delete the team after confirming', async () => {
    api.seedBoard('Shared', undefined, {teamId: team.id});
    renderApp(`/teams/${team.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /delete team/i}));
    const confirm = screen.getByRole('alertdialog', {name: /delete team/i});
    expect(confirm).toHaveTextContent(/1 board/);
    await user.click(within(confirm).getByRole('button', {name: /^delete$/i}));
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Teams'}),
    ).toBeVisible();
    // The heading renders before the refetched (now empty) list arrives.
    expect(await screen.findByText(/not in any teams/i)).toBeVisible();
    expect(api.state.boards).toEqual([]);
  });

  it('has no co-owner or transfer controls', async () => {
    renderApp(`/teams/${team.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Core'});
    expect(screen.queryByRole('button', {name: /owner/i})).toBeNull();
    expect(screen.queryByRole('button', {name: /step down/i})).toBeNull();
  });

  it('hides team admin controls from members', async () => {
    const other = api.seedTeam('Design', {
      ownerId: users.bob.id,
      memberIds: [users.alice.id],
    });
    renderApp(`/teams/${other.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Design'});
    for (const name of [/rename team/i, /delete team/i, /remove/i]) {
      expect(screen.queryByRole('button', {name})).toBeNull();
    }
  });
});
