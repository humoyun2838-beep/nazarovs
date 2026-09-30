import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

let sqlite: Database.Database | null = null;

function openReadonly() {
  const dbPath = path.join(process.cwd(), "data", "nazarov.db");
  if (!fs.existsSync(dbPath)) return null;
  if (sqlite) return sqlite;
  sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
  sqlite.pragma("busy_timeout = 2000");
  return sqlite;
}

export function publicSlugExists(kind: "material" | "category", slug: string) {
  if (!slug || slug.includes("/") || slug.length > 180) return false;
  try {
    const db = openReadonly();
    if (!db) return true;
    const table = kind === "material" ? "materials" : "categories";
    const row = db
      .prepare(`SELECT 1 AS ok FROM ${table} WHERE slug = ? LIMIT 1`)
      .get(slug);
    return Boolean(row);
  } catch {
    return true;
  }
}
