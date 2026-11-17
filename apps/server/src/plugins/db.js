/**
 * @fileoverview Opens and migrates the database, exposing it as `app.db`.
 */

import fp from 'fastify-plugin';
import {openDatabase} from '../db/connection.js';
import {migrate} from '../db/migrate.js';

export default fp(
  async (app, opts) => {
    const db = openDatabase(opts.dbPath);
    migrate(db);
    app.decorate('db', db);
    app.addHook('onClose', async () => db.close());
  },
  {name: 'db'},
);
