import type Database from "better-sqlite3";

/** The revision changes in the same transaction as catalog writes. */
export function installCatalogRevision(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS catalog_revision (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO catalog_revision (id, revision) VALUES (1, 0);
  `);
  for (const table of ["categories", "materials"]) {
    for (const operation of ["INSERT", "UPDATE", "DELETE"]) {
      sqlite.exec(`CREATE TRIGGER IF NOT EXISTS revision_${table}_${operation.toLowerCase()}
        AFTER ${operation} ON ${table} BEGIN
          UPDATE catalog_revision SET revision = revision + 1 WHERE id = 1;
        END;`);
    }
  }
}
