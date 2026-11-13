import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { QuizPlayer } from '@/components/quiz-player';
import { getCategoryBySlugCached } from '@/lib/data';
import { getLocale } from '@/lib/locale-server';
import { catalogViewer } from '@/lib/client-access';
import { localizeCatalogTitle } from '@/lib/catalog-locale';
import { getQuiz,quizVersion } from '@/lib/quiz-data';
import { quizCopy } from '@/lib/quiz-copy';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const locale=await getLocale();const category=await getCategoryBySlugCached(slug);return {title:`${quizCopy(locale).title}${category?` · ${localizeCatalogTitle(slug,category.title,locale)}`:''}`};}
export default async function QuizPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const locale=await getLocale();const category=await getCategoryBySlugCached(slug);const questions=getQuiz(slug,locale);
 if(!category||!questions)notFound();const {session}=await catalogViewer();
 return <><SiteHeader locale={locale} username={session?.username} role={session?.role}/><QuizPlayer slug={slug} title={localizeCatalogTitle(slug,category.title,locale)} locale={locale} version={quizVersion} questions={questions}/></>;
}
