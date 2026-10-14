
import { UiText } from "@/components/ui-locale";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { getCategories, getMaterialLinksByCategory } from "@/lib/data";
import {
  CategoryCreateForm,
  MaterialCreateForm,
} from "@/components/admin-forms";
import { AdminCatalog } from "@/components/admin-catalog";
import { SiteHeader } from "@/components/site-header";
import { AdminChatCard } from "@/components/admin-chat-card";
import { AdminAiChat } from "@/components/admin-ai-chat";
import { Button } from "@/components/ui/button";
import { chatInboxSummary } from "@/lib/chat";
import { withLang } from "@/lib/locale";
import { routes } from "@/lib/site";
import { uiCopy } from "@/lib/ui-copy";
import { publicCopy } from "@/lib/public-copy";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login?next=/admin");
  }
  if (session.role === "operator") {
    redirect(routes.operator);
  }
  if (session.role !== "admin") {
    redirect("/nazarov");
  }

  const locale = await getLocale();
  const copy = uiCopy(locale);
  const nav = publicCopy(locale);
  const chatUnread = chatInboxSummary().unread;
  const categories = await getCategories();
  const materialsByCategory = categories.map((category) => ({
    category,
    materials: getMaterialLinksByCategory(category.id),
  }));

  return (
    <>
      <SiteHeader username={session.username} role={session.role} locale={locale} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="page-enter space-y-8">
          <header className="catalog-hero space-y-3 rounded-[1.85rem] p-5 sm:p-7">
            <p className="relative z-10 text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
              <UiText>{copy.adminPanel}</UiText>
            </p>
            <h1 className="relative z-10 font-heading text-3xl font-semibold tracking-tight text-[#071a38] sm:text-4xl">
              <UiText>{copy.adminHero}</UiText>
            </h1>
            <p className="relative z-10 max-w-2xl text-sm leading-relaxed text-[#3d5a84]">
              <UiText>{copy.adminHeroLead}</UiText>
            </p>
            <div className="relative z-10 flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm">
                <Link href={withLang("/admin/chat", locale)}>
                  <UiText>{copy.chatCardTitle}</UiText>
                  <UiText>{chatUnread > 0 ? ` (${chatUnread})` : ""}</UiText>
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={withLang("/admin/operatorlar", locale)}><UiText>{nav.operatorsNav}</UiText></Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={withLang("/nazarov", locale)}><UiText>{copy.visitorView}</UiText></Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="#ai-yordamchi"><UiText>{"AI"}</UiText></Link>
              </Button>
            </div>
          </header>

          <AdminChatCard locale={locale} />

          <AdminAiChat locale={locale} />

          <section className="catalog-panel space-y-3 rounded-3xl p-5">
            <h2 className="font-heading text-xl font-semibold text-[#0b2a55]">
              <UiText>{copy.newLesson}</UiText>
            </h2>
            <MaterialCreateForm
              locale={locale}
              categories={categories.map((c) => ({ id: c.id, title: c.title }))}
            />
          </section>

          <section className="catalog-panel space-y-3 rounded-3xl p-5">
            <h2 className="font-heading text-xl font-semibold text-[#0b2a55]">
              <UiText>{copy.newSection}</UiText>
            </h2>
            <CategoryCreateForm locale={locale} />
          </section>

          <AdminCatalog groups={materialsByCategory} locale={locale} />
        </div>
      </main>
    </>
  );
}
