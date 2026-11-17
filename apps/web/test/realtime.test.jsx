import {act, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {createFakeApi} from './fakeApi.js';
import {FakeWebSocket} from './fakeSocket.js';
import {loggedInAsAlice, mockFetch, renderApp} from './utils.jsx';

let api;
let board;
beforeEach(() => {
  api = createFakeApi();
  mockFetch(loggedInAsAlice, api.handle);
  board = api.seedBoard('Launch');
});

async function openBoard() {
  renderApp(`/boards/${board.id}`);
  await screen.findByRole('heading', {level: 1, name: 'Launch'});
  await waitFor(() => expect(FakeWebSocket.latest).toBeDefined());
  act(() => FakeWebSocket.latest.open());
}

const send = (type, payload = {}) =>
  act(() =>
    FakeWebSocket.latest.receive({
      type,
      boardId: board.id,
      actorId: 2,
      origin: 'bobs-tab',
      payload,
    }),
  );

describe('live board', () => {
  it('shows that the board is live', async () => {
    await openBoard();
    expect(screen.getByText(/live/i)).toBeVisible();
  });

  it('shows changes made by someone else', async () => {
    await openBoard();
    api.addTask(board.stages[0].id, 'Added by Bob');
    send('task.created');
    expect(
      await screen.findByRole('button', {name: /open task added by bob/i}),
    ).toBeVisible();
  });

  it('shows a reconnecting state when the connection drops', async () => {
    await openBoard();
    act(() => FakeWebSocket.latest.serverClose(1006));
    expect(screen.getByText(/reconnecting/i)).toBeVisible();
  });

  it('leaves with a notice when someone deletes the board', async () => {
    await openBoard();
    send('board.deleted', {boardId: board.id, actorName: 'Bob'});
    expect(
      await screen.findByRole('heading', {name: /your boards/i}),
    ).toBeVisible();
    expect(screen.getByText('“Launch” was deleted by Bob.')).toBeVisible();
  });

  it('leaves with a notice when access is lost', async () => {
    await openBoard();
    act(() => FakeWebSocket.latest.serverClose(4403));
    expect(
      await screen.findByRole('heading', {name: /your boards/i}),
    ).toBeVisible();
    expect(
      screen.getByText('You no longer have access to “Launch”.'),
    ).toBeVisible();
  });

  it('lets the notice be dismissed', async () => {
    await openBoard();
    send('board.deleted', {boardId: board.id, actorName: 'Bob'});
    const dismiss = await screen.findByRole('button', {name: /dismiss/i});
    act(() => dismiss.click());
    expect(screen.queryByText(/was deleted by/)).toBeNull();
  });
});
