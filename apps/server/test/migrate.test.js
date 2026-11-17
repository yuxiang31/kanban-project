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
  it('creates parent directories for a file database', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-db-'));
    const file = path.join(dir, 'nested', 'k.db');
    const db = openDatabase(file);
    migrate(db);
    db.close();
    expect(fs.existsSync(file)).toBe(true);
    fs.rmSync(dir, {recursive: true, force: true});
  });
});
