import 'server-only';
import bank from '@/data/quiz-bank.json';
import type { Locale } from './locale';
import type { QuizQuestion } from './quiz';
type Text = Record<Locale,string>;
type Fact = {id:string;fact:Text;answer:Text;source:string};
const facts = bank.questions as Record<string,Fact>;
export const quizSections = bank.sections as Record<string,string[]>;
export const quizVersion = bank.version;

function hash(text:string) { let n=2166136261; for(const c of text) n=Math.imul(n^c.charCodeAt(0),16777619); return n>>>0; }
export function getQuiz(slug:string,locale:Locale): QuizQuestion[] | null {
  const ids=quizSections[slug]; if(!ids)return null;
  return ids.map((id,index)=>{
    const item=facts[id];
    const order=(a:string,b:string)=>hash(id+a)-hash(id+b);
    const others=[...ids.filter(x=>x!==id).sort(order),...Object.keys(facts).filter(x=>!ids.includes(x)).sort(order)];
    const choices=[{id,text:item.answer[locale]}];
    // Answer identities and order never depend on language; switching preserves progress.
    for(const other of others) {
      if(choices.length===4) break;
      if(['uz','ru','en','kaa'].some(lang=>choices.some(c=>facts[c.id].answer[lang as Locale].toLocaleLowerCase()===facts[other].answer[lang as Locale].toLocaleLowerCase())))continue;
      choices.push({id:other,text:facts[other].answer[locale]});
    }
    // Use plausible numeric distractors for file limits rather than unrelated labels.
    if(id==='violation-10'||id==='violation-11') {
      const numbers=id==='violation-10'?[3,10,20]:[5,20,50];
      choices.splice(1,3,...numbers.map(n=>({id:`${id}-n${n}`,text:id==='violation-11'?`${n} ${locale==='ru'?'МБ':'MB'}`:`${n} ${{uz:'ta fayl',ru:'файлов',en:'files',kaa:'fayl'}[locale]}`})));
    }
    const correctSlot=(hash(slug)+index)%4;
    const right=choices.shift()!;choices.splice(correctSlot,0,right);
    return {id,prompt:item.fact[locale].replace('{}','_____'),explanation:item.fact[locale].replace('{}',item.answer[locale]),source:item.source,choices,correct:id};
  });
}
