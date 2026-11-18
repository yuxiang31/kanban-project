import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {buildApp} from '../src/app.js';
import {createTestApp} from './helpers.js';

describe('app', () => {
  let app;
  afterEach(() => app?.close());

  it('reports health', async () => {
    app = await createTestApp();
    const res = await app.inject({method: 'GET', url: '/api/health'});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ok: true});
  });

  it('reports unhealthy when the database cannot be used', async () => {
    app = await createTestApp();
    app.db.close();
    const res = await app.inject({method: 'GET', url: '/api/health'});
    expect(res.statusCode).toBe(500);
  });

  it('returns JSON 404 for unknown api routes', async () => {
    app = await createTestApp();
    const res = await app.inject({method: 'GET', url: '/api/nope'});
    expect(res.statusCode).toBe(404);
  });

  it('hides details of 500 errors', async () => {
    app = await buildApp({dbPath: ':memory:', jwtSecret: 's'});
    app.get('/boom', async () => {
      throw new Error('secret detail');
    });
    const res = await app.inject({method: 'GET', url: '/boom'});
    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe('Something went wrong.');
  });

  it('passes 4xx error messages through', async () => {
    const {badRequest} = await import('../src/utils/errors.js');
    app = await buildApp({dbPath: ':memory:', jwtSecret: 's'});
    app.get('/bad', async () => {
      throw badRequest('Nope.');
    });
    const res = await app.inject({method: 'GET', url: '/bad'});
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({statusCode: 400, message: 'Nope.'});
  });

  describe('serving the built web app', () => {
    let dir;
    afterEach(() => fs.rmSync(dir, {recursive: true, force: true}));

    it('serves index.html for client routes, 404 JSON for api', async () => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-dist-'));
      fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>');
      app = await buildApp({
        dbPath: ':memory:',
        jwtSecret: 's',
        webDistDir: dir,
      });
      const page = await app.inject({method: 'GET', url: '/boards/1'});
      expect(page.statusCode).toBe(200);
      expect(page.body).toContain('id="root"');
      const api = await app.inject({method: 'GET', url: '/api/missing'});
      expect(api.statusCode).toBe(404);
      expect(api.json().message).toBe('Not found');
    });
  });
});
