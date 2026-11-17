/**
 * @fileoverview Opens the SQLite database.
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/**
 * Opens (and creates if needed) a SQLite database.
 * @param {string} dbPath File path, or ':memory:' for an in-memory database.
 * @return {!Database.Database}
 */
export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), {recursive: true});
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
