import { SiteHeader } from '@/components/site-header';
import { QuizHub } from '@/components/quiz-hub';
import { getCategoriesCached } from '@/lib/data';
import { getLocale } from '@/lib/locale-server';
import { catalogViewer } from '@/lib/client-access';
import { localizeCatalogTitle } from '@/lib/catalog-locale';
import { sectionSticker } from '@/lib/section-stickers';
import { quizSections,quizVersion } from '@/lib/quiz-data';
import { quizCopy } from '@/lib/quiz-copy';
export const dynamic='force-dynamic';
export async function generateMetadata(){return {title:quizCopy(await getLocale()).title};}
export default async function TestPage(){
 const locale=await getLocale();const {session}=await catalogViewer();
 const sections=(await getCategoriesCached()).filter(c=>quizSections[c.slug]).map(c=>({slug:c.slug,title:localizeCatalogTitle(c.slug,c.title,locale),image:sectionSticker(c.slug)||'/art/dmed-test.svg',ids:quizSections[c.slug]}));
 return <><SiteHeader locale={locale} username={session?.username} role={session?.role} wide/><QuizHub sections={sections} locale={locale} version={quizVersion}/></>;
}
