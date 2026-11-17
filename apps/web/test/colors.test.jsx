import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {createFakeApi} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
let fetch;
beforeEach(() => {
  api = createFakeApi();
  fetch = mockFetch(loggedInAsAlice, api.handle);
});

const lastBody = (method, urlPart) => {
  const call = fetch.mock.calls
    .filter(([url, init]) => url.includes(urlPart) && init?.method === method)
    .at(-1);
  return JSON.parse(call[1].body);
};

describe('task colours', () => {
  let board;
  let task;
  beforeEach(() => {
    board = api.seedBoard('Launch');
    task = api.addTask(board.stages[0].id, 'Write spec');
  });

  async function openTask() {
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: /open task write spec/i}),
    );
    return {user, dialog: screen.getByRole('dialog', {name: /edit task/i})};
  }

  it('offers none plus the seven palette colours', async () => {
    const {dialog} = await openTask();
    const group = within(dialog).getByRole('radiogroup', {name: 'Colour'});
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label')),
    ).toEqual([
      'None',
      'Sage',
      'Sky',
      'Lilac',
      'Rose',
      'Sand',
      'Peach',
      'Slate',
    ]);
    expect(within(group).getByRole('radio', {name: 'None'})).toBeChecked();
  });

  it('gives a task a colour, shown as a stripe and in its name', async () => {
    const {user, dialog} = await openTask();
    await user.click(within(dialog).getByRole('radio', {name: 'Sky'}));
    await user.click(within(dialog).getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(lastBody('PATCH', `/tasks/${task.id}`).color).toBe('sky');
    const card = screen.getByRole('button', {name: /open task write spec/i});
    expect(card).toHaveAttribute('data-color', 'sky');
    expect(card).toHaveAccessibleName('Open task Write spec, colour sky');
  });

  it('clears a colour with None', async () => {
    task.color = 'rose';
    const {user, dialog} = await openTask();
    expect(within(dialog).getByRole('radio', {name: 'Rose'})).toBeChecked();
    await user.click(within(dialog).getByRole('radio', {name: 'None'}));
    await user.click(within(dialog).getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(lastBody('PATCH', `/tasks/${task.id}`).color).toBeNull();
    expect(
      screen.getByRole('button', {name: /open task write spec/i}),
    ).not.toHaveAttribute('data-color');
  });
});

describe('board colours', () => {
  it('picks a colour when creating a board', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    const dialog = screen.getByRole('dialog', {name: /new board/i});
    await user.type(within(dialog).getByLabelText(/board name/i), 'Roadmap');
    await user.click(within(dialog).getByRole('radio', {name: 'Lilac'}));
    await user.click(within(dialog).getByRole('button', {name: /^create$/i}));
    await screen.findByRole('heading', {level: 1, name: 'Roadmap'});
    expect(lastBody('POST', '/api/boards')).toEqual({
      name: 'Roadmap',
      color: 'lilac',
    });
  });

  it('shows a board’s colour on its card in the list', async () => {
    api.seedBoard('Coloured', undefined, {color: 'sage'});
    api.seedBoard('Plain');
    renderApp('/');
    expect(
      await screen.findByRole('link', {name: /coloured/i}),
    ).toHaveAttribute('data-color', 'sage');
    expect(screen.getByRole('link', {name: /plain/i})).not.toHaveAttribute(
      'data-color',
    );
  });

  it('changes a board’s colour from the board page', async () => {
    const board = api.seedBoard('Launch');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: 'Board colour'}));
    const dialog = screen.getByRole('dialog', {name: 'Board colour'});
    await user.click(within(dialog).getByRole('radio', {name: 'Peach'}));
    await user.click(within(dialog).getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(lastBody('PATCH', `/boards/${board.id}`)).toEqual({color: 'peach'});
    expect(api.state.boards[0].color).toBe('peach');
    await waitFor(() =>
      expect(document.querySelector('.board-color-dot')).toHaveAttribute(
        'data-color',
        'peach',
      ),
    );
  });

  it('keeps the colour dialog open with the error if saving fails', async () => {
    const board = api.seedBoard('Launch');
    api.failNext(`PATCH /api/boards/${board.id}`, 500, 'Could not save.');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: 'Board colour'}));
    await user.click(screen.getByRole('radio', {name: 'Sky'}));
    await user.click(screen.getByRole('button', {name: /save/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save.',
    );
    expect(screen.getByRole('dialog', {name: 'Board colour'})).toBeVisible();
  });
});
