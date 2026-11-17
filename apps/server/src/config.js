/**
 * @fileoverview Reads server configuration from environment variables.
 */

import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SERVER_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const DEV_JWT_SECRET = 'dev-only-insecure-secret';

/**
 * @param {!Object<string, (string|undefined)>} env
 * @return {{
 *   port: number,
 *   host: string,
 *   jwtSecret: string,
 *   cookieSecure: boolean,
 *   dbPath: string,
 *   webDistDir: ?string,
 *   isProduction: boolean,
 * }}
 */
export function loadConfig(env) {
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && !env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production.');
  }
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
    jwtSecret: env.JWT_SECRET ?? DEV_JWT_SECRET,
    cookieSecure: env.COOKIE_SECURE === 'true',
    dbPath: env.DB_PATH ?? path.join(SERVER_ROOT, 'data', 'kanban.db'),
    webDistDir: env.WEB_DIST_DIR ?? null,
    isProduction,
  };
}
