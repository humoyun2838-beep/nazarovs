import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { AdminChatInbox } from "@/components/admin-chat-inbox";
import { AdminChatDashboard } from "@/components/admin-chat-dashboard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/admin/chat");
  if (session.role !== "admin") redirect("/nazarov");
  const params = await searchParams;

  return (
    <>
      <SiteHeader username={session.username} role={session.role} wide />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 catalog-hero rounded-3xl p-5">
          <div className="relative z-10 space-y-1">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#1a6fd4] uppercase">
              Admin panel
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#051530]">
              Chat
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[#1c3358]">
              Mijozlar Dmed orqali yozadi. Javobni shu yerdan yuboring — u
              darhol saytdagi chatda chiqadi. Operator javobidan keyin 24 soat
              ichida yozilmasa suhbat yopiladi va mijoz 1–5 ball bilan baholaydi.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-[#9dbbe8] text-[#0b4fa8]">
            <Link href="/admin">Materiallar</Link>
          </Button>
        </div>
        <AdminChatDashboard />
        <AdminChatInbox initialSessionId={params.s || ""} />
      </main>
    </>
  );
}
