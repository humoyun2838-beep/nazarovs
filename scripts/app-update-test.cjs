const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Database = require('better-sqlite3');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dmed-revision-'));
const file = path.join(dir, 'test.db');
const sqlite = new Database(file);
const code = ts.transpileModule(fs.readFileSync('src/db/catalog-revision.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(code, { exports: moduleObject.exports, module: moduleObject });
const install = moduleObject.exports.installCatalogRevision;
const safetyModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/app-update-safety.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: safetyModule.exports, module: safetyModule });
const blocks = safetyModule.exports.mediaBlocksUpdate;
assert.equal(blocks({ ended: false, paused: false, currentTime: 0 }), true);
assert.equal(blocks({ ended: false, paused: true, currentTime: 7 }), true, 'Paused lessons retain playback position');
assert.equal(blocks({ ended: false, paused: true, currentTime: 0 }), false);
assert.equal(blocks({ ended: true, paused: true, currentTime: 285 }), false);
try {
  sqlite.exec('CREATE TABLE categories (id INTEGER PRIMARY KEY, title TEXT); CREATE TABLE materials (id INTEGER PRIMARY KEY, title TEXT); CREATE TABLE chat_messages (id INTEGER PRIMARY KEY, body TEXT)');
  install(sqlite);
  const read = () => sqlite.prepare('SELECT revision FROM catalog_revision').get().revision;
  assert.equal(read(), 0);
  for (const table of ['categories', 'materials']) {
    const before = read();
    sqlite.prepare(`INSERT INTO ${table} VALUES (1, 'old')`).run();
    sqlite.prepare(`UPDATE ${table} SET title = 'new' WHERE id = 1`).run();
    sqlite.prepare(`DELETE FROM ${table} WHERE id = 1`).run();
    assert.equal(read(), before + 3, table + ' insert/update/delete advance revision');
  }
  install(sqlite);
  assert.equal(read(), 6, 'Idempotent initialization preserves revision');
  sqlite.exec("INSERT INTO chat_messages VALUES (1, 'private chat')");
  assert.equal(read(), 6, 'Chat polling/sending does not refresh unrelated screens');
  assert.throws(() => sqlite.transaction(() => {
    sqlite.exec("INSERT INTO categories VALUES (2, 'rollback')");
    throw new Error('rollback');
  })());
  assert.equal(read(), 6, 'Rolled-back writes do not notify clients');
  const second = new Database(file);
  second.exec("INSERT INTO categories VALUES (3, 'other process')");
  second.close();
  assert.equal(read(), 7, 'Other server processes share a persistent revision');
  console.log('PASS: catalog mutations, idempotence, chat isolation, rollback, cross-process revision, playing/paused/finished media');
} finally {
  sqlite.close();
  fs.rmSync(dir, { recursive: true });
}
