#!/usr/bin/env node
const Database = require("better-sqlite3");
const path = require("node:path");
const fs = require("node:fs");

const db = new Database(path.join(process.cwd(), "data", "nazarov.db"));
db.pragma("journal_mode = WAL");

function art(key) {
  return `/stickers/lessons/lesson-${key}.webp?v=l2`;
}

const SLUG = "eng-kop-beriladigan-savollarga-qisqa-javoblar";
const TITLE = "Top 20 ta savol";
const DESCRIPTION =
  "20 ta savol — 20 ta aniq javob. Stikerli, qidiruvli, ochib o‘qiladi.";

const items = JSON.parse(
  fs.readFileSync(path.join(__dirname, "faq-dmed.json"), "utf8"),
);

const now = new Date().toISOString();
let cat = db.prepare("SELECT id FROM categories WHERE slug = ?").get(SLUG);
if (!cat) {
  const maxSort = db.prepare("SELECT MAX(sort_order) AS n FROM categories").get().n || 0;
  const info = db
    .prepare(
      `INSERT INTO categories (title, slug, description, icon, sort_order)
       VALUES (?, ?, ?, 'stethoscope', ?)`,
    )
    .run(TITLE, SLUG, DESCRIPTION, maxSort + 1);
  cat = { id: info.lastInsertRowid };
} else {
  db.prepare(
    "UPDATE categories SET title = ?, description = ?, icon = 'stethoscope' WHERE id = ?",
  ).run(TITLE, DESCRIPTION, cat.id);
}

const upsert = db.prepare(
  `INSERT INTO materials (category_id, title, slug, summary, content, source_url, image_url, icon, sort_order, created_at, updated_at)
   VALUES (@category_id, @title, @slug, @summary, @content, '', @image_url, @icon, @sort_order, @created_at, @updated_at)
   ON CONFLICT(slug) DO UPDATE SET
     category_id = excluded.category_id,
     title = excluded.title,
     summary = excluded.summary,
     content = excluded.content,
     image_url = excluded.image_url,
     icon = excluded.icon,
     sort_order = excluded.sort_order,
     updated_at = excluded.updated_at`,
);

const write = db.transaction(() => {
  for (const item of items) {
    const sticker = art(item.stickerKey);
    const tips = item.tips.map((tip) => `• ${tip}`).join("\n");
    upsert.run({
      category_id: cat.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      content: `IMAGE::${sticker}\n\n## Javob\n\n${item.answer}\n\n## Qisqa yo‘l\n\n${tips}`,
      image_url: "",
      icon: item.icon,
      sort_order: item.n,
      created_at: now,
      updated_at: now,
    });
  }
});
write();

console.log(`FAQ seeded: ${items.length} savol, category ${cat.id}`);
