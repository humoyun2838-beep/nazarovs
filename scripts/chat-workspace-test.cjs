/** Local integration checks. Creates only named test fixtures and cleans them up. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID, randomBytes } = require('node:crypto');
require(require.resolve('@next/env', { paths: [path.dirname(require.resolve('next/package.json'))] })).loadEnvConfig(process.cwd());
const Database = require('better-sqlite3');
const { hashSync } = require('bcryptjs');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3847';
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)) throw new Error('Local test only');
const db = new Database(path.join(process.env.DATA_DIR || 'data', 'nazarov.db'));
db.pragma('foreign_keys = ON');
const prefix = 'chat-qa-' + randomUUID();
const fixtures = [];
let operatorId, templateId;
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };

async function main() {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'nazarov-uz-local-dev-secret-change-me');
  const token = async payload => new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(secret);
  const admin = db.prepare("SELECT id, username FROM users WHERE role='admin' LIMIT 1").get();
  const adminCookie = 'nazarov_session=' + await token({ sub: String(admin.id), username: admin.username, role: 'admin' });
  const password = ' ' + randomBytes(18).toString('hex') + ' ';
  const username = 'qa_' + randomBytes(5).toString('hex');
  operatorId = Number(db.prepare("INSERT INTO users(username,password_hash,role,full_name,status) VALUES(?,?,'operator','Interfeys sinovi','active')").run(username, hashSync(password, 10)).lastInsertRowid);
  const operatorCookie = 'nazarov_session=' + await token({ sub: String(operatorId), username, role: 'operator' });
  const clientCookie = 'nazarov_session=' + await token({ sub: '0', username: 'qa_client', role: 'client' });
  const login = await fetch(BASE + '/api/login', {
    method: 'POST', redirect: 'manual',
    body: new URLSearchParams({ username, password, role: 'operator', next: '/operator' }),
  });
  check(login.status === 303 && new URL(login.headers.get('location'), BASE).pathname === '/operator', 'Operator password with spaces authenticates');
  check((login.headers.get('set-cookie') || '').includes('nazarov_operator='), 'Operator receives dedicated session cookie');
  const rejected = await fetch(BASE + '/api/login', {
    method: 'POST', redirect: 'manual',
    body: new URLSearchParams({ username, password: 'wrong-password', role: 'operator' }),
  });
  check(rejected.status === 303 && rejected.headers.get('location').includes('error=invalid') && !(rejected.headers.get('set-cookie') || '').includes('nazarov_operator='), 'Wrong password is rejected without issuing a session');
  async function req(url, cookie = '', body) {
    const targetBase = process.env.SEPARATE_SITES === '1' && !url.startsWith('/api/')
      ? (url.startsWith('/admin') ? 'http://127.0.0.1:3852' : url.startsWith('/operator') ? 'http://127.0.0.1:3853' : 'http://127.0.0.1:3850') : BASE;
    const r = await fetch(targetBase + url, { redirect: 'manual', headers: { cookie, 'content-type': 'application/json', 'x-nazarov-chat-test': '1' }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    const content = await r.text();
    let data; try { data = JSON.parse(content); } catch { data = null; }
    return { status: r.status, data, content, headers: r.headers };
  }
  const statsUrl = '/api/admin/chat-statistics';
  const dedicatedOperatorCookie = (login.headers.get('set-cookie') || '').split(';')[0];
  check((await req('/nazarov', dedicatedOperatorCookie)).status === 200, 'Dedicated operator sign-in does not hijack the separate public catalog');
  check((await req(statsUrl, dedicatedOperatorCookie)).status === 401, 'Dedicated operator cookie grants no admin statistics access');
  const dash = await req(statsUrl, adminCookie);
  check(dash.status === 200 && dash.data.stats.modules, 'Admin sees module statistics');
  check(dash.headers.get('cache-control').includes('no-store'), 'Statistics are never publicly cached');
  for (const cookie of ['', operatorCookie, clientCookie]) {
    check((await req(statsUrl, cookie)).status === 401, 'Statistics blocked for non-admin');
    check((await req('/api/admin/chat-workspace', cookie)).status === 401, 'Admin chat blocked for non-admin');
  }
  for (const query of ['?from=2026-02-30', '?from=2026-10-09&to=2026-10-01', '?to=invalid', '?from=2026-10-01', '?from=2024-01-01&to=2026-10-09']) {
    check((await req(statsUrl + query, adminCookie)).status === 400, 'Invalid date filter rejected');
  }
  const list = await req('/api/operator/chat-workspace', operatorCookie);
  check(list.status === 200 && list.data.categories.length && list.data.templates.uz.length, 'Operator receives categories and templates');
  check(!('stats' in list.data) && !('modules' in list.data), 'Operator response contains no statistics');
  const category = list.data.categories[0];
  const allCategories = db.prepare('SELECT id, title, slug FROM categories ORDER BY sort_order, id').all();
  check(JSON.stringify(list.data.categories) === JSON.stringify(allCategories), 'Every current catalogue section is selectable, with its icon slug');
  function fixture(owner = 0) {
    const id = prefix + '-' + fixtures.length; fixtures.push(id);
    db.prepare("INSERT INTO chat_sessions(id,name,phone,created_at,assigned_user_id) VALUES(?,'Interfeys sinovi — mijoz','+998900000000',?,?)").run(id,new Date().toISOString(),owner);
    db.prepare("INSERT INTO chat_messages(session_id,role,body,created_at) VALUES(?,'visitor','Tizimga kirish bo‘yicha yordam kerak.',?)").run(id,new Date().toISOString());
    return id;
  }
  const id = fixture(operatorId);
  const taken = fixture(admin.id);
  check((await req('/api/operator/chat-workspace', operatorCookie, {action:'close',sessionId:id})).status === 400, 'Category is required');
  check((await req('/api/operator/chat-workspace', operatorCookie, {action:'close',sessionId:id,categoryId:999999})).status === 400, 'Invalid category rejected');
  check(db.prepare('SELECT status FROM chat_sessions WHERE id=?').get(id).status === 'open', 'Invalid closure leaves chat open');
  check((await req('/api/operator/chat-workspace', operatorCookie, {action:'reply',sessionId:taken,text:'Must not send'})).status === 409, 'Cannot reply to another operator conversation');
  check((await req('/api/operator/chat-workspace', operatorCookie, {action:'close',sessionId:taken,categoryId:category.id})).status === 409, 'Cannot close another operator conversation');
  check((await req('/api/operator/chat-workspace', operatorCookie, {action:'unknown',sessionId:id,text:'Must not send'})).status === 400, 'Unknown action cannot send messages');
  const reply = await req('/api/operator/chat-workspace', operatorCookie, {action:'reply',sessionId:id,text:'Qo‘llanmani ochib, kirish tartibini ko‘ring.'});
  check(reply.status === 200 && reply.data.session.messages.some(m=>m.body.includes('Qo‘llanmani')), 'Operator reply reaches correct thread');
  const template = await req('/api/operator/chat-workspace', operatorCookie, {action:'template-save',lang:'uz',label:'QA sinov',body:'Sinov uchun tayyor javob.'});
  templateId = template.data?.template?.id;
  check(template.status === 200 && templateId, 'Operator can create a template');
  check((await req('/api/admin/chat-workspace', adminCookie)).data.templates.uz.some(t=>t.id===templateId), 'Template is shared with admin');
  const before = (await req(statsUrl, adminCookie)).data.stats.modules.find(m=>m.id===category.id)?.conversations || 0;
  const close = await req('/api/operator/chat-workspace', operatorCookie, {action:'close',sessionId:id,categoryId:category.id});
  check(close.status === 200 && close.data.session.inquiryCategoryTitle===category.title, 'Operator closure saves module');
  check(!('stats' in close.data), 'Closure does not leak statistics to operator');
  const saved = db.prepare('SELECT * FROM chat_sessions WHERE id=?').get(id);
  check(saved.closed_by_user_id===operatorId && saved.status==='closed', 'Actor and closure persisted');
  const after = (await req(statsUrl, adminCookie)).data.stats.modules.find(m=>m.id===category.id);
  check(after.conversations===before+1, 'Dashboard increments the selected module');
  check((await req('/api/operator/chat-workspace', operatorCookie, {action:'close',sessionId:id,categoryId:category.id})).status===409, 'Duplicate close rejected');
  const visitorToken = await new SignJWT({sid:id}).setProtectedHeader({alg:'HS256'}).setExpirationTime('15m').sign(new TextEncoder().encode('chat:'+(process.env.AUTH_SECRET||'nazarov-uz-local-dev-secret-change-me')));
  const visitor = 'dmed_chat=' + visitorToken;
  const publicThread = await req('/api/chat', visitor);
  check(publicThread.data.session.canRate && !publicThread.data.session.canSend, 'Visitor can rate closed chat and cannot send');
  check(!('stats' in publicThread.data) && !('modules' in publicThread.data.session), 'Visitor receives no statistics');
  check((await req('/api/chat', visitor, {action:'rate',rating:5})).data.ok, 'Visitor rating succeeds');
  check((await req('/api/chat', visitor, {action:'message',text:'Cannot send after closure'})).status>=400, 'Closed chat rejects visitor messages');
  const home = await req('/admin?lang=uz', adminCookie);
  check(home.status===200 && home.content.includes('data-admin-stats="visible"'), 'Admin homepage displays module summary');
  for (const cookie of [operatorCookie, clientCookie]) check((await req('/admin/chat?view=statistics',cookie)).status>=300, 'Non-admin cannot view statistics page');
  const catalog = await req('/nazarov?lang=uz');
  check(catalog.status===200 && !catalog.content.includes('data-admin-chat="stats"'), 'Public catalog has no admin dashboard');
  if (process.argv.includes('--keep')) {
    const demo = fixture(operatorId);
    const file = process.env.QA_FIXTURE_FILE;
    if (!file) throw new Error('QA_FIXTURE_FILE required for --keep');
    fs.writeFileSync(file, JSON.stringify({ username,password,operatorId,fixtures,templateId,demo }), {mode:0o600});
  }
  console.log(`PASS: ${checks} integration checks across admin, operator and visitor. Only test fixtures modified.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>{
  if (!process.argv.includes('--keep') || process.exitCode) {
    for (const id of fixtures) { db.prepare('DELETE FROM chat_messages WHERE session_id=?').run(id); db.prepare('DELETE FROM chat_sessions WHERE id=?').run(id); }
    if (templateId) db.prepare('DELETE FROM chat_templates WHERE id=?').run(templateId);
    if (operatorId) db.prepare('DELETE FROM users WHERE id=?').run(operatorId);
  }
  db.close();
});
