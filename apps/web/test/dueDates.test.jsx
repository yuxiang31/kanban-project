/**
 * @fileoverview Board due dates and member counts: on the board list (with
 * the nearest-due-date order), in the new-board dialog and on the board.
 */

import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {users} from './fakeApi.js';
import {createFakeApi} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
let fetch;
beforeEach(() => {
  // Only Date is faked, so timers (and userEvent) behave normally.
  vi.useFakeTimers({toFake: ['Date'], now: new Date(2026, 10, 17, 9, 0)});
  api = createFakeApi();
  fetch = mockFetch(loggedInAsAlice, api.handle);
});
afterEach(() => vi.useRealTimers());

const lastBody = (method, urlPart) => {
  const call = fetch.mock.calls
    .filter(([url, init]) => url.includes(urlPart) && init?.method === method)
    .at(-1);
  return JSON.parse(call[1].body);
};

const cardNames = () =>
  [...document.querySelectorAll('.board-card-name')].map((n) => n.textContent);

describe('board cards', () => {
  it('show how many people are involved and the due date', async () => {
    const team = api.seedTeam('Core', {
      memberIds: [users.bob.id, users.carol.id],
    });
    const launch = api.seedBoard('Launch', undefined, {
      teamId: team.id,
      dueDate: '2026-11-20',
    });
    api.addTask(launch.stages[0].id, 'One');
    api.seedBoard('Errands');
    renderApp('/');

    const card = await screen.findByRole('link', {name: /launch/i});
    expect(within(card).getByText('3 members · 1 task')).toBeVisible();
    const due = within(card).getByText(/due 20 nov 2026/i);
    expect(due).toHaveTextContent('Due 20 Nov 2026 · in 3 days');
    expect(due).toHaveAttribute('data-tone', 'soon');

    const errands = screen.getByRole('link', {name: /errands/i});
    expect(within(errands).getByText('1 member · 0 tasks')).toBeVisible();
    expect(errands.querySelector('.due-badge')).toBeNull();
  });

  it('mark overdue boards', async () => {
    api.seedBoard('Late', undefined, {dueDate: '2026-11-15'});
    renderApp('/');
    const card = await screen.findByRole('link', {name: /late/i});
    expect(within(card).getByText(/due 15 nov 2026/i)).toHaveAttribute(
      'data-tone',
      'overdue',
    );
    expect(card).toHaveTextContent('2 days overdue');
  });
});

describe('ordering by nearest due date', () => {
  beforeEach(() => {
    const team = api.seedTeam('Core');
    // seedBoard puts each new board first, like the server's newest-first.
    api.seedBoard('Someday');
    api.seedBoard('Next year', undefined, {dueDate: '2027-06-01'});
    api.seedBoard('Team soon', undefined, {
      teamId: team.id,
      dueDate: '2026-11-19',
    });
    api.seedBoard('Overdue', undefined, {dueDate: '2026-11-10'});
    api.seedBoard('This week', undefined, {dueDate: '2026-11-21'});
  });

  it('is off by default: newest first, grouped by team', async () => {
    renderApp('/');
    await screen.findByRole('link', {name: /this week/i});
    expect(screen.getByRole('button', {name: 'Newest'})).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(cardNames()).toEqual([
      'This week',
      'Overdue',
      'Next year',
      'Someday',
      'Team soon',
    ]);
  });

  it('lists every board by due date, nearest first, undated last', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await screen.findByRole('link', {name: /this week/i});
    await user.click(screen.getByRole('button', {name: 'Nearest due date'}));

    expect(
      screen.getByRole('button', {name: 'Nearest due date'}),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(cardNames()).toEqual([
      'Overdue',
      'Team soon',
      'This week',
      'Next year',
      'Someday',
    ]);
    // One list across teams, so team boards say which team they belong to.
    expect(
      screen.getByRole('heading', {name: 'All boards by due date'}),
    ).toBeVisible();
    expect(
      within(screen.getByRole('link', {name: /team soon/i})).getByText('Core'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', {name: 'Newest'}));
    expect(cardNames()[0]).toBe('This week');
  });

  it('is remembered in the address', async () => {
    renderApp('/?sort=due');
    await screen.findByRole('link', {name: /this week/i});
    expect(cardNames()[0]).toBe('Overdue');
  });
});

describe('setting a due date', () => {
  it('can be done when the board is created', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    const dialog = screen.getByRole('dialog', {name: /new board/i});
    await user.type(within(dialog).getByLabelText(/board name/i), 'Launch');
    await user.type(within(dialog).getByLabelText(/due date/i), '2026-12-01');
    await user.click(within(dialog).getByRole('button', {name: /^create$/i}));
    expect(await screen.findByText(/due 1 dec 2026/i)).toBeVisible();
    expect(lastBody('POST', '/api/boards')).toEqual({
      name: 'Launch',
      dueDate: '2026-12-01',
    });
    // Types two fields and navigates; allow for a busy full-suite run.
  }, 10_000);

  it('can be set, changed and removed on the board', async () => {
    const board = api.seedBoard('Launch');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', {name: 'Set due date'}));
    // Only one change at a time, as with the description.
    expect(screen.getByRole('button', {name: 'Rename board'})).toBeDisabled();
    await user.type(screen.getByLabelText('Due date'), '2026-11-30');
    await user.click(screen.getByRole('button', {name: 'Save due date'}));

    expect(await screen.findByText(/due 30 nov 2026/i)).toHaveTextContent(
      'Due 30 Nov 2026 · in 13 days',
    );
    expect(lastBody('PATCH', `/api/boards/${board.id}`)).toEqual({
      dueDate: '2026-11-30',
    });
    expect(screen.getByRole('button', {name: 'Rename board'})).toBeEnabled();

    await user.click(screen.getByRole('button', {name: 'Change due date'}));
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-11-30');
    await user.click(screen.getByRole('button', {name: 'Remove due date'}));
    await waitFor(() =>
      expect(screen.queryByText(/due 30 nov/i)).not.toBeInTheDocument(),
    );
    expect(lastBody('PATCH', `/api/boards/${board.id}`)).toEqual({
      dueDate: null,
    });
    expect(screen.getByRole('button', {name: 'Set due date'})).toBeVisible();
  });

  it('can be cancelled with Escape', async () => {
    const board = api.seedBoard('Launch', undefined, {dueDate: '2026-12-24'});
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: 'Change due date'}),
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument();
    expect(screen.getByText(/due 24 dec 2026/i)).toBeVisible();
  });

  it('keeps the form open with the error when saving fails', async () => {
    const board = api.seedBoard('Launch');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: 'Set due date'}));
    await user.type(screen.getByLabelText('Due date'), '2026-11-30');
    api.failNext(`PATCH /api/boards/${board.id}`, 400, 'Not allowed.');
    await user.click(screen.getByRole('button', {name: 'Save due date'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed.');
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-11-30');
  });
});
