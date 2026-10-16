import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { getMobileRelease } from "@/lib/mobile-release";
import { MobileReleaseAdmin } from "@/components/mobile-release-admin";
import { SiteHeader } from "@/components/site-header";
export const dynamic = "force-dynamic";
export default async function AppUpdatesPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/admin/login?next=/admin/app-updates");
  const locale = await getLocale();
  return <><SiteHeader username={session.username} role="admin" locale={locale} /><main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><MobileReleaseAdmin initial={getMobileRelease()} locale={locale} /></main></>;
}
