const Database = require("better-sqlite3");
const db = new Database("data/nazarov.db");
const r = db
  .prepare("UPDATE categories SET title = ? WHERE slug = ?")
  .run("Top 20 ta savol", "eng-kop-beriladigan-savollarga-qisqa-javoblar");
const row = db
  .prepare("SELECT title FROM categories WHERE slug = ?")
  .get("eng-kop-beriladigan-savollarga-qisqa-javoblar");
console.log(JSON.stringify({ changes: r.changes, title: row && row.title }));
