/**
 * @fileoverview Web test helpers: a route-table fetch mock and an app
 * renderer.
 */

import {render} from '@testing-library/react';
import {vi} from 'vitest';
import {AppProviders} from '../src/App.jsx';

/**
 * Replaces global fetch with a mock answering from a route table. Keys are
 * `"METHOD /api/path"`; values are `{status, body}` or a function of the
 * parsed request body returning one. Requests not in the table go to
 * `fallback(method, url, body)` if given; anything still unanswered is 404.
 * @param {!Object<string, (!Object|function(*): !Object)>} routes
 * @param {function(string, string, *): (!Object|undefined)=} fallback
 * @return {!Object} The vi.fn mock, for call assertions.
 */
export function mockFetch(routes, fallback) {
  const fn = vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const key = `${method} ${url}`;
    const body = init.body ? JSON.parse(init.body) : undefined;
    const handler = routes[key];
    const result = (typeof handler === 'function'
      ? handler(body)
      : (handler ?? fallback?.(method, url, body))) ?? {
      status: 404,
      body: {message: 'Not found'},
    };
    const status = result.status ?? 200;
    return new Response(
      status === 204 ? null : JSON.stringify(result.body ?? {}),
      {status, headers: {'Content-Type': 'application/json'}},
    );
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Route entry for a logged-out visitor. */
export const loggedOut = {
  'GET /api/auth/me': {status: 401, body: {message: 'Please log in.'}},
};

export const alice = {id: 1, username: 'alice', displayName: 'Alice'};

/** Route entry for a visitor logged in as alice. */
export const loggedInAsAlice = {
  'GET /api/auth/me': {body: {user: alice}},
};

/**
 * @param {string} path Initial URL.
 * @return {!Object} RTL render result.
 */
export function renderApp(path = '/') {
  return render(<AppProviders initialEntries={[path]} />);
}
