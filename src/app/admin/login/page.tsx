
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { BrandLogo } from "@/components/site-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "@/components/login-form";
import { getLocale } from "@/lib/locale-server";
import { withLang } from "@/lib/locale";
import { routes } from "@/lib/site";
import { uiCopy } from "@/lib/ui-copy";
import "@/db";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const locale = await getLocale();
  const copy = uiCopy(locale);
  const nextPath =
    params.next && params.next.startsWith("/admin")
      ? params.next
      : "/admin";

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:justify-end lg:px-10">
      <div className="catalog-hero page-enter w-full max-w-md rounded-[1.85rem] p-6 sm:p-8">
        <div className="relative z-10 mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo size="lg" href={withLang("/nazarov", locale)} />
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#1a6fd4] uppercase">
              <UiText>{copy.adminPanel}</UiText>
            </p>
            <p className="text-sm leading-relaxed text-[#4a6288]"><UiText>{copy.adminLoginLead}</UiText></p>
          </div>
          <LanguageSwitcher locale={locale} />
        </div>

        <div className="relative z-10">
          <LoginForm nextPath={nextPath} role="admin" errorCode={params.error} locale={locale} />
        </div>
        <p className="relative z-10 mt-4 text-center text-xs text-[#4a6288]">
          <UiText>{copy.chatLoginAsk}</UiText><UiText>{" "}</UiText>
          <Link href={withLang(routes.operator, locale)} className="underline underline-offset-2">
            <UiText>{copy.openChat}</UiText>
          </Link>
          <UiText>{" · "}</UiText>
          <Link href={withLang("/nazarov", locale)} className="underline underline-offset-2">
            <UiText>{copy.materials}</UiText>
          </Link>
        </p>
      </div>
    </main>
  );
}
