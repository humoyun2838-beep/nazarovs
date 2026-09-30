import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashSync } from "bcryptjs";
import { groupDmedMaterials } from "@/lib/dmed-group";
import { dataDir as resolveDataDir } from "@/lib/data-dir";
import * as schema from "./schema";

const dataDir = resolveDataDir();
const dbPath = path.join(dataDir, "nazarov.db");

function createDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 10000");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -16000");
  sqlite.pragma("mmap_size = 268435456");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'book-open',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'file-text',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // migrate older DBs without role column
  const cols = sqlite.prepare(`PRAGMA table_info(users)`).all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === "role")) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'client'`);
  }

  const materialCols = sqlite.prepare(`PRAGMA table_info(materials)`).all() as {
    name: string;
  }[];
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
    CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
    CREATE INDEX IF NOT EXISTS idx_materials_slug ON materials(slug);
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'uz',
      page TEXT NOT NULL DEFAULT '',
      visitor_ip TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      body TEXT NOT NULL,
      telegram_ok INTEGER NOT NULL DEFAULT 0,
      telegram_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON chat_sessions(created_at);
  `);

  const chatCols = sqlite.prepare(`PRAGMA table_info(chat_messages)`).all() as {
    name: string;
  }[];
  if (!chatCols.some((c) => c.name === "telegram_payload")) {
    sqlite.exec(
      `ALTER TABLE chat_messages ADD COLUMN telegram_payload TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!chatCols.some((c) => c.name === "telegram_mid")) {
    sqlite.exec(
      `ALTER TABLE chat_messages ADD COLUMN telegram_mid INTEGER NOT NULL DEFAULT 0`,
    );
  }
  if (!chatCols.some((c) => c.name === "kind")) {
    sqlite.exec(
      `ALTER TABLE chat_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'`,
    );
  }
  if (!chatCols.some((c) => c.name === "media_key")) {
    sqlite.exec(
      `ALTER TABLE chat_messages ADD COLUMN media_key TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!chatCols.some((c) => c.name === "mime")) {
    sqlite.exec(
      `ALTER TABLE chat_messages ADD COLUMN mime TEXT NOT NULL DEFAULT ''`,
    );
  }

  const sessionCols = sqlite.prepare(`PRAGMA table_info(chat_sessions)`).all() as {
    name: string;
  }[];
  if (!sessionCols.some((c) => c.name === "last_read_at")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN last_read_at TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!sessionCols.some((c) => c.name === "last_visitor_seen_at")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN last_visitor_seen_at TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!sessionCols.some((c) => c.name === "status")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'open'`,
    );
  }
  if (!sessionCols.some((c) => c.name === "closed_at")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN closed_at TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!sessionCols.some((c) => c.name === "last_operator_at")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN last_operator_at TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!sessionCols.some((c) => c.name === "rating")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN rating TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!sessionCols.some((c) => c.name === "rated_at")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN rated_at TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!sessionCols.some((c) => c.name === "visitor_ip")) {
    sqlite.exec(
      `ALTER TABLE chat_sessions ADD COLUMN visitor_ip TEXT NOT NULL DEFAULT ''`,
    );
  }

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_operator ON chat_sessions(status, last_operator_at);
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_templates (
      id TEXT PRIMARY KEY,
      lang TEXT NOT NULL DEFAULT 'uz',
      label TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_templates_lang ON chat_templates(lang, created_at);
  `);

  const drizzleDb = drizzle(sqlite, { schema });
  seedIfEmpty(sqlite, drizzleDb);
  return { db: drizzleDb, sqlite };
}

function ensurePortalUser(
  sqlite: Database.Database,
  username: string,
  password: string,
  role: "client" | "admin",
) {
  const existing = sqlite
    .prepare(`SELECT id, role, password_hash FROM users WHERE username = ?`)
    .get(username) as
    | { id: number; role: string; password_hash: string }
    | undefined;

  const hashCost = (hash: string) => {
    const part = hash.split("$")[2];
    const n = Number(part);
    return Number.isFinite(n) ? n : 10;
  };

  // Never bcrypt on the hot path — only when missing or hash is too expensive.
  if (!existing) {
    try {
      sqlite
        .prepare(
          `INSERT INTO users (username, password_hash, role)
           VALUES (?, ?, ?)
           ON CONFLICT(username) DO NOTHING`,
        )
        .run(username, hashSync(password, 4), role);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (!code.includes("CONSTRAINT")) throw error;
    }
    return;
  }

  if (hashCost(existing.password_hash) > 6) {
    sqlite
      .prepare(`UPDATE users SET password_hash = ?, role = ? WHERE id = ?`)
      .run(hashSync(password, 4), role, existing.id);
    return;
  }

  if (existing.role !== role) {
    sqlite
      .prepare(`UPDATE users SET role = ? WHERE id = ?`)
      .run(role, existing.id);
  }
}

function seedIfEmpty(
  sqlite: Database.Database,
  _db: ReturnType<typeof drizzle<typeof schema>>,
) {
  const run = sqlite.transaction(() => {
    seedPortalAndCatalog(sqlite);
  });
  try {
    run.immediate();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code.includes("BUSY") || code.includes("CONSTRAINT")) return;
    throw error;
  }
}

function seedPortalAndCatalog(sqlite: Database.Database) {
  const clientUser = process.env.CLIENT_USERNAME || process.env.AUTH_USERNAME || "akbar";
  const clientPass = process.env.CLIENT_PASSWORD || process.env.AUTH_PASSWORD || "9915504";
  const adminUser = process.env.ADMIN_USERNAME || "Nazarov";
  const adminPass = process.env.ADMIN_PASSWORD || "admin9915504";

  ensurePortalUser(sqlite, clientUser, clientPass, "client");
  ensurePortalUser(sqlite, adminUser, adminPass, "admin");

  // keep only the two portal accounts
  sqlite
    .prepare(`DELETE FROM users WHERE username NOT IN (?, ?)`)
    .run(clientUser, adminUser);

  const categoryCount = sqlite
    .prepare(`SELECT COUNT(*) AS count FROM categories`)
    .get() as { count: number };

  if (categoryCount.count > 0) return;

  // Prefer DMED seed grouped like Notion learning-materials-uzb
  const onlyPath = path.join(process.cwd(), "src/data/dmed-only.json");
  if (fs.existsSync(onlyPath)) {
    try {
      const seed = JSON.parse(fs.readFileSync(onlyPath, "utf8")) as {
        materials: Array<{
          title: string;
          slug: string;
          summary?: string;
          content?: string;
          icon?: string;
          sourceUrl?: string;
        }>;
      };

      const sections = groupDmedMaterials(seed.materials);
      const insertCategory = sqlite.prepare(
        `INSERT INTO categories (title, slug, description, icon, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      );
      const insertMaterial = sqlite.prepare(`
        INSERT INTO materials (
          category_id, title, slug, summary, content, source_url, icon, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      sections.forEach((section) => {
        const cat = insertCategory.run(
          section.title,
          section.slug,
          section.description,
          section.icon || "file-text",
          section.sortOrder,
        );
        const categoryId = Number(cat.lastInsertRowid);
        section.materials.forEach((material, index) => {
          insertMaterial.run(
            categoryId,
            material.title,
            material.slug,
            material.summary || `DMED · ${section.title}`,
            material.content || "",
            material.sourceUrl || "",
            material.icon || "file-text",
            index + 1,
            now,
            now,
          );
        });
      });
      return;
    } catch (error) {
      console.error("DMED-only seed failed", error);
    }
  }

  // minimal fallback seed
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO categories (title, slug, description, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      "DMED",
      "dmed",
      "DMED bo‘yicha o‘quv materiallari",
      "stethoscope",
      1,
    );
}

const globalForDb = globalThis as unknown as {
  nazarovStore?: ReturnType<typeof createDb>;
};

const store = globalForDb.nazarovStore ?? createDb();
export const db = store.db;
export const sqlite = store.sqlite;

if (process.env.NODE_ENV !== "production") {
  globalForDb.nazarovStore = store;
}
