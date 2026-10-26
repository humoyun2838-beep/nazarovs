const fs=require('node:fs');
const Database=require('better-sqlite3');
const {performance}=require('node:perf_hooks');
const BASE=process.env.BASE_URL||'http://127.0.0.1:3871';
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(BASE))throw Error('Load test is restricted to isolated localhost');
const TOTAL=Number(process.env.TOTAL||900);
async function main(){
 await fetch(BASE+'/api/health');
 const db=new Database('/private/tmp/dmed-performance-qa/nazarov.db');
 const {SignJWT}=await import('jose');
 const sign=(role,id,username)=>new SignJWT({sub:String(id),username,role}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode('dmed-performance-local-test-only'));
 const admin=db.prepare("SELECT id,username FROM users WHERE role='admin' LIMIT 1").get();
 const opid=Number(db.prepare("INSERT OR IGNORE INTO users(username,password_hash,role,full_name,status) VALUES('perf_operator','unused','operator','Test operator','active')").run().lastInsertRowid)||db.prepare("SELECT id FROM users WHERE username='perf_operator'").get().id;
 const cookies={admin:'nazarov_session='+await sign('admin',admin.id,admin.username),operator:'nazarov_operator='+await sign('operator',opid,'perf_operator'),guest:''};
 const sections=db.prepare('SELECT slug FROM categories ORDER BY id LIMIT 8').all();
 const lessons=db.prepare('SELECT slug FROM materials ORDER BY id LIMIT 12').all();
 const pool=[['/nazarov?lang=uz','guest'],['/nazarov?lang=ru','guest'],['/admin/login','guest'],['/operator','guest'],['/admin','admin'],['/admin/operatorlar','admin'],['/admin/mijozlar','admin'],['/admin/chat','admin'],['/operator','operator'],['/api/health','guest'],['/api/admin/chat?view=summary','admin'],['/api/admin/chat-workspace?view=inbox','admin'],['/api/admin/chat','admin'],['/api/admin/chat-statistics','admin'],['/api/operator/chat','operator'],['/api/search?q=shifokor','guest'],...sections.map(r=>['/b/'+r.slug,'guest']),...lessons.map(r=>['/m/'+r.slug,'guest']),['/admin-art/learning-v1.webp','guest'],['/m/performance-missing-404','guest',404],['/api/admin/chat?view=summary','guest',401]];
 const out=[];let cursor=0;
 async function worker(){while(cursor<TOTAL){const i=cursor++;const [path,role,expected=200]=pool[i%pool.length];let row={i,path,role,expected};let start=performance.now();try{const r=await fetch(BASE+path,{headers:{cookie:cookies[role]},signal:AbortSignal.timeout(30000)});const bytes=Buffer.from(await r.arrayBuffer());const b=bytes.toString('utf8');row={...row,status:r.status,bytes:bytes.length,ms:Math.round((performance.now()-start)*10)/10,ok:r.status===expected};if(path.endsWith('.webp'))row.ok&&=r.headers.get('content-type')?.includes('image/webp')&&bytes.toString('ascii',0,4)==='RIFF';if(path.includes('view=summary')&&role==='admin'&&process.env.CHECK_LIGHTWEIGHT==='1'){const j=JSON.parse(b);row.ok&&=typeof j.unread==='number'&&!('stats'in j)&&!('sessions'in j);}}catch(e){row={...row,status:0,ms:Math.round(performance.now()-start),ok:false,error:String(e)}}out.push(row);if(out.length%100===0)console.log('progress '+out.length+'/'+TOTAL);}}
 await Promise.all(Array.from({length:6},worker));
 const groups={};for(const r of out){(groups[r.path+' ['+r.role+']']??=[]).push(r)}
 const summary=Object.fromEntries(Object.entries(groups).map(([p,rs])=>[p,{n:rs.length,failed:rs.filter(r=>!r.ok).length,avgMs:Math.round(rs.reduce((a,r)=>a+r.ms,0)/rs.length),avgBytes:Math.round(rs.reduce((a,r)=>a+(r.bytes||0),0)/rs.length)}]));
 const times=out.map(r=>r.ms).sort((a,b)=>a-b);const report={total:out.length,concurrency:6,passed:out.filter(r=>r.ok).length,failed:out.filter(r=>!r.ok),avgMs:Math.round(times.reduce((a,b)=>a+b,0)/times.length),p95Ms:times[Math.floor(times.length*.95)],byPath:summary};
 fs.writeFileSync(process.env.REPORT||'/private/tmp/dmed-performance-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.failed.length)process.exitCode=1;db.close();
}main().catch(e=>{console.error(e);process.exitCode=1});
