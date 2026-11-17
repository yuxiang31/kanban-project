/**
 * @fileoverview Test helpers: builds an app on an in-memory database.
 */

import {buildApp} from '../src/app.js';

/**
 * @return {!Promise<!Object>} A ready Fastify app backed by `:memory:`.
 */
export async function createTestApp() {
  const app = await buildApp({dbPath: ':memory:', jwtSecret: 'test-secret'});
  await app.ready();
  return app;
}
