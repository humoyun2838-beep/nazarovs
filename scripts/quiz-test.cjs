const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const root=path.resolve(__dirname,'..');const cache=new Map();
function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;cache.set(file,mod.exports);new Function('require','module','exports',code)(id=>{if(id==='server-only')return {};let target=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(file),id);return load(target.endsWith('.json')?target:target+'.ts');},mod,mod.exports);return mod.exports;}
const {getQuiz,quizSections,quizVersion}=load('src/lib/quiz-data.ts');const {quizScore,restoreAttempt,quizQuestionCount:N}=load('src/lib/quiz.ts');const {quizCopy}=load('src/lib/quiz-copy.ts');
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const locales=['uz','ru','en','kaa'];assert.equal(Object.keys(quizSections).length,26);
// Har bo'limda N ta savol va hech ikki bo'lim bir xil to'plamga ega bo'lmasligi kerak.
const slugs=Object.keys(quizSections);
for(const slug of slugs)check(quizSections[slug].length===N&&new Set(quizSections[slug]).size===N,slug+' has '+N+' distinct ids');
for(let i=0;i<slugs.length;i++)for(let j=i+1;j<slugs.length;j++){const a=new Set(quizSections[slugs[i]]);const shared=quizSections[slugs[j]].filter(id=>a.has(id));check(shared.length<N,'Sections differ: '+slugs[i]+' vs '+slugs[j]);}
for(const [slug,ids] of Object.entries(quizSections)){
 let baseline;
 for(const lang of locales){const qs=getQuiz(slug,lang);check(qs.length===N,slug+' '+N+' questions');check(new Set(qs.map(q=>q.prompt)).size===N,'No duplicate prompts');const positions=[0,0,0,0];
  for(const q of qs){check(q.prompt.includes('_____'),'Visible blank');check(q.explanation&&!q.explanation.includes('{}'),'Complete explanation');check(Object.hasOwn(quizSections,q.source),'Live study section');check(q.choices.length===4&&new Set(q.choices.map(c=>c.id)).size===4,'Four distinct choices');check(new Set(q.choices.map(c=>c.text.toLowerCase())).size===4,'No duplicate choice labels');check(q.choices.every(c=>c.text.trim()),'No empty answers');positions[q.choices.findIndex(c=>c.id===q.correct)]++;}
  // To'g'ri javob o'rinlari teng taqsimlanadi (farq ko'pi bilan 1).
  check(positions.reduce((a,b)=>a+b,0)===N&&Math.max(...positions)-Math.min(...positions)<=1,'Answer positions balanced: '+positions.join(','));
  const identities=qs.map(q=>[q.id,q.correct,q.choices.map(c=>c.id)]);if(baseline)assert.deepEqual(identities,baseline,'Language preserves question/answer identity');else baseline=identities;checks++;
  const answers=Object.fromEntries(qs.map(q=>[q.id,q.correct]));assert.deepEqual(quizScore(qs,answers),{answered:N,correct:N,total:N,percent:100});checks++;
  const wrong=Object.fromEntries(qs.map(q=>[q.id,q.choices.find(c=>c.id!==q.correct).id]));assert.deepEqual(quizScore(qs,wrong),{answered:N,correct:0,total:N,percent:0});checks++;
  for(let n=0;n<=N;n++){const partial=Object.fromEntries(qs.slice(0,n).map(q=>[q.id,q.correct]));const r=quizScore(qs,partial);check(r.answered===n&&r.percent===Math.round(n/N*100),'Partial score');const restored=restoreAttempt(JSON.stringify({version:quizVersion,answers:partial,index:999,finished:true}),quizVersion,qs);check(restored.finished===(n===N)&&restored.index===N-1,'Incomplete cannot finish; index bounded');}
  const valid={version:quizVersion,answers,index:5,finished:true};assert.deepEqual(restoreAttempt(JSON.stringify(valid),quizVersion,qs),valid);checks++;
  for(const raw of ['bad',null,'null','{}','[]',JSON.stringify({...valid,version:'old'}),JSON.stringify({...valid,answers:{[qs[0].id]:'invalid'},index:-5})]){const a=restoreAttempt(raw,quizVersion,qs);check(a.index===0&&!a.finished&&Object.keys(a.answers).length===0,'Malformed/stale state reset safely');}
 }
}
const fields=Object.keys(quizCopy('uz'));for(const lang of locales)for(const field of fields)check(Boolean(quizCopy(lang)[field]),'UI copy '+lang+' '+field);
const {localizeCatalogTitle}=load('src/lib/catalog-locale.ts');
const sectionTitles=load('src/data/section-titles.json');
for(const slug of Object.keys(quizSections))for(const lang of ['ru','en','kaa'])check(localizeCatalogTitle(slug,'Untranslated source title',lang)===sectionTitles[slug][lang],'Complete section title '+slug+' '+lang);
check(getQuiz('not-a-section','uz')===null,'Unknown section rejected');
console.log(`PASS: ${checks} quiz checks — 26 sections × ${N} questions × 4 languages, unique section sets, scoring, restoration, invalid state, answer balance`);
