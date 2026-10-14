
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale-server";
import { withLang } from "@/lib/locale";
import { publicCopy } from "@/lib/public-copy";

export default async function NotFound() {
  const locale = await getLocale();
  const t = publicCopy(locale);
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="catalog-panel rounded-3xl px-6 py-8">
        <h1 className="font-heading text-3xl font-semibold"><UiText>{t.notFoundTitle}</UiText></h1>
        <p className="mt-2 text-sm text-[#5a5248]">
          <UiText>{t.notFoundBody}</UiText>
        </p>
        <Link
          href={withLang("/nazarov", locale)}
          className="mt-6 inline-block text-sm text-[#2f6fed] underline underline-offset-2"
        >
          <UiText>{t.notFoundBack}</UiText>
        </Link>
        </div>
      </main>
    </>
  );
}
