import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {boardKey} from '../src/features/boards/boardQueries.js';
import {useMoveStage, useMoveTask} from '../src/features/boards/useMoves.js';
import {mockFetch} from './utils.jsx';

const board = {
  id: 1,
  stages: [
    {id: 10, name: 'To Do', position: 1024},
    {id: 20, name: 'Doing', position: 2048},
  ],
  tasks: [{id: 1, stageId: 10, title: 'A', position: 1024}],
};

function setup(hook) {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  client.setQueryData(boardKey(1), board);
  const wrapper = ({children}) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {client, ...renderHook(() => hook(1), {wrapper})};
}

/** A fetch that waits until `release()` before answering. */
function deferredFetch(response) {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const fetch = mockFetch({}, () => undefined);
  fetch.mockImplementation(async () => {
    await gate;
    return new Response(JSON.stringify(response.body ?? {}), {
      status: response.status ?? 200,
    });
  });
  return {fetch, release};
}

describe('useMoveTask', () => {
  it('updates the cache before the server answers', async () => {
    const {release, fetch} = deferredFetch({body: {task: {}}});
    const {result, client} = setup(useMoveTask);
    act(() => {
      result.current.mutate({
        taskId: 1,
        stageId: 20,
        prevId: null,
        nextId: null,
      });
    });
    await waitFor(() =>
      expect(client.getQueryData(boardKey(1)).tasks[0].stageId).toBe(20),
    );
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/tasks/1');
    expect(JSON.parse(init.body)).toEqual({
      stageId: 20,
      prevId: null,
      nextId: null,
    });
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back when the server refuses', async () => {
    const {release} = deferredFetch({status: 400, body: {message: 'Nope.'}});
    const {result, client} = setup(useMoveTask);
    act(() => {
      result.current.mutate({
        taskId: 1,
        stageId: 20,
        prevId: null,
        nextId: null,
      });
    });
    await waitFor(() =>
      expect(client.getQueryData(boardKey(1)).tasks[0].stageId).toBe(20),
    );
    release();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(boardKey(1)).tasks[0].stageId).toBe(10);
    expect(result.current.error.message).toBe('Nope.');
  });
});

describe('useMoveStage', () => {
  it('reorders optimistically and rolls back on failure', async () => {
    const {release, fetch} = deferredFetch({status: 500, body: {message: 'x'}});
    const {result, client} = setup(useMoveStage);
    act(() => {
      result.current.mutate({stageId: 20, prevId: null, nextId: 10});
    });
    await waitFor(() =>
      expect(client.getQueryData(boardKey(1)).stages.map((s) => s.id)).toEqual([
        20, 10,
      ]),
    );
    expect(fetch.mock.calls[0][0]).toBe('/api/stages/20');
    release();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(boardKey(1)).stages.map((s) => s.id)).toEqual([
      10, 20,
    ]);
  });
});
