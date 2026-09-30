#!/usr/bin/env node
/**
 * Fake Telegram Bot API for chat pipeline tests.
 * POST /botTOKEN/sendMessage -> { ok: true }
 */
const fs = require("node:fs");
const http = require("node:http");

const PORT = Number(process.env.TELEGRAM_MOCK_PORT || 9377);
const LOG = process.env.TELEGRAM_MOCK_LOG || "/tmp/telegram-mock.json";

const received = [];

function save() {
  fs.writeFileSync(
    LOG,
    JSON.stringify({ count: received.length, last: received[received.length - 1] || null }),
  );
}

const server = http.createServer((req, res) => {
  const url = req.url || "";
  if (req.method === "POST" && url.includes("sendMessage")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let payload = { raw };
      try {
        payload = JSON.parse(raw);
      } catch {
        /* keep raw */
      }
      received.push({ at: new Date().toISOString(), url, payload });
      save();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ ok: true, result: { message_id: received.length } }),
      );
    });
    return;
  }
  if (req.method === "GET" && url.startsWith("/_count")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ count: received.length }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

save();
server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`telegram mock listening on 127.0.0.1:${PORT}\n`);
});
