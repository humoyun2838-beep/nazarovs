const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {hashSync}=require('bcryptjs');
const BASE='http://127.0.0.1:3871';
const dir='/private/tmp/dmed-operator-ranking-qa';
async function main(){
 await fetch(BASE+'/api/health');
 const db=new Database(dir+'/nazarov.db');
 const {SignJWT}=await import('jose');
 const secret=new TextEncoder().encode('dmed-operator-ranking-local-test-only');
 const token=async(role,id,name)=>new SignJWT({sub:String(id),username:name,role}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(secret);
 const id=Number(db.prepare("INSERT INTO users(username,password_hash,role,full_name,status) VALUES(?,?,'operator',?,'active')").run('ranking_qa_'+Date.now(),hashSync('Ranking-local-qa-2026',10),'Reyting sinov operatori').lastInsertRowid);
 const operator='nazarov_operator='+await token('operator',id,'ranking_qa');
 const adminRow=db.prepare("SELECT id,username FROM users WHERE role='admin' LIMIT 1").get();
 const admin='nazarov_session='+await token('admin',adminRow.id,adminRow.username);
 const client='nazarov_session='+await token('client',0,'client');
 const request=async(url,cookie='',body,origin=BASE)=>{
  const res=await fetch(BASE+url,{redirect:'manual',method:body?'POST':'GET',headers:{cookie,origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:res.status,data:await res.json().catch(()=>null)};
 };
 assert.equal((await request('/api/admin/chat-statistics')).status,401);
 assert.equal((await request('/api/admin/chat-statistics',operator)).status,401);
 assert.equal((await request('/api/operator/presence',client,{})).status,401);
 assert.equal((await request('/api/operator/presence',operator,{},'https://wrong.example')).status,403);
 assert.equal((await request('/api/operator/presence',operator,{userId:adminRow.id})).status,200);
 assert.equal(db.prepare('SELECT user_id FROM operator_work_intervals ORDER BY id DESC LIMIT 1').get().user_id,id);
 const session='operator-ranking-qa-'+Date.now();
 const now=new Date().toISOString();
 db.prepare("INSERT INTO chat_sessions(id,name,phone,email,language,page,created_at,status) VALUES(?,?,'','','uz','/qa',?,'open')").run(session,'Mahalliy sinov',now);
 assert.equal((await request('/api/operator/chat',operator,{action:'reply',sessionId:session,text:'Mahalliy sinov javobi',actorUserId:adminRow.id})).status,200);
 assert.equal(db.prepare('SELECT actor_user_id FROM chat_messages WHERE session_id=? ORDER BY id DESC LIMIT 1').get(session).actor_user_id,id);
 const category=db.prepare('SELECT id FROM categories LIMIT 1').get();
 assert.equal((await request('/api/operator/chat',operator,{action:'close',sessionId:session,categoryId:category.id})).status,200);
 assert.equal((await request('/api/operator/chat',operator,{action:'close',sessionId:session,categoryId:category.id})).status,409);
 const stats=await request('/api/admin/chat-statistics',admin);
 assert.equal(stats.status,200);
 const row=stats.data.stats.operators.find(r=>r.id===id);
 assert.equal(row.messages,1,'Rating prompt excluded'); assert.equal(row.closed,1); assert.equal(row.online,true);
 assert.equal((await request('/api/admin/chat-statistics?from=2026-10-19&to=2026-10-18',admin)).status,400);
 db.prepare("UPDATE users SET status='blocked' WHERE id=?").run(id);
 assert.ok([307,403].includes((await request('/api/operator/presence',operator,{})).status));
 db.prepare("UPDATE users SET status='active' WHERE id=?").run(id);
 // Keep isolated fixtures for browser visual verification; no production data is touched.
 require('node:fs').writeFileSync(dir+'/ui-fixture.json',JSON.stringify({username:db.prepare('SELECT username FROM users WHERE id=?').get(id).username,password:'Ranking-local-qa-2026'}));
 console.log('PASS: 16 API checks — role access, origin protection, authenticated author, closure idempotence, prompt exclusion, blocked operator and date validation');
 db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});
