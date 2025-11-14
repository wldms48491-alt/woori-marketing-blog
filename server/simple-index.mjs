#!/usr/bin/env node
import http from 'http';
import 'dotenv/config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PORT = 3005;

const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'OK', port: PORT }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[LISTENING] http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
  console.error('[ERROR]', err.message);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN]');
  process.exit(0);
});

setInterval(() => {
  console.log('[KEEP-ALIVE]');
}, 30000);
