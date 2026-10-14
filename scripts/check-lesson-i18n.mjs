import Database from "better-sqlite3";
import { readFileSync } from "node:fs";

const map = JSON.parse(readFileSync(new URL("../src/data/lesson-i18n.json", import.meta.url)));
const phrases = JSON.parse(readFileSync(new URL("../src/data/lesson-phrases.json", import.meta.url)));
const known = new Set([
  ...Object.keys(map),
  ...phrases.map((row) => String(row[0] || "").replace(/['’`]/g, "").replace(/\s+/g, " ").trim()),
]);

const db = new Database(new URL("../data/nazarov.db", import.meta.url).pathname, { readonly: true });
const rows = db.prepare("SELECT content FROM materials").all();
let lines = 0;
let missing = 0;
for (const row of rows) {
  for (const raw of String(row.content || "").split("\n")) {
    const line = raw.trim();
    if (!line || /^(IMAGE|VIDEO)::/i.test(line) || line.length < 12) continue;
    lines += 1;
    const key = line.replace(/['’`]/g, "").replace(/\s+/g, " ").trim();
    if (!known.has(key) && !known.has(key.replace(/^\d+\.\s+/, ""))) missing += 1;
  }
}
console.log(JSON.stringify({ lines, missing, covered: lines - missing }));
