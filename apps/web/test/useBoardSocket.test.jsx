import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CLIENT_ID} from '../src/api/client.js';
import {boardKey, boardsKey} from '../src/features/boards/boardQueries.js';
import {useBoardSocket} from '../src/hooks/useBoardSocket.js';
import {FakeWebSocket} from './fakeSocket.js';

let client;
let handlers;
function setup(options = {}) {
  client = new QueryClient();
  vi.spyOn(client, 'invalidateQueries');
  handlers = {onBoardDeleted: vi.fn(), onAccessLost: vi.fn()};
  const wrapper = ({children}) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => useBoardSocket(7, {...handlers, retryDelay: () => 5, ...options}),
    {wrapper},
  );
}
const event = (type, extra = {}) => ({
  type,
  boardId: 7,
  actorId: 2,
  origin: 'other-tab',
  payload: {},
  ...extra,
});
const refetchedBoard = () =>
  client.invalidateQueries.mock.calls.some(
    ([filter]) =>
      JSON.stringify(filter.queryKey) === JSON.stringify(boardKey(7)),
  );

beforeEach(() => vi.clearAllMocks());

describe('useBoardSocket', () => {
  it('connects to the board on this host and reports when live', () => {
    const {result} = setup();
    const socket = FakeWebSocket.latest;
    expect(socket.url).toBe(`ws://${window.location.host}/ws/boards/7`);
    expect(result.current).toBe('connecting');
    act(() => socket.open());
    expect(result.current).toBe('live');
  });

  it('refreshes the board when someone else changes it', () => {
    setup();
    act(() => FakeWebSocket.latest.open());
    act(() => FakeWebSocket.latest.receive(event('task.created')));
    expect(refetchedBoard()).toBe(true);
  });

  it('also refreshes the board list for board-level changes', () => {
    setup();
    act(() => FakeWebSocket.latest.receive(event('board.updated')));
    expect(client.invalidateQueries).toHaveBeenCalledWith({
      queryKey: boardsKey,
      exact: true,
    });
  });

  it('skips echoes of this tab’s own changes', () => {
    setup();
    act(() =>
      FakeWebSocket.latest.receive(event('task.created', {origin: CLIENT_ID})),
    );
    expect(client.invalidateQueries).not.toHaveBeenCalled();
  });

  it('ignores malformed messages', () => {
    setup();
    act(() => FakeWebSocket.latest.onmessage({data: 'not json'}));
    expect(client.invalidateQueries).not.toHaveBeenCalled();
  });

  it('reports a deletion by someone else, once', () => {
    setup();
    const socket = FakeWebSocket.latest;
    act(() =>
      socket.receive(event('board.deleted', {payload: {actorName: 'Bob'}})),
    );
    act(() => socket.serverClose(4404));
    expect(handlers.onBoardDeleted).toHaveBeenCalledTimes(1);
    expect(handlers.onBoardDeleted).toHaveBeenCalledWith('Bob');
  });

  it('reports a deletion even if the event was missed', () => {
    setup();
    act(() => FakeWebSocket.latest.serverClose(4404));
    expect(handlers.onBoardDeleted).toHaveBeenCalledWith(null);
  });

  it('stays quiet when this tab deleted the board', () => {
    setup();
    const socket = FakeWebSocket.latest;
    act(() => socket.receive(event('board.deleted', {origin: CLIENT_ID})));
    act(() => socket.serverClose(4404));
    expect(handlers.onBoardDeleted).not.toHaveBeenCalled();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('reports lost access without reconnecting', () => {
    setup();
    act(() => FakeWebSocket.latest.serverClose(4403));
    expect(handlers.onAccessLost).toHaveBeenCalled();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('reconnects with backoff and catches up on what it missed', async () => {
    const retryDelay = vi.fn(() => 5);
    const {result} = setup({retryDelay});
    act(() => FakeWebSocket.latest.open());
    act(() => FakeWebSocket.latest.serverClose(1006));
    expect(result.current).toBe('reconnecting');
    expect(retryDelay).toHaveBeenCalledWith(0);

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    act(() => FakeWebSocket.latest.serverClose(1006));
    expect(retryDelay).toHaveBeenCalledWith(1);
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(3));

    act(() => FakeWebSocket.latest.open());
    expect(result.current).toBe('live');
    expect(refetchedBoard()).toBe(true);
  });

  it('closes cleanly on unmount and does not reconnect', async () => {
    const {unmount} = setup();
    const socket = FakeWebSocket.latest;
    act(() => socket.open());
    unmount();
    expect(socket.closedWith.code).toBe(1000);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('uses wss on https pages', async () => {
    const {socketUrl} = await import('../src/hooks/useBoardSocket.js');
    expect(socketUrl(3, {protocol: 'https:', host: 'kanban.example'})).toBe(
      'wss://kanban.example/ws/boards/3',
    );
  });

  it('backs off exponentially up to a cap', async () => {
    const {defaultRetryDelay} = await import('../src/hooks/useBoardSocket.js');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(defaultRetryDelay(0)).toBe(1000);
    expect(defaultRetryDelay(3)).toBe(8000);
    expect(defaultRetryDelay(20)).toBe(30000);
  });
});
