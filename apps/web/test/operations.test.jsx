/**
 * @fileoverview "One change at a time": while a task is being added or
 * something is being renamed, every other way to change the board waits.
 */

import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {createFakeApi} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
let board;
beforeEach(() => {
  api = createFakeApi();
  mockFetch(loggedInAsAlice, api.handle);
  board = api.seedBoard('Launch');
  api.addTask(board.stages[0].id, 'Write spec');
});

async function openBoard() {
  renderApp(`/boards/${board.id}`);
  await screen.findByRole('heading', {level: 1, name: 'Launch'});
  return userEvent.setup();
}
const stage = (name) => screen.getByRole('region', {name});
const button = (name) => screen.getByRole('button', {name});

/** Every control that would change the board while something else is open. */
const otherChanges = () => [
  button(/rename stage to do/i),
  button(/rename stage done/i),
  button(/move in progress left/i),
  button(/delete stage done/i),
  button(/drag stage to do/i),
  button(/colour for stage done/i),
  within(stage('Done')).getByRole('button', {name: /add task/i}),
  button(/add stage/i),
  button('Rename board'),
  button('Board colour'),
  button('Delete board'),
  button(/description/i),
];

describe('one change at a time', () => {
  it('pauses other changes while a task is being added', async () => {
    const user = await openBoard();
    for (const control of otherChanges()) {
      expect(control).toBeEnabled();
    }
    await user.click(
      within(stage('In Progress')).getByRole('button', {name: /add task/i}),
    );
    for (const control of otherChanges()) {
      expect(
        control,
        control.getAttribute('aria-label') ?? control.textContent,
      ).toBeDisabled();
    }
    expect(
      screen.getByText('Finish or cancel the current change first.'),
    ).toBeVisible();

    // The open form itself still works, and closing it releases the lock.
    await user.type(
      within(stage('In Progress')).getByLabelText(/task title/i),
      'Build it{Enter}',
    );
    await waitFor(() =>
      expect(
        within(stage('In Progress')).getByRole('button', {
          name: /open task build it/i,
        }),
      ).toBeVisible(),
    );
    await user.keyboard('{Escape}');
    for (const control of otherChanges()) {
      expect(control).toBeEnabled();
    }
    expect(
      screen.queryByText('Finish or cancel the current change first.'),
    ).toBeNull();
  });

  it('does not open a task while a task is being added', async () => {
    const user = await openBoard();
    await user.click(
      within(stage('Done')).getByRole('button', {name: /add task/i}),
    );
    const card = button(/open task write spec/i);
    expect(card).toHaveAttribute('aria-disabled', 'true');
    await user.click(card);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('pauses adding tasks while a stage is being renamed', async () => {
    const user = await openBoard();
    await user.click(button(/rename stage to do/i));
    for (const name of ['To Do', 'In Progress', 'Done']) {
      // The renamed stage shows a form instead of its header.
      const add = within(
        screen
          .getAllByRole('region')
          .find((r) => r.getAttribute('aria-label') === name),
      ).getByRole('button', {name: /add task/i});
      expect(add).toBeDisabled();
    }
    await user.keyboard('{Escape}');
    expect(
      within(stage('Done')).getByRole('button', {name: /add task/i}),
    ).toBeEnabled();
  });

  it('pauses stage changes while the board is being renamed', async () => {
    const user = await openBoard();
    await user.click(button('Rename board'));
    expect(button(/rename stage to do/i)).toBeDisabled();
    expect(button(/add stage/i)).toBeDisabled();
    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(button(/rename stage to do/i)).toBeEnabled();
  });

  it('releases the lock when a stage is renamed successfully', async () => {
    const user = await openBoard();
    await user.click(button(/rename stage done/i));
    const input = screen.getByLabelText(/stage name/i);
    await user.clear(input);
    await user.type(input, 'Shipped{Enter}');
    await screen.findByRole('region', {name: 'Shipped'});
    expect(button(/add stage/i)).toBeEnabled();
  });
});
