/**
 * @fileoverview Builds the Fastify application. Kept separate from index.js
 * so tests can create an app with an in-memory database.
 */

import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import realtimePlugin from './plugins/realtime.js';
import authRoutes from './modules/auth/auth.routes.js';
import boardRoutes from './modules/boards/boards.routes.js';
import stageRoutes from './modules/stages/stages.routes.js';
import taskRoutes from './modules/tasks/tasks.routes.js';
import teamRoutes from './modules/teams/teams.routes.js';

const DEFAULT_BCRYPT_ROUNDS = 12;
const DEFAULT_AUTH_RATE_LIMIT = {max: 20, timeWindow: 60_000};

/**
 * @param {{
 *   dbPath: string,
 *   jwtSecret: string,
 *   cookieSecure?: boolean,
 *   bcryptRounds?: number,
 *   authRateLimit?: {max: number, timeWindow: number},
 *   webDistDir?: ?string,
 *   logger?: (boolean|!Object),
 * }} opts
 * @return {!Promise<!Object>} A Fastify instance, not yet listening.
 */
export async function buildApp(opts) {
  const app = Fastify({logger: opts.logger ?? false});

  // Must be set before routes are registered so child contexts inherit it.
  app.setErrorHandler((error, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error(error);
    }
    reply.status(status).send({
      statusCode: status,
      error: status >= 500 ? 'Internal Server Error' : error.name,
      message: status >= 500 ? 'Something went wrong.' : error.message,
    });
  });

  await app.register(dbPlugin, {dbPath: opts.dbPath});
  await app.register(authPlugin, {
    jwtSecret: opts.jwtSecret,
    cookieSecure: opts.cookieSecure ?? false,
  });
  await app.register(realtimePlugin);

  await app.register(
    async (api) => {
      api.get('/health', async () => ({ok: true}));
      await api.register(authRoutes, {
        prefix: '/auth',
        bcryptRounds: opts.bcryptRounds ?? DEFAULT_BCRYPT_ROUNDS,
        rateLimit: opts.authRateLimit ?? DEFAULT_AUTH_RATE_LIMIT,
      });
      await api.register(boardRoutes);
      await api.register(stageRoutes);
      await api.register(taskRoutes);
      await api.register(teamRoutes);
    },
    {prefix: '/api'},
  );

  // In production the server also serves the built React app.
  if (opts.webDistDir && fs.existsSync(opts.webDistDir)) {
    await app.register(fastifyStatic, {root: path.resolve(opts.webDistDir)});
    app.setNotFoundHandler((request, reply) => {
      const isApi =
        request.url.startsWith('/api') || request.url.startsWith('/ws');
      if (request.method === 'GET' && !isApi) {
        return reply.sendFile('index.html');
      }
      return reply.status(404).send({statusCode: 404, message: 'Not found'});
    });
  }

  return app;
}
