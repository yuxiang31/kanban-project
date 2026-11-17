/**
 * @fileoverview JWT-in-cookie authentication. Adds `app.authenticate` (a
 * preHandler that sets `request.user`), `reply.setAuthCookie()` and
 * `reply.clearAuthCookie()`.
 */

import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import {unauthorized} from '../utils/errors.js';

export const AUTH_COOKIE = 'token';
const SESSION_SECONDS = 7 * 24 * 60 * 60;

export default fp(
  async (app, opts) => {
    await app.register(cookie);
    await app.register(jwt, {
      secret: opts.jwtSecret,
      cookie: {cookieName: AUTH_COOKIE, signed: false},
      sign: {expiresIn: SESSION_SECONDS},
    });

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: opts.cookieSecure,
    };

    app.decorate('authenticate', async (request) => {
      try {
        const payload = await request.jwtVerify();
        request.user = {id: payload.sub, username: payload.username};
      } catch {
        throw unauthorized('Please log in.');
      }
    });

    app.decorateReply('setAuthCookie', function (user) {
      const token = app.jwt.sign({sub: user.id, username: user.username});
      return this.setCookie(AUTH_COOKIE, token, {
        ...cookieOptions,
        maxAge: SESSION_SECONDS,
      });
    });

    app.decorateReply('clearAuthCookie', function () {
      return this.clearCookie(AUTH_COOKIE, cookieOptions);
    });
  },
  {name: 'auth'},
);
