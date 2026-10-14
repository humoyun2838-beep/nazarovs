import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sqlite } from '../src/db';
import { localizedMaterialContent } from '../src/lib/material-translation';
import { protectTranslation } from '../src/lib/translation-format';
const rows=sqlite.prepare("SELECT slug,content FROM materials WHERE slug IN ('login-to-system-uz','notion-ru-3dc60b77fbf580868bb6c526fb6e2c04')").all() as Array<{slug:string;content:string}>;
assert.equal(rows.length,2);let checks=0;const report=[];
for(const row of rows){for(const locale of ['uz','ru','en','kaa'] as const){const start=performance.now(),result=await localizedMaterialContent(row,locale);assert.ok(result.translated,`${row.slug} ${locale} translation succeeds`);checks++;assert.ok(result.content.trim());checks++;const markers=(s:string)=>s.split('\n').filter(l=>/^(IMAGE|VIDEO|FILE)::/.test(l)).sort();assert.deepEqual(markers(result.content),markers(row.content),'All media preserved');checks++;const hrefs=(s:string)=>[...s.matchAll(/\]\((\/m\/[^)]+)\)/g)].map(m=>m[1]).sort();assert.deepEqual(hrefs(result.content),hrefs(row.content),'All lesson links preserved');checks++;const numbers=(s:string)=>JSON.stringify((s.replace(/^(IMAGE|VIDEO|FILE)::.*$/gm,'').match(/\d+(?:[.,]\d+)*/g)||[]).sort());assert.equal(numbers(result.content),numbers(row.content),'All numbers preserved');checks++;const again=await localizedMaterialContent(row,locale);assert.equal(again.content,result.content,'Cached result stable');checks++;report.push({slug:row.slug,locale,ms:Math.round(performance.now()-start),chars:result.content.length});}}
const protectedText=protectTranslation('1. Open /m/example?lang=en and https://example.com/a.png');assert.throws(()=>protectedText.restore('missing'),'Missing protected link rejected');checks++;
fs.writeFileSync('artifacts/i18n/content-test.json',JSON.stringify({checks,report},null,2));console.log(JSON.stringify({checks,report}));
