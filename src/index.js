import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env. Example: mysql://user:password@localhost:3306/findbid');
  process.exit(1);
}

import http from 'http';
import app from './app.js';
import { initRealtime } from './realtime.js';

const PORT = Number(process.env.PORT) || 3001;

const server = http.createServer(app);
initRealtime(server);

server.listen(PORT, () => {
  console.log(`FindBid API listening on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  API:    http://localhost:${PORT}/v1/...`);
  console.log(`  WS:     ws://localhost:${PORT}/v1/ws`);
});
