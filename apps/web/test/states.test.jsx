/**
 * @fileoverview Loading, empty, error, success and permission states from
 * design/contract.md.
 */

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

describe('loading', () => {
  it('shows skeleton boards while the list loads', async () => {
    renderApp('/');
    expect(await screen.findByText('Loading boards…')).toHaveAttribute(
      'role',
      'status',
    );
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    await screen.findByText(/no boards yet/i);
    expect(document.querySelector('.skeleton')).toBeNull();
  });
});

describe('empty', () => {
  it('offers to create the first board from the empty state', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: /create your first board/i}),
    );
    expect(screen.getByRole('dialog', {name: /new board/i})).toBeVisible();
  });

  it('says when a stage has no tasks', async () => {
    const board = api.seedBoard('Launch');
    api.addTask(board.stages[0].id, 'Only task');
    renderApp(`/boards/${board.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Launch'});
    expect(
      within(screen.getByRole('region', {name: 'Done'})).getByText(
        /no tasks yet/i,
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', {name: 'To Do'})).queryByText(
        /no tasks yet/i,
      ),
    ).toBeNull();
  });
});

describe('error', () => {
  it('lets the board list be retried', async () => {
    api.seedBoard('Launch');
    api.failNext('GET /api/boards', 500, 'List broke.');
    renderApp('/');
    const user = userEvent.setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('List broke.');
    await user.click(screen.getByRole('button', {name: /try again/i}));
    expect(await screen.findByRole('link', {name: /launch/i})).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('lets the team list be retried', async () => {
    api.seedTeam('Core');
    api.failNext('GET /api/teams', 500, 'Teams broke.');
    renderApp('/teams');
    const user = userEvent.setup();
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', {name: /try again/i}));
    expect(await screen.findByRole('link', {name: /core/i})).toBeVisible();
  });
});

describe('success', () => {
  it('confirms a board you deleted on the board list', async () => {
    const board = api.seedBoard('Launch');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: /delete board/i}),
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: /^delete$/i,
      }),
    );
    expect(await screen.findByText('“Launch” was deleted.')).toBeVisible();
  });
});

describe('permission', () => {
  it('tells members who manages the team', async () => {
    const team = api.seedTeam('Design', {
      ownerId: users.bob.id,
      memberIds: [users.alice.id],
    });
    renderApp(`/teams/${team.id}`);
    expect(
      await screen.findByText(
        'Only Bob (the owner) can add or remove members.',
      ),
    ).toBeVisible();
  });

  it('does not show that note to the owner', async () => {
    const team = api.seedTeam('Core');
    renderApp(`/teams/${team.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Core'});
    await waitFor(() =>
      expect(screen.queryByText(/can add or remove members/i)).toBeNull(),
    );
  });
});
