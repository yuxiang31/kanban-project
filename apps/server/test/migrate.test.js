import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {openDatabase} from '../src/db/connection.js';
import {migrate} from '../src/db/migrate.js';

describe('migrate', () => {
  it('applies migrations once and enables foreign keys', () => {
    const db = openDatabase(':memory:');
    const first = migrate(db);
    expect(first.length).toBeGreaterThan(0);
    expect(migrate(db)).toEqual([]);
    expect(db.pragma('foreign_keys', {simple: true})).toBe(1);
  });
});

describe('openDatabase', () => {
  it('creates parent directories for a file database', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-db-'));
    const file = path.join(dir, 'nested', 'k.db');
    const db = openDatabase(file);
    migrate(db);
    db.close();
    expect(fs.existsSync(file)).toBe(true);
    fs.rmSync(dir, {recursive: true, force: true});
  });
});

describe('team ownership migrations (002 then 003)', () => {
  const MIGRATIONS = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../src/db/migrations',
  );

  /**
   * A database with only the given migrations applied, as an older copy of
   * the app would have left it.
   */
  function databaseAt(names) {
    const db = openDatabase(':memory:');
    db.exec(`CREATE TABLE schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    for (const name of names) {
      db.exec(fs.readFileSync(path.join(MIGRATIONS, name), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    }
    db.exec(`INSERT INTO users (id, username, password_hash, display_name)
      VALUES (1, 'alice', 'x', 'A'), (2, 'bob', 'x', 'B'), (3, 'carol', 'x', 'C')`);
    return db;
  }

  const teamColumns = (db) =>
    db
      .prepare('PRAGMA table_info(teams)')
      .all()
      .map((c) => c.name);
  const memberColumns = (db) =>
    db
      .prepare('PRAGMA table_info(team_members)')
      .all()
      .map((c) => c.name);
  const ownerOf = (db, teamId) =>
    db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(teamId).owner_id;

  it('leaves a pre-002 database with its owners unchanged', () => {
    const db = databaseAt(['001_init.sql']);
    db.exec(`
      INSERT INTO teams (id, name, owner_id) VALUES (1, 'Core', 1);
      INSERT INTO team_members (team_id, user_id) VALUES (1, 1), (1, 2);
    `);
    expect(migrate(db)).toEqual(['002_team_roles.sql', '003_single_owner.sql']);
    expect(ownerOf(db, 1)).toBe(1);
    expect(teamColumns(db)).toContain('owner_id');
    expect(teamColumns(db)).not.toContain('created_by');
    expect(memberColumns(db)).not.toContain('role');
  });

  it('picks one owner for teams that had co-owners', () => {
    const db = databaseAt(['001_init.sql', '002_team_roles.sql']);
    db.exec(`
      INSERT INTO teams (id, name, created_by) VALUES
        (1, 'Creator still owner', 1),
        (2, 'Creator stepped down', 1),
        (3, 'Creator left', 1);
      INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES
        (1, 1, 'owner', '2026-01-01'), (1, 2, 'owner', '2026-01-02'),
        (2, 1, 'member', '2026-01-01'), (2, 3, 'owner', '2026-01-03'),
        (2, 2, 'member', '2026-01-02'),
        (3, 2, 'member', '2026-01-02'), (3, 3, 'owner', '2026-01-03');
    `);
    expect(migrate(db)).toEqual(['003_single_owner.sql']);
    expect(ownerOf(db, 1)).toBe(1);
    expect(ownerOf(db, 2)).toBe(3);
    expect(ownerOf(db, 3)).toBe(3);
    expect(memberColumns(db)).not.toContain('role');
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((r) => r.name);
    expect(indexes).toContain('idx_teams_owner');
    expect(indexes).not.toContain('idx_team_members_role');
  });
});
