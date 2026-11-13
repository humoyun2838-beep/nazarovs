import type { Locale } from './locale';

export type QuizQuestion = {
  id: string; prompt: string; explanation: string; source: string;
  choices: { id: string; text: string }[]; correct: string;
};
export type QuizAttempt = { version: string; answers: Record<string,string>; index: number; finished: boolean };
export function quizScore(questions: QuizQuestion[], answers: Record<string,string>) {
  const answered = questions.filter(q => q.choices.some(c => c.id === answers[q.id])).length;
  const correct = questions.filter(q => answers[q.id] === q.correct).length;
  return { answered, correct, total: questions.length, percent: questions.length ? Math.round(correct / questions.length * 100) : 0 };
}
export function restoreAttempt(raw: string | null, version: string, questions: QuizQuestion[]): QuizAttempt {
  const empty: QuizAttempt = {version, answers:{}, index:0, finished:false};
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== version || !value.answers || typeof value.answers !== 'object') return empty;
    const answers: Record<string,string> = {};
    for (const q of questions) if (q.choices.some(c => c.id === value.answers[q.id])) answers[q.id] = value.answers[q.id];
    return {version, answers, index:Number.isInteger(value.index) ? Math.max(0,Math.min(questions.length-1,value.index)) : 0,
      finished:value.finished === true && quizScore(questions,answers).answered === questions.length};
  } catch { return empty; }
}
export const quizStorageKey = (slug: string) => `dmed-quiz:${slug}`;
export const quizLanguageNames: Record<Locale,string> = {uz:"O‘zbekcha",ru:'Русский',en:'English',kaa:'Qaraqalpaqsha'};
