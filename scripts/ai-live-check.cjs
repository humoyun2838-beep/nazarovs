/* Local live AI smoke test: synthetic conversation only, always cleaned up. */
const assert=require('node:assert/strict');const path=require('node:path');const {randomUUID}=require('node:crypto');
require(require.resolve('@next/env',{paths:[path.dirname(require.resolve('next/package.json'))]})).loadEnvConfig(process.cwd());
const Database=require('better-sqlite3');const db=new Database(path.join(process.env.DATA_DIR||'runtime-data','nazarov.db'));const sid='ai-qa-'+randomUUID();let checks=0;
const check=(c,m)=>{assert.ok(c,m);checks++};
(async()=>{const {SignJWT}=await import('jose');const secret=new TextEncoder().encode(process.env.AUTH_SECRET||'nazarov-uz-local-dev-secret-change-me');
const user=role=>db.prepare('SELECT id,username FROM users WHERE role=? AND status=? LIMIT 1').get(role,'active');
const cookie=async role=>{const u=user(role);assert.ok(u,role+' account required');return 'nazarov_session='+await new SignJWT({sub:String(u.id),username:u.username,role}).setProtectedHeader({alg:'HS256'}).setExpirationTime('5m').sign(secret)};
const admin=await cookie('admin'),operator=await cookie('operator');
async function req(port,c,body){const r=await fetch(`http://127.0.0.1:${port}/api/${port===3852?'admin/ai':'operator/chat-workspace'}`,{method:'POST',headers:{cookie:c,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});const j=await r.json();return {r,j}}
const panel=await req(3852,admin,{action:'panel',text:'Faqat AI_ULANDI deb yozing.'});console.log(JSON.stringify({test:'admin-live',status:panel.r.status,ok:panel.j.ok,error:panel.j.error||null}));check(panel.r.ok&&panel.j.ok&&panel.j.text?.includes('AI_ULANDI'),'Admin generates live answer');
check((await req(3852,'',{action:'panel',text:'test'})).r.status===401,'Guest admin AI blocked');
check((await req(3852,operator,{action:'panel',text:'test'})).r.status===401,'Operator admin AI blocked');
const now=new Date().toISOString();db.prepare("INSERT INTO chat_sessions(id,name,phone,created_at,assigned_user_id) VALUES(?,'AI test fixture','+998900000000',?,?)").run(sid,now,user('operator').id);db.prepare("INSERT INTO chat_messages(session_id,role,body,created_at) VALUES(?,'visitor','DMED tizimiga qanday kiraman? Qisqa javob bering.',?)").run(sid,now);
const ai=await req(3853,operator,{action:'ai',sessionId:sid});console.log(JSON.stringify({test:'operator-live',status:ai.r.status,ok:ai.j.ok,error:ai.j.error||null}));check(ai.r.ok&&ai.j.ok,'Operator AI succeeds');const n=db.prepare("SELECT count(*) n FROM chat_messages WHERE session_id=? AND role='dmed'").get(sid).n;check(n===1,'AI writes one reply to synthetic chat');
const again=await req(3853,operator,{action:'ai',sessionId:sid});check(again.r.ok,'Repeated AI request succeeds');check(db.prepare("SELECT count(*) n FROM chat_messages WHERE session_id=? AND role='dmed'").get(sid).n===n,'Repeated AI does not duplicate reply');
console.log('PASS: '+checks+' live AI checks');
})().catch(e=>{console.error('FAIL: '+e.message);process.exitCode=1}).finally(()=>{db.prepare('DELETE FROM chat_messages WHERE session_id=?').run(sid);db.prepare('DELETE FROM chat_sessions WHERE id=?').run(sid);db.close()});
