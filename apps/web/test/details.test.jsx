/**
 * @fileoverview Task description previews, board descriptions and stage
 * colours.
 */

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

describe('task description preview', () => {
  it('shows the start of the description on the card', async () => {
    const board = api.seedBoard('Launch');
    api.addTask(
      board.stages[0].id,
      'Write spec',
      'Cover pricing,\n\nlimits and   the rollout plan.',
    );
    api.addTask(board.stages[0].id, 'No details');
    renderApp(`/boards/${board.id}`);
    const card = await screen.findByRole('button', {
      name: /open task write spec/i,
    });
    // Whitespace and line breaks are collapsed into one readable line.
    expect(
      within(card).getByText('Cover pricing, limits and the rollout plan.'),
    ).toHaveClass('task-desc');
    expect(
      screen
        .getByRole('button', {name: /open task no details/i})
        .querySelector('.task-desc'),
    ).toBeNull();
  });
});

describe('board description', () => {
  it('can be given when the board is created', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', {name: /new board/i}));
    const dialog = screen.getByRole('dialog', {name: /new board/i});
    await user.type(within(dialog).getByLabelText(/board name/i), 'Hiring');
    await user.type(
      within(dialog).getByLabelText(/what is this board for/i),
      'Candidates for the two backend roles',
    );
    await user.click(within(dialog).getByRole('button', {name: /^create$/i}));
    expect(
      await screen.findByText('Candidates for the two backend roles'),
    ).toBeVisible();
    expect(lastBody('POST', '/api/boards')).toEqual({
      name: 'Hiring',
      description: 'Candidates for the two backend roles',
    });
  });

  it('shows on the board card in the list', async () => {
    api.seedBoard('Hiring', undefined, {description: 'Two backend roles'});
    renderApp('/');
    const link = await screen.findByRole('link', {name: /hiring/i});
    expect(within(link).getByText('Two backend roles')).toBeVisible();
  });

  it('can be added from the board page', async () => {
    const board = api.seedBoard('Launch');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: 'Add description'}),
    );
    const field = screen.getByLabelText('Board description');
    expect(field).toHaveFocus();
    await user.type(field, 'Everything needed to ship v2');
    await user.click(screen.getByRole('button', {name: 'Save'}));
    expect(
      await screen.findByText('Everything needed to ship v2'),
    ).toBeVisible();
    expect(lastBody('PATCH', `/boards/${board.id}`)).toEqual({
      description: 'Everything needed to ship v2',
    });
    expect(
      screen.getByRole('button', {name: 'Edit description'}),
    ).toBeVisible();
  });

  it('can be edited, cancelled with Escape, and cleared', async () => {
    const board = api.seedBoard('Launch', undefined, {description: 'Old text'});
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: 'Edit description'}),
    );
    const field = screen.getByLabelText('Board description');
    expect(field).toHaveValue('Old text');
    await user.type(field, ' and more{Escape}');
    expect(screen.getByText('Old text')).toBeVisible();

    await user.click(screen.getByRole('button', {name: 'Edit description'}));
    await user.clear(screen.getByLabelText('Board description'));
    await user.click(screen.getByRole('button', {name: 'Save'}));
    expect(
      await screen.findByRole('button', {name: 'Add description'}),
    ).toBeVisible();
    expect(api.state.boards[0].description).toBe('');
  });

  it('shows why saving failed and keeps the text', async () => {
    const board = api.seedBoard('Launch');
    api.failNext(`PATCH /api/boards/${board.id}`, 400, 'Too long.');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: 'Add description'}),
    );
    await user.type(screen.getByLabelText('Board description'), 'Draft');
    await user.click(screen.getByRole('button', {name: 'Save'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too long.');
    expect(screen.getByLabelText('Board description')).toHaveValue('Draft');
  });
});

describe('stage colours', () => {
  it('sets a stage colour, shown as an outline on the column', async () => {
    const board = api.seedBoard('Launch');
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: 'Colour for stage Done'}),
    );
    const dialog = screen.getByRole('dialog', {name: 'Colour for Done'});
    await user.click(within(dialog).getByRole('radio', {name: 'Sage'}));
    await user.click(within(dialog).getByRole('button', {name: 'Save'}));
    await waitFor(() =>
      expect(screen.getByRole('region', {name: 'Done'})).toHaveAttribute(
        'data-color',
        'sage',
      ),
    );
    expect(lastBody('PATCH', '/api/stages/')).toEqual({color: 'sage'});
    expect(screen.getByRole('region', {name: 'To Do'})).not.toHaveAttribute(
      'data-color',
    );
  });

  it('clears a stage colour', async () => {
    const board = api.seedBoard('Launch');
    api.state.stages.find((s) => s.name === 'Done').color = 'rose';
    renderApp(`/boards/${board.id}`);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {name: 'Colour for stage Done'}),
    );
    expect(screen.getByRole('radio', {name: 'Rose'})).toBeChecked();
    await user.click(screen.getByRole('radio', {name: 'None'}));
    await user.click(screen.getByRole('button', {name: 'Save'}));
    await waitFor(() =>
      expect(screen.getByRole('region', {name: 'Done'})).not.toHaveAttribute(
        'data-color',
      ),
    );
  });
});
