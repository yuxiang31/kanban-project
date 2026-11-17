/**
 * @fileoverview Test helpers: an app backed by an in-memory database and a
 * tiny client that keeps a user's auth cookie.
 */

import {buildApp} from '../src/app.js';

/**
 * @param {!Object=} overrides Extra buildApp options.
 * @return {!Promise<!Object>} A ready Fastify app backed by `:memory:`.
 */
export async function createTestApp(overrides = {}) {
  const app = await buildApp({
    dbPath: ':memory:',
    jwtSecret: 'test-secret',
    bcryptRounds: 4,
    ...overrides,
  });
  await app.ready();
  return app;
}

/**
 * Pulls the auth cookie out of a response as a `Cookie` header value.
 * @param {!Object} res A light-my-request response.
 * @return {string}
 */
export function authCookieFrom(res) {
  const cookie = res.cookies.find((c) => c.name === 'token');
  if (!cookie) {
    throw new Error(`No auth cookie in response: ${res.body}`);
  }
  return `token=${cookie.value}`;
}

/**
 * Registers a user and returns a client that sends requests as them.
 * @param {!Object} app
 * @param {string} username
 * @return {!Promise<{user: !Object, cookie: string, request: function}>}
 */
export async function signUp(app, username) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {username, password: 'password123'},
  });
  if (res.statusCode !== 201) {
    throw new Error(`signUp failed: ${res.body}`);
  }
  const cookie = authCookieFrom(res);
  return {
    user: res.json().user,
    cookie,
    request: (method, url, payload) =>
      app.inject({method, url, payload, headers: {cookie}}),
  };
}
