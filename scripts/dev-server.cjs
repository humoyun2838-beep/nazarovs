#!/usr/bin/env node
/**
 * Start Next on the fixed project port.
 * If that port already serves this app, reuse it.
 * Never hop to another port.
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3847);
const SERVICE = "nazarov-uz";

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function portOpen() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function health() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: "/api/health",
        timeout: 2500,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
  });
}

async function main() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    fail(`PORT noto‘g‘ri: ${process.env.PORT}. Loyiha porti 3847 bo‘lishi kerak.`);
  }
  if (await portOpen()) {
    const body = await health();
    if (body && body.service === SERVICE && body.ok === true) {
      console.log(`Nazarov allaqachon shu portda ishlayapti: http://127.0.0.1:${PORT}`);
      console.log(`Katalog: http://127.0.0.1:${PORT}/nazarov`);
      process.exit(0);
    }
    fail(
      `Port ${PORT} band, lekin bu Nazarov loyihasi emas.\n` +
        `Boshqa dasturni to‘xtating yoki PORT ni .env da 3847 qilib qo‘ying.\n` +
        `Server boshqa portga o‘tkazilmadi.`,
    );
  }

  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--hostname", "0.0.0.0", "--port", String(PORT)],
    { stdio: "inherit", env: { ...process.env, PORT: String(PORT) } },
  );
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

main();
