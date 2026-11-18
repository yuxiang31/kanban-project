import {describe, expect, it} from 'vitest';
import {loadConfig} from '../src/config.js';

describe('loadConfig', () => {
  it('requires JWT_SECRET in production', () => {
    expect(() => loadConfig({NODE_ENV: 'production'})).toThrow(/JWT_SECRET/);
  });

  it('treats an empty JWT_SECRET (from a copied .env.example) as unset', () => {
    expect(() =>
      loadConfig({NODE_ENV: 'production', JWT_SECRET: '  '}),
    ).toThrow(/JWT_SECRET/);
    expect(loadConfig({JWT_SECRET: ''}).jwtSecret).toBe(
      loadConfig({}).jwtSecret,
    );
  });

  it('applies defaults in development', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({port: 3000, host: '127.0.0.1'});
    expect(config.cookieSecure).toBe(false);
    expect(config.jwtSecret).toBeTruthy();
  });

  it('reads overrides', () => {
    const config = loadConfig({
      PORT: '4000',
      HOST: '0.0.0.0',
      JWT_SECRET: 'x',
      COOKIE_SECURE: 'true',
      DB_PATH: '/tmp/k.db',
      WEB_DIST_DIR: '/w',
    });
    expect(config).toEqual({
      port: 4000,
      host: '0.0.0.0',
      jwtSecret: 'x',
      cookieSecure: true,
      dbPath: '/tmp/k.db',
      webDistDir: '/w',
      isProduction: false,
    });
  });
});
