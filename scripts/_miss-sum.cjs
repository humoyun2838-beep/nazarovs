const Database = require("better-sqlite3");
const map = require("../src/data/lesson-i18n.json");
const db = new Database("data/nazarov.db", { readonly: true });
function fold(text) {
  return String(text || "")
    .replace(/[\u2018\u2019\u02BB\u02BC`]/g, "'")
    .replace(/[\u201c\u201d«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
const rows = db.prepare("select slug, summary from materials").all();
const miss = [];
for (const row of rows) {
  const prepared = fold(row.summary).replace(/\s+(?=\d+\.\s)/g, "\n");
  const first = prepared.split(/\n/).map((l) => fold(l)).find((l) => l && !/^(IMAGE|VIDEO)::/i.test(l));
  if (!first) continue;
  if (map[first]?.ru) continue;
  const stripped = first.replace(/^(?:\d+\.\s+|•\s+)/, "");
  if (map[stripped]?.ru) continue;
  if (/tanishamiz|Tizimga kirganingizdan|bo'limiga o'ting|tugmasini/i.test(first)) {
    miss.push(first.slice(0, 180));
  }
}
console.log("miss", miss.length);
console.log([...new Set(miss)].slice(0, 40).join("\n---\n"));
