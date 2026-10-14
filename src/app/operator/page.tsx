
import { UiText } from "@/components/ui-locale";
import { OperatorDesk } from "@/components/operator-desk";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "@/components/login-form";
import { getOperatorSession, getSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { operatorAccess } from "@/lib/operators";
import { routes } from "@/lib/site";
import { uiCopy } from "@/lib/ui-copy";
import "@/db";

export const dynamic = "force-dynamic";

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const session = await getOperatorSession();
  const access = session ? operatorAccess(Number(session.sub)) : "none";

  if (session?.role === "operator" && access === "active") {
    return <OperatorDesk username={session.username} locale={locale} />;
  }

  const copy = uiCopy(locale);
  const account = await getSession();
  const errorCode =
    params.error || (access === "blocked" ? "blocked" : access === "none" && session ? "expired" : "");

  return (
    <main data-operator-desk="kirish" className="flex w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-[#d5dee8] bg-white p-6 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] sm:p-8">
        <div className="mb-6 space-y-3 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#0b4fa8] uppercase">
            <UiText>{copy.operatorLoginKicker}</UiText>
          </p>
          <h1 className="flex justify-center">
            <BrandLogo size="lg" href={routes.operator} />
          </h1>
          <p className="text-sm leading-relaxed text-[#5b6b7c]"><UiText>{copy.operatorLoginLead}</UiText></p>
          {account?.role === "admin" ? (
            <p className="rounded-xl bg-[#eef6ff] px-3 py-2 text-sm leading-relaxed text-[#163056]" role="status">
              <UiText>{copy.operatorAdminStay}</UiText>
            </p>
          ) : null}
          <LanguageSwitcher locale={locale} />
        </div>
        <LoginForm nextPath={routes.operator} role="operator" errorCode={errorCode} locale={locale} />
      </div>
    </main>
  );
}
