
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale-server";
import { publicCopy } from "@/lib/public-copy";
import { withLang } from "@/lib/locale";
import { BrandLogo } from "@/components/brand-logo";
import { routes } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const locale = await getLocale();
  const t = publicCopy(locale);
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="page-enter flex flex-1 flex-col items-center justify-end gap-7 pb-6 text-center sm:justify-center sm:pb-0">
          <h1 className="flex flex-col items-center">
            <BrandLogo size="lg" href={withLang(routes.catalog, locale)} />
          </h1>

          <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
            <div className="catalog-panel rounded-3xl p-5 text-left">
              <p className="text-xs font-semibold tracking-wide text-[#1a6fd4] uppercase">
                <UiText>{t.site1}</UiText>
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold text-[#071a38]">
                <UiText>{t.materialsNav}</UiText>
              </h2>
              <p className="mt-2 text-sm text-[#3d5a84]">
                <UiText>{t.materialsLead}</UiText>
              </p>
              <Button asChild className="mt-4 h-11 w-full rounded-xl bg-[#0b4fa8] text-white hover:bg-[#093f86]">
                <Link href={withLang(routes.catalog, locale)}><UiText>{t.openMaterials}</UiText></Link>
              </Button>
            </div>

            <div className="catalog-panel rounded-3xl p-5 text-left">
              <p className="text-xs font-semibold tracking-wide text-[#1a6fd4] uppercase">
                <UiText>{t.site2}</UiText>
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold text-[#071a38]">
                <UiText>{t.chatEntry}</UiText>
              </h2>
              <p className="mt-2 text-sm text-[#3d5a84]">
                <UiText>{t.chatEntryBody}</UiText>
              </p>
              <Button asChild className="mt-4 h-11 w-full rounded-xl bg-[#1a6fd4] text-white hover:bg-[#155bb0]">
                <a href={`http://127.0.0.1:3853/operator?lang=${locale}`}><UiText>{t.openChat}</UiText></a>
              </Button>
            </div>

            <div className="catalog-panel rounded-3xl p-5 text-left">
              <p className="text-xs font-semibold tracking-wide text-[#4a6288] uppercase">
                <UiText>{t.site3}</UiText>
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold text-[#071a38]">
                <UiText>{t.adminFor}</UiText>
              </h2>
              <p className="mt-2 text-sm text-[#3d5a84]">
                <UiText>{t.adminForBody}</UiText>
              </p>
              <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-xl border-[#c5d8f5]">
                <a href={`http://127.0.0.1:3852/admin/login?lang=${locale}`}><UiText>{t.adminEntry}</UiText></a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
