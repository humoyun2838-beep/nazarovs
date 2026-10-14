const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const host = '127.0.0.1';
const mainPort = 3850;
const entries = [[3852, '/admin/login'], [3853, '/operator']];
const servers = [];
let child;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const server of servers) server.close();
  if (child && !child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500).unref();
  process.exitCode = code;
}
async function isBusy(port) {
  return new Promise(resolve => {
    const socket = net.connect({host, port});
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}
async function main() {
  for (const port of [mainPort, ...entries.map(([port]) => port)]) {
    if (await isBusy(port)) throw new Error(`Port ${port} band. Oldingi sayt terminalini to‘xtating.`);
  }
  child = spawn(process.execPath, [path.join(__dirname, '../node_modules/next/dist/bin/next'), 'start', '--hostname', host, '--port', String(mainPort)], {
    stdio: 'inherit',
    env: {...process.env, PORT: String(mainPort), DATA_DIR: process.env.DATA_DIR || 'runtime-data', SITE_PUBLIC_READY: '0', SEPARATE_SITES: '1'},
  });
  child.once('error', error => { console.error(error.message); stop(1); });
  child.once('exit', code => stop(code || 0));
  for (const [port, entry] of entries) {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${host}:${port}`);
      if (url.pathname === '/') {
        res.writeHead(307, {Location: entry + url.search, 'Cache-Control': 'no-store'});
        res.end(); return;
      }
      const upstream = http.request({hostname: host, port: mainPort, path: req.url, method: req.method,
        headers: {...req.headers, host: `${host}:${port}`, 'x-forwarded-host': `${host}:${port}`, 'x-forwarded-proto': 'http'}}, response => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
      upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(502, {'Content-Type': 'text/plain; charset=utf-8'});
        res.end('Sayt ishga tushmoqda. Bir ozdan keyin sahifani yangilang.');
      });
      req.on('aborted', () => upstream.destroy());
      res.on('close', () => { if (!res.writableFinished) upstream.destroy(); });
      req.pipe(upstream);
    });
    servers.push(server);
    server.once('error', error => { console.error(error.message); stop(1); });
    server.listen(port, host);
  }
  console.log('Mijoz: http://127.0.0.1:3850');
  console.log('Admin: http://127.0.0.1:3852');
  console.log('Operator: http://127.0.0.1:3853');
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
main().catch(error => { console.error(error.message); stop(1); });
