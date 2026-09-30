#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { groupDmedMaterials } = require("./dmed-group.cjs");

const dbPath = path.join(process.cwd(), "data", "nazarov.db");
const seedPath = path.join(process.cwd(), "src/data/dmed-only.json");

if (!fs.existsSync(seedPath)) {
  console.error("Missing", seedPath);
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const sections = groupDmedMaterials(seed.materials || []);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");

const materialCols = sqlite.prepare(`PRAGMA table_info(materials)`).all();
if (!materialCols.some((c) => c.name === "source_url")) {
  sqlite.exec(
    `ALTER TABLE materials ADD COLUMN source_url TEXT NOT NULL DEFAULT ''`,
  );
}
if (!materialCols.some((c) => c.name === "image_url")) {
  sqlite.exec(
    `ALTER TABLE materials ADD COLUMN image_url TEXT NOT NULL DEFAULT ''`,
  );
}

sqlite.exec(`
  DELETE FROM materials;
  DELETE FROM categories;
`);

const insertCategory = sqlite.prepare(`
  INSERT INTO categories (title, slug, description, icon, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);

const insertMaterial = sqlite.prepare(`
  INSERT INTO materials (
    category_id, title, slug, summary, content, source_url, icon, sort_order, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
const tx = sqlite.transaction(() => {
  sections.forEach((section) => {
    const info = insertCategory.run(
      section.title,
      section.slug,
      section.description,
      section.icon,
      section.sortOrder,
    );
    const categoryId = Number(info.lastInsertRowid);
    section.materials.forEach((m, i) => {
      insertMaterial.run(
        categoryId,
        m.title,
        m.slug,
        m.summary || "",
        m.content || "",
        m.sourceUrl || "",
        m.icon || "file-text",
        i + 1,
        now,
        now,
      );
    });
  });
});
tx();

console.log(
  "categories:",
  sqlite.prepare("SELECT sort_order, title FROM categories ORDER BY sort_order").all(),
);
console.log(
  "materials:",
  sqlite.prepare("SELECT count(*) AS c FROM materials").get().c,
);
sqlite.close();
