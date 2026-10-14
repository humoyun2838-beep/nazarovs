
import { UiText } from "@/components/ui-locale";
import { redirect } from "next/navigation";
import { OperatorAdmin } from "@/components/operator-admin";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { listOperators } from "@/lib/operators";
import { routes } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminOperatorsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/admin/operatorlar");
  if (session.role === "operator") redirect(routes.operator);
  if (session.role !== "admin") redirect("/nazarov");
  const locale = await getLocale();
  const operators = listOperators();

  return (
    <>
      <SiteHeader username={session.username} role="admin" locale={locale} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="catalog-panel space-y-6 rounded-[1.85rem] p-5 sm:p-7">
          <header className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#1a6fd4] uppercase"><UiText>{" Admin panel "}</UiText></p>
            <h1 className="font-heading text-3xl font-semibold text-[#071a38]"><UiText>{"Operatorlar"}</UiText></h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#163056]"><UiText>{" Shu yerda operator login va parolini belgilaysiz. Parol saqlangach ochiq matnda ko‘rinmaydi. Faol operator faqat chatga kiradi. Bloklangan operator kira olmaydi. "}</UiText></p>
          </header>
          <OperatorAdmin initial={operators} />
        </div>
      </main>
    </>
  );
}
