import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {authCookieFrom, createTestApp, signUp} from './helpers.js';

const register = (app, payload) =>
  app.inject({method: 'POST', url: '/api/auth/register', payload});
const login = (app, payload) =>
  app.inject({method: 'POST', url: '/api/auth/login', payload});

describe('auth', () => {
  let app;
  beforeEach(async () => {
    app = await createTestApp();
  });
  afterEach(() => app.close());

  describe('POST /api/auth/register', () => {
    it('creates a user, sets an httpOnly cookie and hides the hash', async () => {
      const res = await register(app, {
        username: 'alice',
        password: 'password123',
        displayName: 'Alice A',
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().user).toEqual({
        id: expect.any(Number),
        username: 'alice',
        displayName: 'Alice A',
      });
      const cookie = res.cookies.find((c) => c.name === 'token');
      expect(cookie).toMatchObject({
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
      });
      expect(res.body).not.toContain('password');
    });

    it('stores a bcrypt hash, not the password', async () => {
      await register(app, {username: 'alice', password: 'password123'});
      const row = app.db
        .prepare('SELECT password_hash FROM users WHERE username = ?')
        .get('alice');
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    });

    it('defaults displayName to the username', async () => {
      const res = await register(app, {
        username: 'bob',
        password: 'password123',
      });
      expect(res.json().user.displayName).toBe('bob');
    });

    it('rejects a duplicate username regardless of case', async () => {
      await register(app, {username: 'alice', password: 'password123'});
      const res = await register(app, {
        username: 'ALICE',
        password: 'password123',
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().message).toMatch(/taken/i);
    });

    it.each([
      [{username: 'al', password: 'password123'}],
      [{username: 'has space', password: 'password123'}],
      [{username: 'alice', password: 'short'}],
      [{username: 'alice'}],
    ])('validates input %o', async (payload) => {
      const res = await register(app, payload);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await register(app, {username: 'alice', password: 'password123'});
    });

    it('logs in with the right password', async () => {
      const res = await login(app, {
        username: 'Alice',
        password: 'password123',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.username).toBe('alice');
      expect(authCookieFrom(res)).toMatch(/^token=/);
    });

    it('gives the same 401 for a wrong password and an unknown user', async () => {
      const wrong = await login(app, {
        username: 'alice',
        password: 'nope-nope',
      });
      const unknown = await login(app, {
        username: 'zed',
        password: 'nope-nope',
      });
      expect(wrong.statusCode).toBe(401);
      expect(unknown.statusCode).toBe(401);
      expect(wrong.json().message).toBe(unknown.json().message);
      expect(wrong.cookies).toHaveLength(0);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user', async () => {
      const alice = await signUp(app, 'alice');
      const res = await alice.request('GET', '/api/auth/me');
      expect(res.statusCode).toBe(200);
      expect(res.json().user).toEqual(alice.user);
    });

    it('is 401 without a cookie', async () => {
      const res = await app.inject({method: 'GET', url: '/api/auth/me'});
      expect(res.statusCode).toBe(401);
    });

    it('is 401 with a tampered token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {cookie: 'token=not.a.jwt'},
      });
      expect(res.statusCode).toBe(401);
    });

    it('is 401 when the user no longer exists', async () => {
      const alice = await signUp(app, 'alice');
      app.db.prepare('DELETE FROM users WHERE id = ?').run(alice.user.id);
      const res = await alice.request('GET', '/api/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the cookie', async () => {
      const alice = await signUp(app, 'alice');
      const res = await alice.request('POST', '/api/auth/logout');
      expect(res.statusCode).toBe(204);
      const cookie = res.cookies.find((c) => c.name === 'token');
      expect(cookie.value).toBe('');
    });
  });
});

describe('auth rate limiting', () => {
  it('returns 429 after too many attempts', async () => {
    const app = await createTestApp({
      authRateLimit: {max: 2, timeWindow: 60000},
    });
    const attempt = () => login(app, {username: 'x', password: 'whatever1'});
    expect((await attempt()).statusCode).toBe(401);
    expect((await attempt()).statusCode).toBe(401);
    expect((await attempt()).statusCode).toBe(429);
    await app.close();
  });
});

describe('cookie options', () => {
  it('marks the cookie Secure when cookieSecure is set', async () => {
    const app = await createTestApp({cookieSecure: true});
    const res = await register(app, {
      username: 'alice',
      password: 'password123',
    });
    expect(res.cookies.find((c) => c.name === 'token').secure).toBe(true);
    await app.close();
  });
});
