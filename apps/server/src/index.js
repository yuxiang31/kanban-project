/**
 * @fileoverview Server entry point.
 */

import {buildApp} from './app.js';
import {loadConfig} from './config.js';

const config = loadConfig(process.env);
const app = await buildApp({...config, logger: true});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

await app.listen({port: config.port, host: config.host});
