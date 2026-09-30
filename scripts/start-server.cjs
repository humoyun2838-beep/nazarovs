#!/usr/bin/env node
const { spawn } = require("node:child_process");
const path = require("node:path");

const port = process.env.PORT || "3847";
const nextBin = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const child = spawn(
  process.execPath,
  [nextBin, "start", "--hostname", "0.0.0.0", "--port", String(port)],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
