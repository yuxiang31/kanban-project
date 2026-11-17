import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {createFakeApi} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
beforeEach(() => {
  api = createFakeApi();
  mockFetch(loggedInAsAlice, api.handle);
});

/** @return {!HTMLElement} The stage region with the given name. */
const stage = (name) => screen.getByRole('region', {name});
const taskTitles = (stageName) =>
  within(stage(stageName))
    .queryAllByRole('button', {name: /^open task/i})
    .map((b) => b.textContent);

describe('board list', () => {
  it('shows an empty state', async () => {
    renderApp('/');
    expect(await screen.findByText(/no boards yet/i)).toBeInTheDocument();
  });

  it('lists boards with task counts and links', async () => {
    const board = api.seedBoard('Launch');
    api.addTask(board.stages[0].id, 'One');
    api.seedBoard('Empty');
    renderApp('/');
    const link = await screen.findByRole('link', {name: /launch/i});
    expect(link).toHaveAttribute('href', `/boards/${board.id}`);
    expect(link).toHaveTextContent('1 task');
    expect(screen.getByRole('link', {name: /empty/i})).toHaveTextContent(
      '0 tasks',
    );
  });

  it('creates a board and opens it', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    const dialog = screen.getByRole('dialog', {name: /new board/i});
    const create = within(dialog).getByRole('button', {name: /create/i});
    expect(create).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/board name/i), 'Roadmap');
    await user.click(create);
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Roadmap'}),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('region').map((r) => r.getAttribute('aria-label')),
    ).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('closes the dialog with Escape and returns focus', async () => {
    renderApp('/');
    const user = userEvent.setup();
    const open = await screen.findByRole('button', {name: /new board/i});
    await user.click(open);
    expect(screen.getByLabelText(/board name/i)).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(open).toHaveFocus();
  });

  it('keeps focus inside the dialog and closes on backdrop click', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    const dialog = screen.getByRole('dialog');
    await user.type(screen.getByLabelText(/board name/i), 'X');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement);
    await user.tab({shift: true});
    await user.tab({shift: true});
    await user.tab({shift: true});
    expect(dialog).toContainElement(document.activeElement);
    await user.click(dialog.parentElement);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows an error if creating fails', async () => {
    api.failNext('POST /api/boards', 500, 'Could not save.');
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    await user.type(screen.getByLabelText(/board name/i), 'Roadmap');
    await user.click(screen.getByRole('button', {name: /create/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save.',
    );
  });

  it('shows an error if the list fails to load', async () => {
    api.failNext('GET /api/boards', 500, 'List broke.');
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('List broke.');
  });
});

describe('board page', () => {
  let board;
  beforeEach(() => {
    board = api.seedBoard('Launch');
    api.addTask(board.stages[0].id, 'Write spec', 'The why');
    api.addTask(board.stages[0].id, 'Review spec');
    api.addTask(board.stages[1].id, 'Build it');
  });
  const openBoard = async () => {
    renderApp(`/boards/${board.id}`);
    await screen.findByRole('heading', {level: 1, name: 'Launch'});
    return userEvent.setup();
  };

  it('shows stages with their tasks in order', async () => {
    await openBoard();
    expect(taskTitles('To Do')).toEqual(['Write spec', 'Review spec']);
    expect(taskTitles('In Progress')).toEqual(['Build it']);
    expect(taskTitles('Done')).toEqual([]);
    expect(within(stage('To Do')).getByText('2')).toBeInTheDocument();
  });

  it('shows not found for a missing board', async () => {
    renderApp('/boards/999');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(screen.getByRole('link', {name: /back to boards/i})).toBeVisible();
  });

  it('adds a task to a stage and keeps the form open', async () => {
    const user = await openBoard();
    await user.click(
      within(stage('Done')).getByRole('button', {name: /add task/i}),
    );
    const input = within(stage('Done')).getByLabelText(/task title/i);
    await user.type(input, 'Ship it{Enter}');
    await waitFor(() => expect(taskTitles('Done')).toEqual(['Ship it']));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(within(stage('Done')).queryByLabelText(/task title/i)).toBeNull();
  });

  it('shows an error when adding a task fails', async () => {
    api.failNext(`POST /api/boards/${board.id}/tasks`, 500, 'Task failed.');
    const user = await openBoard();
    await user.click(
      within(stage('Done')).getByRole('button', {name: /add task/i}),
    );
    await user.type(
      within(stage('Done')).getByLabelText(/task title/i),
      'Ship it{Enter}',
    );
    expect(await within(stage('Done')).findByRole('alert')).toHaveTextContent(
      'Task failed.',
    );
  });

  it('edits a task in the dialog', async () => {
    const user = await openBoard();
    await user.click(
      screen.getByRole('button', {name: /open task write spec/i}),
    );
    const dialog = screen.getByRole('dialog', {name: /edit task/i});
    const title = within(dialog).getByLabelText(/title/i);
    expect(within(dialog).getByLabelText(/description/i)).toHaveValue(
      'The why',
    );
    await user.clear(title);
    await user.type(title, 'Write the spec');
    await user.type(within(dialog).getByLabelText(/description/i), '!');
    await user.click(within(dialog).getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(taskTitles('To Do')).toEqual(['Write the spec', 'Review spec']);
    expect(
      api.state.tasks.find((t) => t.title === 'Write the spec').description,
    ).toBe('The why!');
  });

  it('shows an error when saving a task fails', async () => {
    const user = await openBoard();
    const task = api.state.tasks[0];
    api.failNext(`PATCH /api/tasks/${task.id}`, 400, 'Too long.');
    await user.click(
      screen.getByRole('button', {name: /open task write spec/i}),
    );
    await user.click(screen.getByRole('button', {name: /save/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too long.');
  });

  it('deletes a task after confirmation', async () => {
    const user = await openBoard();
    await user.click(
      screen.getByRole('button', {name: /open task review spec/i}),
    );
    await user.click(screen.getByRole('button', {name: /delete task/i}));
    const confirm = screen.getByRole('alertdialog', {name: /delete task/i});
    expect(confirm).toHaveTextContent('Review spec');
    expect(
      within(confirm).getByRole('button', {name: /cancel/i}),
    ).toHaveFocus();
    await user.click(within(confirm).getByRole('button', {name: /^delete$/i}));
    await waitFor(() => expect(taskTitles('To Do')).toEqual(['Write spec']));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the task when deletion is cancelled', async () => {
    const user = await openBoard();
    await user.click(
      screen.getByRole('button', {name: /open task review spec/i}),
    );
    await user.click(screen.getByRole('button', {name: /delete task/i}));
    await user.click(screen.getByRole('button', {name: /cancel/i}));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog', {name: /edit task/i})).toBeVisible();
  });

  it('adds a stage at the end', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /add stage/i}));
    await user.type(screen.getByLabelText(/new stage name/i), 'Review{Enter}');
    expect(await screen.findByRole('region', {name: 'Review'})).toBeVisible();
    expect(screen.getAllByRole('region').at(-1)).toHaveAccessibleName('Review');
  });

  it('renames a stage inline', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /rename stage to do/i}));
    const input = screen.getByLabelText(/stage name/i);
    await user.clear(input);
    await user.type(input, 'Backlog{Enter}');
    expect(await screen.findByRole('region', {name: 'Backlog'})).toBeVisible();
  });

  it('cancels a stage rename with Escape', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /rename stage to do/i}));
    await user.type(screen.getByLabelText(/stage name/i), 'zzz{Escape}');
    expect(stage('To Do')).toBeVisible();
  });

  it('moves stages left and right', async () => {
    const user = await openBoard();
    const order = () =>
      screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
    expect(
      screen.getByRole('button', {name: /move to do left/i}),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {name: /move done right/i}),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', {name: /move done left/i}));
    await waitFor(() =>
      expect(order()).toEqual(['To Do', 'Done', 'In Progress']),
    );
    await user.click(screen.getByRole('button', {name: /move to do right/i}));
    await waitFor(() =>
      expect(order()).toEqual(['Done', 'To Do', 'In Progress']),
    );
  });

  it('deletes a stage after confirming, mentioning its tasks', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /delete stage to do/i}));
    const confirm = screen.getByRole('alertdialog');
    expect(confirm).toHaveTextContent(/2 tasks/);
    await user.click(within(confirm).getByRole('button', {name: /^delete$/i}));
    await waitFor(() =>
      expect(screen.queryByRole('region', {name: 'To Do'})).toBeNull(),
    );
  });

  it('shows a board-level error when a stage action fails', async () => {
    const user = await openBoard();
    api.failNext(
      'DELETE /api/stages/',
      400,
      'A board needs at least one stage.',
    );
    await user.click(screen.getByRole('button', {name: /delete stage done/i}));
    await user.click(screen.getByRole('button', {name: /^delete$/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least one/);
  });

  it('renames the board', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /rename board/i}));
    const input = screen.getByLabelText(/board name/i);
    await user.clear(input);
    await user.type(input, 'Launch v2{Enter}');
    expect(
      await screen.findByRole('heading', {level: 1, name: 'Launch v2'}),
    ).toBeVisible();
  });

  it('deletes the board and returns to the list', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /delete board/i}));
    const confirm = screen.getByRole('alertdialog');
    expect(confirm).toHaveTextContent('Launch');
    await user.click(within(confirm).getByRole('button', {name: /^delete$/i}));
    expect(
      await screen.findByRole('heading', {name: /your boards/i}),
    ).toBeVisible();
    expect(screen.getByText(/no boards yet/i)).toBeVisible();
  });

  it('keeps the confirm dialog open with an error if deleting fails', async () => {
    const user = await openBoard();
    api.failNext(`DELETE /api/boards/${board.id}`, 500, 'Delete failed.');
    await user.click(screen.getByRole('button', {name: /delete board/i}));
    const confirm = screen.getByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', {name: /^delete$/i}));
    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'Delete failed.',
    );
    expect(
      within(confirm).getByRole('button', {name: /^delete$/i}),
    ).toBeEnabled();
  });
});
