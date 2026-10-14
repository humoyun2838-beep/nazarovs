import Database from "better-sqlite3";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

const base = process.env.BASE_URL || "http://127.0.0.1:3851";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const db = new Database(path.join(process.env.DATA_DIR || "qa-data", "nazarov.db"), { readonly: true });
const routes = ["/portal", "/nazarov", "/admin/login", "/operator",
  ...["ru", "en", "kaa"].map(lang => `/nazarov?lang=${lang}`),
  ...db.prepare("SELECT slug FROM categories").all().map(row => `/b/${encodeURIComponent(row.slug)}`),
  ...db.prepare("SELECT slug FROM materials").all().map(row => `/m/${encodeURIComponent(row.slug)}`),
];
db.close();
let index = 0;
const failures = [];
const localAssets = new Set();
await Promise.all(Array.from({ length: 6 }, async () => {
  while (index < routes.length) {
    const route = routes[index++];
    if(index%100===0)console.log({pages:index,total:routes.length,failures:failures.length});
    try {
      const response = await fetch(base + route, { signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      for (const match of body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
        if (match[1].startsWith('/') && !match[1].startsWith('/api/')) localAssets.add(match[1].replaceAll('&amp;', '&'));
      }
      if (response.status !== 200 || !body.includes("<main") || body.includes('NEXT_HTTP_ERROR_FALLBACK;500')) {
        failures.push({ route, status: response.status });
      }
    } catch (error) { failures.push({ route, error: error.message }); }
  }
}));
fs.writeFileSync("artifacts/client-audit/page-routes.json",JSON.stringify({pages:routes.length,failures},null,2));
const assets = [...localAssets];
console.log({pagesDone:routes.length,assets:assets.length});
let assetIndex = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (assetIndex < assets.length) {
    const asset = assets[assetIndex++];
    try {
      const response = await fetch(base + asset, {headers:{Range:"bytes=0-1023"},signal: AbortSignal.timeout(15000)});
      const bytes = await response.arrayBuffer();
      if (![200,206].includes(response.status) || !response.headers.get('content-type')?.startsWith('image/') || bytes.byteLength < 100) {
        failures.push({asset, status: response.status});
      }
    } catch (error) { failures.push({asset, error: error.message}); }
  }
}));
for (const route of ["/api/admin/chat-statistics", "/api/admin/chat-workspace", "/api/operator/chat-workspace"]) {
  const response = await fetch(base + route, { redirect: "manual" });
  if (![401, 403].includes(response.status)) failures.push({ route, status: response.status });
}
const checked = routes.length + assets.length + 3;
console.log(JSON.stringify({ pagesAndAccess: routes.length + 3, imageAssets: assets.length, checked, passed: checked - failures.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
