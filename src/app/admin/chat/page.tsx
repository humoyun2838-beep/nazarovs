
import { UiText } from "@/components/ui-locale";
import { requireStaffChat } from "@/lib/client-access";
import { getLocale } from "@/lib/locale-server";
import { SiteHeader } from "@/components/site-header";
import { AdminChatWorkspace } from "@/components/admin-chat-workspace";
import { AdminChatInbox } from "@/components/admin-chat-inbox";
import { AdminChatCard } from "@/components/admin-chat-card";
import { AdminChatDashboard } from "@/components/admin-chat-dashboard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { withLang } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";

export const dynamic = "force-dynamic";

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; view?: string }>;
}) {
  const { session, profile, expiresAt } = await requireStaffChat();
  const locale = await getLocale();
  const params = await searchParams;
  const copy = uiCopy(locale);
  const isAdmin = session.role === "admin";
  const staffName = profile?.name || session.username;

  return (
    <>
      <SiteHeader
        username={session.username}
        role={isAdmin ? "admin" : "client"}
        wide
        expiresAt={expiresAt}
        chatOnly={!isAdmin}
        locale={locale}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {isAdmin ? (
          <div
            data-admin-chat="hero"
            className="mb-5 flex flex-wrap items-end justify-between gap-3 catalog-hero rounded-3xl p-5"
          >
            <div className="relative z-10 space-y-1">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
                <UiText>{copy.chatLoginKicker}</UiText>
              </p>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#051530]">
                <UiText>{copy.inboxTitle}</UiText>
              </h1>
              <p className="max-w-2xl text-[15px] leading-relaxed text-[#1c3358]">
                <UiText>{copy.inboxLead}</UiText>
                {staffName ? ` (${staffName})` : ""}
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="border-[#9dbbe8] text-[#0b4fa8]">
              <Link href={withLang("/admin", locale)}><UiText>{copy.materials}</UiText></Link>
            </Button>
          </div>
        ) : (
          <div
            data-admin-chat="hero"
            data-staff-chat="only"
            className="mb-5 catalog-hero rounded-3xl p-5"
          >
            <p className="relative z-10 text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase"><UiText>{" Chat "}</UiText></p>
            <h1 className="relative z-10 mt-1 font-heading text-3xl font-semibold tracking-tight text-[#051530]">
              <UiText>{copy.staffInboxTitle}</UiText>
            </h1>
            <p className="relative z-10 mt-2 max-w-2xl text-[15px] leading-relaxed text-[#1c3358]">
              <UiText>{copy.staffInboxLead}</UiText>
            </p>
          </div>
        )}
        {isAdmin ? <div className="mb-5"><AdminChatCard locale={locale} /></div> : null}
        {isAdmin ? <AdminChatWorkspace initialTab={params.view === "statistics" ? "dashboard" : "inbox"} dashboard={<AdminChatDashboard locale={locale} />} inbox={<AdminChatInbox initialSessionId={params.s || ""} locale={locale} />} /> : <AdminChatInbox initialSessionId={params.s || ""} staffOnly locale={locale} />}
      </main>
    </>
  );
}
