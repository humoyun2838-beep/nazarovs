const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const bank=require('../src/data/quiz-bank.json');const origin=process.env.BASE_URL||'http://127.0.0.1:3871';const report=[];
async function page(p,locale){const start=performance.now();const r=await fetch(origin+p,{signal:AbortSignal.timeout(20000)});const html=await r.text();assert.equal(r.status,200,p);assert.ok(html.includes(`lang="${locale}"`),p+' language');assert.ok(!html.includes('Application error:'),p+' no crash');report.push({path:p,status:r.status,ms:Math.round(performance.now()-start)});return html;}
(async()=>{
 for(const locale of ['uz','ru','en','kaa']){
  const hub=await page('/test?lang='+locale,locale);for(const slug of Object.keys(bank.sections))assert.ok(hub.includes(`/test/${slug}?lang=${locale}`),'Hub link '+slug);
  for(const slug of Object.keys(bank.sections)){const html=await page(`/test/${slug}?lang=${locale}`,locale);for(const id of bank.sections[slug])assert.ok(html.includes(id),'Question delivered '+id);}
  const home=await page('/nazarov?lang='+locale,locale);assert.ok(home.includes(`/test?lang=${locale}`),'Home test entry');
  const terms={uz:'bemor',ru:'пациент',en:'patient',kaa:'nawqas'};
  const r=await fetch(origin+`/api/search?lang=${locale}&q=${encodeURIComponent(terms[locale])}`);const result=await r.json();assert.equal(r.status,200);assert.ok(result.hits.length>0,locale+' localized search');report.push({path:'/api/search?lang='+locale,hits:result.hits.length});
 }
 const missing=await fetch(origin+'/test/does-not-exist');assert.equal(missing.status,404,'Unknown quiz is HTTP 404');
 const art=await fetch(origin+'/art/dmed-test.svg');assert.equal(art.status,200);assert.match(art.headers.get('content-type'),/image\/svg/);
 const guest=await fetch(origin+'/api/admin/ai');assert.equal(guest.status,401,'Guest boundary unchanged');
 const dir=path.join(__dirname,'../artifacts/quiz');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'routes.json'),JSON.stringify(report,null,2));console.log(`PASS: ${report.length} page/search checks + unknown section 404, quiz art and admin auth; ${origin}`);
})().catch(e=>{console.error(e.message);process.exitCode=1});
