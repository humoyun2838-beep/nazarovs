import "server-only";
import { createHash } from "node:crypto";
import { sqlite } from "@/db";
import { openaiKey } from "@/lib/ai";
import type { Locale } from "@/lib/locale";
import { requestTranslations } from "@/lib/translation-api";
import { translationKey } from "@/lib/translation-format";
import { translateCatalog } from "@/lib/ui-translation";

sqlite.exec("CREATE TABLE IF NOT EXISTS site_translations(source_hash TEXT NOT NULL,locale TEXT NOT NULL,text TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(source_hash,locale))");
if (!(sqlite.prepare("PRAGMA table_info(site_translations)").all() as Array<{name:string}>).some(row=>row.name==="translation_rev")) sqlite.exec("ALTER TABLE site_translations ADD COLUMN translation_rev TEXT NOT NULL DEFAULT 'legacy'");
const hash=(text:string)=>createHash("sha256").update(translationKey(text)).digest("hex");
const read=sqlite.prepare("SELECT text,translation_rev FROM site_translations WHERE source_hash=? AND locale=?");
const write=sqlite.prepare("INSERT INTO site_translations(source_hash,locale,text,updated_at,translation_rev) VALUES(?,?,?,?,?) ON CONFLICT(source_hash,locale) DO UPDATE SET text=excluded.text,updated_at=excluded.updated_at,translation_rev=excluded.translation_rev");
const inFlight=new Map<string,Promise<string>>();
let active=0;const waiting:Array<()=>void>=[];
async function limited<T>(work:()=>Promise<T>) { if(active>=4)await new Promise<void>(resolve=>waiting.push(resolve));else active++;try{return await work();}finally{const next=waiting.shift();if(next)next();else active--;} }
const pending=new Map<string,Promise<string>>();
export function cachedMaterialContent(material:{slug:string;content:string},locale:Locale) {
  const native=material.slug.startsWith("notion-ru-")?"ru":"uz";
  if(locale===native)return {content:material.content,translated:true};
  let complete=true;
  const content=material.content.split(/(\r?\n)/).map(part=>{
    const source=translationKey(part);
    if(!source||/^(IMAGE|VIDEO|FILE)::/.test(source)||/^https?:\/\//.test(source))return part;
    const stored=read.get(hash(source),locale) as {text:string;translation_rev:string}|undefined;
    const value=translateCatalog(source,locale)||(stored?.translation_rev===(locale==="kaa"?"kaa-v2":"stable-v2")?stored.text:undefined);
    if(!value)complete=false;
    return value||part;
  }).join("");
  return complete?{content,translated:true}:null;
}
async function translatedLines(lines:string[],locale:Locale){
  const result=new Map<string,string>();const missing:string[]=[];const existing:Promise<void>[]=[];
  for(const source of [...new Set(lines.map(translationKey))]){if(!source||/^(IMAGE|VIDEO|FILE)::/.test(source)||/^https?:\/\//.test(source))continue;const stored=read.get(hash(source),locale) as {text?:string;translation_rev?:string}|undefined;const cached=translateCatalog(source,locale)||(stored?.translation_rev!==(locale==="kaa"?"kaa-v2":"stable-v2")?undefined:stored?.text);const known=locale==="kaa"&&cached&&/[öÖüÜşŞğĞñÑ]/.test(cached)?undefined:cached;if(known){result.set(source,known);continue;}const id=locale+":"+hash(source);if(pending.has(id))existing.push(pending.get(id)!.then(text=>{result.set(source,text);}));else missing.push(source);}
  const batches:string[][]=[];let batch:string[]=[];let size=0;for(const text of missing){if(batch.length&&(size+text.length>2600||batch.length>=24)){batches.push(batch);batch=[];size=0;}batch.push(text);size+=text.length;}if(batch.length)batches.push(batch);
  const jobs=batches.map(texts=>{const work=limited(async()=>{const key=openaiKey();if(!key)throw new Error("translation_no_key");let last:unknown;for(let attempt=0;attempt<3;attempt++){try{const rows=await requestTranslations(key,texts,[locale]);sqlite.transaction(()=>{for(const row of rows){const source=texts[row.id],value=row.values[locale]!;write.run(hash(source),locale,value,new Date().toISOString(),locale==="kaa"?"kaa-v2":"stable-v2");result.set(source,value);}})();return;}catch(error){last=error;}}throw last;});for(const source of texts){const id=locale+":"+hash(source);const p=work.then(()=>result.get(source)!);pending.set(id,p);void p.catch(()=>{}).finally(()=>pending.delete(id));}return work;});
  await Promise.all([...jobs,...existing]);return result;
}
/** Only public lesson content enters the translator; chat/user/account data is never read. */
export async function localizedMaterialContent(material:{slug:string;content:string},locale:Locale){
  const source=material.slug.startsWith("notion-ru-")||((material.content.match(/[А-Яа-яЁё]/g)||[]).length>material.content.replace(/^(IMAGE|VIDEO|FILE)::.*$/gm,"").length*.25)?"ru":"uz";
  if(locale===source)return {content:material.content,translated:true};
  const id=locale+":"+createHash("sha256").update(material.content).digest("hex");let work=inFlight.get(id);
  if(!work){work=(async()=>{const parts=material.content.split(/(\r?\n)/);const translated=await translatedLines(parts.filter(s=>s!=="\n"&&s!=="\r\n"),locale);return parts.map(part=>translated.get(translationKey(part))||part).join("");})();inFlight.set(id,work);void work.catch(()=>{}).finally(()=>inFlight.delete(id));}
  try{return {content:await work,translated:true};}catch{return {content:material.content,translated:false};}
}
