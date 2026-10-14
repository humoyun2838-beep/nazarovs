
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminChatNav } from "@/components/admin-chat-nav";
import { ClientAccessBadge } from "@/components/client-access-badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { withLang, type Locale } from "@/lib/locale";
import { routes } from "@/lib/site";
import { publicCopy } from "@/lib/public-copy";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

export { BrandLogo };

export function SiteHeader({
  username,
  role,
  showAdminLink = false,
  wide = false,
  expiresAt,
  chatOnly = false,
  locale,
}: {
  username?: string;
  role?: "client" | "admin" | "operator";
  showAdminLink?: boolean;
  wide?: boolean;
  expiresAt?: string;
  chatOnly?: boolean;
  locale?: Locale;
}) {
  const t = publicCopy(locale || "uz");
  return (
    <header className="site-header sticky top-0 z-40">
      <div
        className={cn(
          "mx-auto flex min-h-14 w-full flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6",
          wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        <BrandLogo href={chatOnly ? routes.operator : withLang(routes.catalog, locale || "uz")} />

        <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {locale && !chatOnly ? <LanguageSwitcher locale={locale} /> : null}
          {role === "admin" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                  <Link href={withLang("/nazarov", locale || "uz")}><UiText>{t.materialsNav}</UiText></Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={withLang("/admin", locale || "uz")}><UiText>{t.adminNav}</UiText></Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={withLang("/admin/mijozlar", locale || "uz")}><UiText>{t.clientsNav}</UiText></Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={withLang("/admin/operatorlar", locale || "uz")}><UiText>{t.operatorsNav}</UiText></Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={withLang("/admin/mijozlar#chat-statistika", locale || "uz")}><UiText>{t.reportsNav}</UiText></Link>
              </Button>
              <AdminChatNav locale={locale || "uz"} />
              {username ? (
                <span className="header-user hidden text-xs font-medium lg:inline">
                  {username}<UiText>{" · admin "}</UiText></span>
              ) : null}
              <form action="/api/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  <UiText>{t.logout}</UiText>
                </Button>
              </form>
            </>
          ) : username ? (
            <>
              {chatOnly ? null : (
                <Button asChild variant="ghost" size="sm">
                  <Link href={withLang(routes.operator, locale || "uz")}><UiText>{t.chatNav}</UiText></Link>
                </Button>
              )}
              <div className="flex min-w-0 flex-col items-end leading-tight">
                <span className="header-user hidden text-xs font-medium sm:inline">{username}</span>
                <ClientAccessBadge expiresAt={expiresAt} />
              </div>
              <form action="/api/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  <UiText>{t.logout}</UiText>
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
