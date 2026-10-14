
import { UiText } from "@/components/ui-locale";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { withLang } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";
import { listClientRequests } from "@/lib/clients";
import { SiteHeader } from "@/components/site-header";
import { AdminClients } from "@/components/admin-clients";
import { AdminChatCard } from "@/components/admin-chat-card";
import { AdminChatDashboard } from "@/components/admin-chat-dashboard";
import { AdminDashboardBoard, AdminVisitsList } from "@/components/admin-visits";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/admin/mijozlar");
  if (session.role !== "admin") redirect("/nazarov");

  const locale = await getLocale();
  const copy = uiCopy(locale);
  const requests = listClientRequests();

  return (
    <>
      <SiteHeader username={session.username} role={session.role} wide locale={locale} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="page-enter space-y-8">
          <header className="catalog-hero space-y-3 rounded-[1.85rem] p-5 sm:p-7">
            <p className="relative z-10 text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
              <UiText>{copy.adminPanel}</UiText>
            </p>
            <h1 className="relative z-10 font-heading text-3xl font-semibold text-[#071a38]">
              <UiText>{copy.clientsTitle}</UiText>
            </h1>
            <p className="relative z-10 max-w-2xl text-sm leading-relaxed text-[#3d5a84]">
              <UiText>{copy.clientsLead}</UiText>
            </p>
            <Button asChild size="sm" variant="outline" className="relative z-10">
              <Link href={withLang("/admin", locale)}><UiText>{copy.backMaterials}</UiText></Link>
            </Button>
          </header>

          <AdminClients initial={requests} locale={locale} />

          <section className="space-y-4">
            <AdminChatCard locale={locale} />
            <AdminChatDashboard locale={locale} />
          </section>

          <section id="dashboard" className="catalog-panel space-y-4 rounded-3xl p-5">
            <h2 className="font-heading text-2xl font-semibold text-[#071a38]"><UiText>{" Dashboard "}</UiText></h2>
            <AdminDashboardBoard />
          </section>

          <section id="kirishlar" className="catalog-panel space-y-4 rounded-3xl p-5">
            <h2 className="font-heading text-2xl font-semibold text-[#071a38]"><UiText>{" Kirishlar "}</UiText></h2>
            <AdminVisitsList locale={locale} />
          </section>
        </div>
      </main>
    </>
  );
}
