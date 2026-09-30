#!/usr/bin/env node
/**
 * Hit public routes repeatedly (default 900) and report failures/slow pages.
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:3847";
const TOTAL = Number(process.env.TOTAL || 900);

const EXPECT_404 = new Set([
  "/m/does-not-exist-xyz",
  "/b/does-not-exist-xyz",
  "/this-page-does-not-exist",
]);

async function fetchOnce(path, { redirect = "follow", headers = {} } = {}) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    redirect,
    headers: { "user-agent": "nazarov-stress/1.0", ...headers },
  });
  await res.arrayBuffer();
  return { path, status: res.status, ms: Date.now() - t0, location: res.headers.get("location") };
}

function isFailure(row) {
  if (row.error || row.status === 0) return true;
  if (EXPECT_404.has(row.path)) return row.status !== 404;
  if (row.path === "/") {
    return !(row.status === 307 || row.status === 308 || row.status === 200);
  }
  if (row.path === "/materials") {
    const loc = row.location || "";
    return !(
      (row.status === 307 || row.status === 308) &&
      loc.includes("/nazarov")
    );
  }
  return row.status >= 400;
}

async function main() {
  const { spawnSync } = require("node:child_process");
  const order = spawnSync(process.execPath, [require("path").join(__dirname, "order-test.cjs")], {
    env: process.env,
    encoding: "utf8",
  });
  if (order.status !== 0) {
    process.stderr.write(order.stdout || "");
    process.stderr.write(order.stderr || "");
    throw new Error("order-test failed");
  }
  process.stdout.write(order.stdout || "");

  const catalog = await fetch(`${BASE}/nazarov`).then((r) => r.text());
  const categories = [...catalog.matchAll(/href="(\/b\/[^"]+)"/g)].map((m) => m[1]);
  const lessons = [];
  for (const path of categories.slice(0, 6)) {
    const html = await fetch(`${BASE}${path}`).then((r) => r.text());
    lessons.push(...[...html.matchAll(/href="(\/m\/[^"]+)"/g)].map((m) => m[1]));
  }
  const videoPage = "/m/login-to-system-uz";
  const videoApi =
    "/api/media/notion?b=3c060b77-fbf5-804f-8b72-d38038429db8&f=ca78e448-fe1b-4673-86ae-65b5e8c6afe2&n=%D0%92%D1%85%D0%BE%D0%B4_%D0%B2_%D1%81%D0%B8%D1%81%D1%82%D0%B5%D0%BC%D1%83_%D1%83%D0%B7.mp4&fmt=json";

  const loginHtml = await fetch(`${BASE}/admin/login`).then((r) => r.text());
  if (!loginHtml.includes('value="Nazarov"')) {
    throw new Error("admin login field is not prefilled with Nazarov");
  }
  if (catalog.includes('data-dmed-chat="widget"') === false) {
    throw new Error("catalog is missing the Dmed chat widget");
  }
  if (!catalog.includes("nazarov-mark.webp") || !catalog.includes("page-backdrop-mark")) {
    throw new Error("catalog is missing the Dmed backdrop mark");
  }
  if (!catalog.includes("nazarov-bg-wash.webp") || !catalog.includes("page-backdrop-wash")) {
    throw new Error("catalog is missing the backdrop wash");
  }

  const pool = [
    "/",
    "/materials",
    "/nazarov",
    "/login",
    "/admin/login",
    videoPage,
    videoApi,
    "/nazarov-portrait-sm.webp",
    "/nazarov-portrait.webp",
    "/nazarov-bg.webp",
    "/nazarov-bg-wash.webp",
    "/nazarov-mark.webp",
    "/api/health",
    "/m/does-not-exist-xyz",
    "/b/does-not-exist-xyz",
    "/this-page-does-not-exist",
    ...categories.slice(0, 12),
    ...[...new Set(lessons)].slice(0, 16),
  ];

  const results = [];
  for (let i = 0; i < TOTAL; i++) {
    const path = pool[i % pool.length];
    try {
          const extra =
        path === "/"
          ? {
              redirect: "manual",
              headers: { host: "nazarov.tunn3l.sh" },
            }
          : path === "/materials"
            ? { redirect: "manual" }
            : {};
      const row = await fetchOnce(path, extra);
      const testingLocal = /127\.0\.0\.1|localhost/i.test(BASE);
      if (
        row.location &&
        /127\.0\.0\.1|0\.0\.0\.0|localhost/i.test(row.location) &&
        !testingLocal
      ) {
        results.push({
          ...row,
          error: `host leaked in Location: ${row.location}`,
        });
      } else {
        results.push(row);
      }
    } catch (error) {
      results.push({ path, status: 0, ms: 0, error: String(error) });
    }
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`progress ${i + 1}/${TOTAL}\n`);
    }
  }

  const failed = results.filter(isFailure);
  const slow = results.filter((r) => r.ms > 800);
  const avg =
    results.reduce((sum, r) => sum + (r.ms || 0), 0) / Math.max(results.length, 1);
  const byPath = {};
  for (const r of results) {
    byPath[r.path] ??= { n: 0, ms: 0, bad: 0 };
    byPath[r.path].n += 1;
    byPath[r.path].ms += r.ms || 0;
    if (isFailure(r)) byPath[r.path].bad += 1;
  }

  console.log(
    JSON.stringify(
      {
        total: results.length,
        avgMs: Math.round(avg),
        failed: failed.length,
        slow: slow.length,
        byPath: Object.fromEntries(
          Object.entries(byPath).map(([path, s]) => [
            path,
            { n: s.n, avgMs: Math.round(s.ms / s.n), bad: s.bad },
          ]),
        ),
        sampleFails: failed.slice(0, 8),
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
