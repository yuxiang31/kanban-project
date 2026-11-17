import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {AvatarStack} from '../src/components/Avatar.jsx';
import {createFakeApi, users} from './fakeApi.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
let board;
let tasks;
beforeEach(() => {
  api = createFakeApi();
  mockFetch(loggedInAsAlice, api.handle);
  const team = api.seedTeam('Core', {
    memberIds: [users.bob.id, users.carol.id],
  });
  board = api.seedBoard('Launch', undefined, {teamId: team.id});
  tasks = {
    spec: api.addTask(board.stages[0].id, 'Write spec'),
    build: api.addTask(board.stages[0].id, 'Build it'),
    ship: api.addTask(board.stages[1].id, 'Ship it'),
  };
  tasks.spec.assigneeIds = [users.alice.id, users.bob.id];
  tasks.build.assigneeIds = [users.carol.id];
});

async function openBoard(query = '') {
  renderApp(`/boards/${board.id}${query}`);
  await screen.findByRole('heading', {level: 1, name: 'Launch'});
  return userEvent.setup();
}
const visibleTitles = () =>
  screen
    .queryAllByRole('button', {name: /^open task/i})
    .map((card) => card.getAttribute('aria-label'))
    .map((label) => label.replace(/^Open task /, '').replace(/,.*$/, ''));

describe('assignees on cards', () => {
  it('shows who handles each task', async () => {
    await openBoard();
    const card = screen.getByRole('button', {name: /open task write spec/i});
    expect(card).toHaveAccessibleName(
      'Open task Write spec, assigned to Alice and Bob',
    );
    expect(within(card).getByText('A')).toBeVisible();
    expect(within(card).getByText('B')).toBeVisible();
    expect(
      screen.getByRole('button', {name: 'Open task Ship it'}),
    ).toBeVisible();
  });

  it('shows up to three avatars, then collapses the rest', () => {
    const people = [1, 2, 3, 4].map((id) => ({id, displayName: `User ${id}`}));
    const {container, rerender} = render(
      <AvatarStack users={people.slice(0, 3)} />,
    );
    expect(container.querySelectorAll('.avatar')).toHaveLength(3);
    rerender(<AvatarStack users={people} />);
    // Initials of "User 1" and "User 2", then the two that do not fit.
    expect(container.textContent).toBe('U1U2+2');
    rerender(<AvatarStack users={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('assigning in the task dialog', () => {
  it('shows a long title in full and saves it with Enter', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /open task ship it/i}));
    const title = screen.getByRole('textbox', {name: 'Title'});
    expect(title.tagName).toBe('TEXTAREA');
    await user.clear(title);
    await user.type(title, 'Ship it to everyone{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tasks.ship.title).toBe('Ship it to everyone');
  });

  it('assigns and unassigns people', async () => {
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /open task ship it/i}));
    const dialog = screen.getByRole('dialog', {name: /edit task/i});
    const group = within(dialog).getByRole('group', {name: /assigned to/i});
    const boxes = within(group).getAllByRole('checkbox');
    ['Alice', 'Bob', 'Carol'].forEach((name, i) =>
      expect(boxes[i]).toHaveAccessibleName(name),
    );
    await user.click(within(group).getByRole('checkbox', {name: 'Carol'}));
    await user.click(within(group).getByRole('checkbox', {name: 'Bob'}));
    await user.click(within(dialog).getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tasks.ship.assigneeIds).toEqual([users.bob.id, users.carol.id]);
    expect(
      screen.getByRole('button', {name: /open task ship it/i}),
    ).toHaveAccessibleName('Open task Ship it, assigned to Bob and Carol');
  });

  it('pre-checks current assignees and can clear them', async () => {
    const user = await openBoard();
    await user.click(
      screen.getByRole('button', {name: /open task write spec/i}),
    );
    const group = screen.getByRole('group', {name: /assigned to/i});
    expect(within(group).getByRole('checkbox', {name: 'Alice'})).toBeChecked();
    expect(within(group).getByRole('checkbox', {name: 'Bob'})).toBeChecked();
    await user.click(within(group).getByRole('checkbox', {name: 'Alice'}));
    await user.click(within(group).getByRole('checkbox', {name: 'Bob'}));
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tasks.spec.assigneeIds).toEqual([]);
  });

  it('does not touch assignees when they did not change', async () => {
    const fetch = mockFetch(loggedInAsAlice, api.handle);
    const user = await openBoard();
    await user.click(
      screen.getByRole('button', {name: /open task write spec/i}),
    );
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/assignees'))).toBe(
      false,
    );
  });

  it('keeps the dialog open if assigning fails', async () => {
    api.failNext(
      `PUT /api/tasks/${tasks.ship.id}/assignees`,
      400,
      'Not on board.',
    );
    const user = await openBoard();
    await user.click(screen.getByRole('button', {name: /open task ship it/i}));
    await user.click(screen.getByRole('checkbox', {name: 'Bob'}));
    await user.click(screen.getByRole('button', {name: /save/i}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not on board.');
    expect(screen.getByRole('dialog')).toBeVisible();
  });
});

describe('filtering by person', () => {
  const filterBar = () =>
    screen.getByRole('group', {name: /filter by person/i});
  const chip = (name) => within(filterBar()).getByRole('button', {name});

  it('offers every member plus unassigned, nothing pressed', async () => {
    await openBoard();
    const chips = within(filterBar()).getAllByRole('button');
    expect(chips).toHaveLength(4);
    ['Alice', 'Bob', 'Carol', 'Unassigned'].forEach((name, i) =>
      expect(chips[i]).toHaveAccessibleName(name),
    );
    expect(chip('Bob')).toHaveAttribute('aria-pressed', 'false');
    expect(visibleTitles()).toEqual(['Write spec', 'Build it', 'Ship it']);
  });

  it('shows only the selected people’s tasks', async () => {
    const user = await openBoard();
    await user.click(chip('Bob'));
    expect(chip('Bob')).toHaveAttribute('aria-pressed', 'true');
    expect(visibleTitles()).toEqual(['Write spec']);
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeVisible();
    await user.click(chip('Carol'));
    expect(visibleTitles()).toEqual(['Write spec', 'Build it']);
  });

  it('can show unassigned tasks', async () => {
    const user = await openBoard();
    await user.click(chip('Unassigned'));
    expect(visibleTitles()).toEqual(['Ship it']);
  });

  it('clears the filter', async () => {
    const user = await openBoard();
    await user.click(chip('Carol'));
    await user.click(screen.getByRole('button', {name: /clear filter/i}));
    expect(visibleTitles()).toEqual(['Write spec', 'Build it', 'Ship it']);
    expect(screen.queryByText(/showing/i)).toBeNull();
  });

  it('restores the filter from the link', async () => {
    await openBoard(`?people=${users.carol.id}`);
    expect(chip('Carol')).toHaveAttribute('aria-pressed', 'true');
    expect(visibleTitles()).toEqual(['Build it']);
  });

  it('counts only visible tasks in each stage', async () => {
    const user = await openBoard();
    await user.click(chip('Carol'));
    const todo = screen.getByRole('region', {name: 'To Do'});
    expect(within(todo).getByText('1')).toBeVisible();
  });
});
