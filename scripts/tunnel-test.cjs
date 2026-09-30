#!/usr/bin/env node
/**
 * Prove the public nazarov.tunn3l.sh mapping stays up and comes back
 * after the local tunn3l client is killed.
 */
const { execSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PUBLIC = process.env.PUBLIC_URL || "https://nazarov.tunn3l.sh";
const LOCAL = process.env.BASE_URL || "http://127.0.0.1:3847";
const HITS = Number(process.env.TUNNEL_HITS || 40);
const RECOVERIES = Number(process.env.TUNNEL_RECOVERIES || 3);
const RECOVER_MS = Number(process.env.TUNNEL_RECOVER_MS || 50000);

function fail(message) {
  throw new Error(message);
}

async function fetchOnce(url, timeoutMs = 8000) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "nazarov-tunnel-test/1.0" },
    });
    const body = await res.text();
    return { status: res.status, body, ms: Date.now() - t0 };
  } catch (error) {
    return { status: 0, body: String(error), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

function tunn3lPids() {
  const out = spawnSync("ps", ["-eo", "pid=,cmd="], { encoding: "utf8" }).stdout || "";
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\/\.tunn3l\/bin\/tunn3l http 3847/.test(line))
    .map((line) => Number(line.split(/\s+/)[0]))
    .filter((pid) => Number.isFinite(pid) && pid > 1);
}

function supervisorAlive() {
  const out = spawnSync("ps", ["-eo", "pid=,cmd="], { encoding: "utf8" }).stdout || "";
  return /start-stable-tunnel\.sh/.test(out);
}

function supervisorSourceOk() {
  const src = fs.readFileSync(path.join(__dirname, "start-stable-tunnel.sh"), "utf8");
  if (src.includes("${body_snip}")) {
    fail("tunnel supervisor interpolates body_snip as a variable and will crash under set -u");
  }
  if (!src.includes("$(body_snip)")) {
    fail("tunnel supervisor is missing the heartbeat body snippet");
  }
  if (!src.includes("9>&-")) {
    fail("tunnel client must not inherit the supervisor lock fd");
  }
  if (!src.includes("REFRESH_SECS")) {
    fail("tunnel supervisor must refresh the client before the relay mapping cliff");
  }
  const ensure = fs.readFileSync(path.join(__dirname, "ensure-nazarov-up.sh"), "utf8");
  if (!ensure.includes("bash scripts/start-stable-tunnel")) {
    fail("ensure-nazarov-up.sh must detect the supervisor without matching itself");
  }
  if (!ensure.includes("nohup bash scripts/start-stable-tunnel.sh")) {
    fail("ensure-nazarov-up.sh must start the supervisor detached, not via tmux send-keys");
  }
  const keep = fs.readFileSync(path.join(__dirname, "keep-nazarov-url.sh"), "utf8");
  if (!keep.includes("nazarov-keep.lock") || !keep.includes("ensure-nazarov-up.sh")) {
    fail("keep-nazarov-url.sh must flock and call ensure-nazarov-up.sh");
  }
}

function killTunn3lClients() {
  const pids = tunn3lPids();
  if (!pids.length) fail("no tunn3l client to kill");
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
  return pids;
}

async function waitForPublic(label, timeoutMs = RECOVER_MS) {
  const t0 = Date.now();
  let last = { status: 0, body: "" };
  while (Date.now() - t0 < timeoutMs) {
    last = await fetchOnce(`${PUBLIC}/api/health`, 5000);
    if (last.status === 200 && last.body.includes('"ok":true')) {
      return { ...last, waitedMs: Date.now() - t0 };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  fail(
    `${label}: public URL did not recover in ${timeoutMs}ms (last ${last.status} ${last.body.slice(0, 80)})`,
  );
}

async function main() {
  supervisorSourceOk();
  if (!supervisorAlive()) {
    fail("start-stable-tunnel.sh is not running");
  }

  const local = await fetchOnce(`${LOCAL}/api/health`);
  if (local.status !== 200) fail(`local app down ${local.status}`);

  const catalog = await fetchOnce(`${PUBLIC}/nazarov`);
  if (catalog.status !== 200) fail(`public catalog ${catalog.status} ${catalog.body.slice(0, 80)}`);
  if (!catalog.body.includes("nazarov-mark.webp")) {
    fail("public catalog missing Dmed backdrop mark");
  }
  if (!catalog.body.includes('data-dmed-chat="widget"')) {
    fail("public catalog missing Dmed chat");
  }

  const root = await fetchOnce(`${PUBLIC}/`);
  if (root.status !== 200) fail(`public / ${root.status} ${root.body.slice(0, 80)}`);
  if (root.body.includes("1-sayt") || root.body.includes("Admin uchun")) {
    fail("public / showed the local landing chooser instead of the catalog");
  }
  if (!root.body.includes("O‘quv materiallari") && !root.body.includes('data-dmed-chat="widget"')) {
    fail("public / did not open the client catalog");
  }

  const login = await fetchOnce(`${PUBLIC}/admin/login`);
  if (login.status !== 200 || !login.body.includes('value="Nazarov"')) {
    fail("public admin login is not ready");
  }

  const mark = await fetchOnce(`${PUBLIC}/nazarov-mark.webp`);
  if (mark.status !== 200) fail(`public mark ${mark.status}`);

  const soak = [];
  for (let i = 0; i < HITS; i++) {
    const row = await fetchOnce(`${PUBLIC}/api/health`, 6000);
    soak.push(row);
    if (row.status !== 200) {
      fail(`soak hit ${i + 1}/${HITS} failed ${row.status} ${row.body.slice(0, 80)}`);
    }
  }

  const recoveries = [];
  for (let i = 0; i < RECOVERIES; i++) {
    const killed = killTunn3lClients();
    const dropped = await fetchOnce(`${PUBLIC}/api/health`, 5000);
    const recovered = await waitForPublic(`recovery ${i + 1}`);
    const stable = await fetchOnce(`${PUBLIC}/api/health`, 6000);
    if (stable.status !== 200) {
      fail(`recovery ${i + 1} did not stay up (${stable.status})`);
    }
    await new Promise((r) => setTimeout(r, 1500));
    if (!tunn3lPids().length) fail(`recovery ${i + 1}: supervisor did not spawn a new client`);
    recoveries.push({
      i: i + 1,
      killed,
      droppedStatus: dropped.status,
      recoveredMs: recovered.waitedMs,
    });
  }

  const after = await fetchOnce(`${PUBLIC}/nazarov`);
  if (after.status !== 200 || !after.body.includes("O‘quv materiallari")) {
    fail("catalog not healthy after recovery tests");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        public: PUBLIC,
        soakHits: soak.length,
        soakFailed: soak.filter((r) => r.status !== 200).length,
        soakAvgMs: Math.round(soak.reduce((s, r) => s + r.ms, 0) / soak.length),
        recoveries,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
