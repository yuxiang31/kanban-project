/**
 * @fileoverview Applies numbered SQL migrations from ./migrations in order.
 * Each applied file is recorded in the schema_migrations table.
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

/**
 * Runs every migration that has not been applied yet.
 * @param {!Object} db A better-sqlite3 database.
 * @return {!Array<string>} Names of the migrations applied in this run.
 */
export function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const applied = new Set(
    db
      .prepare('SELECT name FROM schema_migrations')
      .all()
      .map((row) => row.name),
  );
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const ran = [];
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    })();
    ran.push(file);
  }
  return ran;
}

// Allow `npm run migrate` to run this file directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {openDatabase} = await import('./connection.js');
  const {loadConfig} = await import('../config.js');
  const ran = migrate(openDatabase(loadConfig(process.env).dbPath));
  console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Up to date.');
}
