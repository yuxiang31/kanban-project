/**
 * @fileoverview Auth routes: register, login, logout, current user.
 */

import rateLimit from '@fastify/rate-limit';
import {currentUser, login, register} from './auth.service.js';
import {loginSchema, registerSchema} from './auth.schemas.js';

/**
 * @param {!Object} app
 * @param {{bcryptRounds: number, rateLimit: !Object}} opts
 */
export default async function authRoutes(app, opts) {
  await app.register(rateLimit, {global: false});
  const limited = {rateLimit: opts.rateLimit};

  app.post(
    '/register',
    {schema: registerSchema, config: limited},
    async (request, reply) => {
      const user = await register(app.db, request.body, opts.bcryptRounds);
      reply.setAuthCookie(user);
      return reply.status(201).send({user});
    },
  );

  app.post(
    '/login',
    {schema: loginSchema, config: limited},
    async (request, reply) => {
      const user = await login(app.db, request.body, opts.bcryptRounds);
      reply.setAuthCookie(user);
      return {user};
    },
  );

  app.post('/logout', async (_request, reply) => {
    reply.clearAuthCookie();
    return reply.status(204).send();
  });

  app.get('/me', {preHandler: app.authenticate}, async (request) => ({
    user: currentUser(app.db, request.user.id),
  }));
}
