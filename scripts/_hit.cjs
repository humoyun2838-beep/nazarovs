const Database = require("better-sqlite3");
const db = new Database("data/nazarov.db", { readonly: true });
function fold(t) {
  return String(t || "")
    .replace(/[\u2018\u2019\u02BB\u02BC`]/g, "'")
    .replace(/[\u201c\u201d«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
const row = db.prepare("select content from materials where slug like 'murojat-epizodi%'").get();
for (const l of String(row.content).split("\n").map(fold)) {
  if (/Uchrashuvga|qabulga yozish/i.test(l)) console.log(l);
}
