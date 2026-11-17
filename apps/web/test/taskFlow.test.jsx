/**
 * @fileoverview Adding a task opens it for details; the optional checklist
 * (a drop-down to-do list) inside the task dialog.
 */

import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {createFakeApi} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
let fetch;
let board;
beforeEach(() => {
  api = createFakeApi();
  fetch = mockFetch(loggedInAsAlice, api.handle);
  board = api.seedBoard('Launch');
});

const stage = (name) => screen.getByRole('region', {name});
const lastCall = (method, urlPart) =>
  fetch.mock.calls
    .filter(([url, init]) => url.includes(urlPart) && init?.method === method)
    .at(-1);

async function openBoard() {
  renderApp(`/boards/${board.id}`);
  await screen.findByRole('region', {name: 'To Do'});
  return userEvent.setup();
}

describe('adding a task', () => {
  it('opens the new task so its details can be filled in', async () => {
    const user = await openBoard();
    await user.click(
      within(stage('Done')).getByRole('button', {name: /add task/i}),
    );
    await user.type(
      within(stage('Done')).getByLabelText(/task title/i),
      'Ship it{Enter}',
    );

    const dialog = await screen.findByRole('dialog', {name: /edit task/i});
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Added to Done. Add the details now, or close to keep just the title.',
    );
    expect(within(dialog).getByLabelText(/^title/i)).toHaveValue('Ship it');
    // The quick-add form has closed, so nothing else is locked.
    expect(within(stage('Done')).queryByLabelText(/task title/i)).toBeNull();

    await user.type(
      within(dialog).getByLabelText(/description/i),
      'Tag the release',
    );
    await user.click(within(dialog).getByRole('button', {name: /^save$/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const card = within(stage('Done')).getByRole('button', {
      name: /open task ship it/i,
    });
    expect(card).toHaveTextContent('Tag the release');
    expect(screen.getByRole('button', {name: 'Rename board'})).toBeEnabled();
  });

  it('keeps the task with just its title when the dialog is closed', async () => {
    const user = await openBoard();
    await user.click(
      within(stage('Done')).getByRole('button', {name: /add task/i}),
    );
    await user.type(
      within(stage('Done')).getByLabelText(/task title/i),
      'Ship it{Enter}',
    );
    const dialog = await screen.findByRole('dialog', {name: /edit task/i});
    await user.click(within(dialog).getByRole('button', {name: /cancel/i}));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      within(stage('Done')).getByRole('button', {name: /open task ship it/i}),
    ).toBeVisible();
  });

  it('does not say "added" when an existing task is opened', async () => {
    api.addTask(board.stages[0].id, 'Old task');
    const user = await openBoard();
    await user.click(
      await screen.findByRole('button', {name: /open task old task/i}),
    );
    const dialog = screen.getByRole('dialog', {name: /edit task/i});
    expect(within(dialog).queryByText(/added to/i)).toBeNull();
  });
});

describe('task checklist on the card', () => {
  let task;
  beforeEach(() => {
    task = api.addTask(board.stages[0].id, 'Write post');
  });

  /** The whole card (open/drag area plus checklist) for a task title. */
  const card = (title) =>
    screen
      .getByRole('button', {name: new RegExp(`open task ${title}`, 'i')})
      .closest('.task-card');
  const toggle = (title = 'Write post') =>
    within(card(title)).getByRole('button', {name: /checklist/i});

  async function openBoardWithTask() {
    const user = await openBoard();
    await screen.findByRole('button', {name: /open task write post/i});
    return user;
  }

  it('is not in the task dialog', async () => {
    const user = await openBoardWithTask();
    await user.click(
      screen.getByRole('button', {name: /open task write post/i}),
    );
    const dialog = screen.getByRole('dialog', {name: /edit task/i});
    expect(
      within(dialog).queryByRole('button', {name: /checklist/i}),
    ).toBeNull();
    expect(within(dialog).queryByLabelText(/add a to-do/i)).toBeNull();
  });

  it('drops down from the card without opening the task', async () => {
    const user = await openBoardWithTask();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(card('Write post')).queryByLabelText(/add a to-do/i),
    ).toBeNull();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(card('Write post')).getByLabelText('Add a to-do to Write post'),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('adds to-dos with Enter, keeping the card open', async () => {
    const user = await openBoardWithTask();
    await user.click(toggle());
    const input = within(card('Write post')).getByLabelText(
      'Add a to-do to Write post',
    );
    await user.type(input, 'Draft{Enter}');
    await user.type(input, 'Get sign-off{Enter}');

    const list = within(card('Write post')).getByRole('list', {
      name: 'Checklist for Write post',
    });
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole('checkbox')
          .map((c) => c.closest('li').textContent),
      ).toEqual(['Draft', 'Get sign-off']),
    );
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(JSON.parse(lastCall('POST', '/checklist')[1].body)).toEqual({
      text: 'Get sign-off',
    });
  });

  it('ticks to-dos off, with progress on the toggle', async () => {
    api.addItem(task.id, 'Draft');
    api.addItem(task.id, 'Publish');
    const user = await openBoardWithTask();
    expect(toggle()).toHaveTextContent('0/2');
    expect(toggle()).toHaveAccessibleName(
      'Checklist for Write post, 0 of 2 done',
    );
    await user.click(toggle());
    await user.click(
      within(card('Write post')).getByRole('checkbox', {name: 'Draft'}),
    );
    await waitFor(() => expect(toggle()).toHaveTextContent('1/2'));
    expect(
      within(card('Write post')).getByRole('checkbox', {name: 'Draft'}),
    ).toBeChecked();
    expect(JSON.parse(lastCall('PATCH', '/api/checklist/')[1].body)).toEqual({
      done: true,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renames a to-do in place, and Escape cancels', async () => {
    api.addItem(task.id, 'Draft');
    const user = await openBoardWithTask();
    await user.click(toggle());
    const here = () => within(card('Write post'));
    await user.click(here().getByRole('button', {name: 'Edit to-do Draft'}));
    await user.type(here().getByLabelText('Edit to-do'), ' more{Escape}');
    expect(here().getByRole('checkbox', {name: 'Draft'})).toBeVisible();

    await user.click(here().getByRole('button', {name: 'Edit to-do Draft'}));
    const field = here().getByLabelText('Edit to-do');
    await user.clear(field);
    await user.type(field, 'Draft the post{Enter}');
    expect(
      await here().findByRole('checkbox', {name: 'Draft the post'}),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('deletes a to-do', async () => {
    api.addItem(task.id, 'Draft');
    api.addItem(task.id, 'Keep');
    const user = await openBoardWithTask();
    await user.click(toggle());
    await user.click(
      within(card('Write post')).getByRole('button', {
        name: 'Delete to-do Draft',
      }),
    );
    await waitFor(() =>
      expect(
        within(card('Write post')).queryByRole('checkbox', {name: 'Draft'}),
      ).toBeNull(),
    );
    expect(toggle()).toHaveTextContent('0/1');
  });

  it('shows the error and keeps the text when adding fails', async () => {
    const user = await openBoardWithTask();
    await user.click(toggle());
    api.failNext(`POST /api/tasks/${task.id}/checklist`, 400, 'Too many.');
    const input = within(card('Write post')).getByLabelText(
      'Add a to-do to Write post',
    );
    await user.type(input, 'Draft{Enter}');
    expect(
      await within(card('Write post')).findByRole('alert'),
    ).toHaveTextContent('Too many.');
    expect(input).toHaveValue('Draft');
  });

  it('is paused while another change is open on the board', async () => {
    api.addItem(task.id, 'Draft');
    const user = await openBoardWithTask();
    await user.click(toggle());
    await user.click(screen.getByRole('button', {name: 'Rename board'}));
    const here = within(card('Write post'));
    expect(here.getByRole('checkbox', {name: 'Draft'})).toBeDisabled();
    expect(here.getByLabelText('Add a to-do to Write post')).toBeDisabled();
    expect(
      here.getByRole('button', {name: 'Delete to-do Draft'}),
    ).toBeDisabled();
    // Looking is fine: the drop-down still folds and unfolds.
    expect(toggle()).toBeEnabled();
  });
});
