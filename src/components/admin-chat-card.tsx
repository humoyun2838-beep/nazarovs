import Link from "next/link";
import { chatInboxSummary } from "@/lib/chat";
import { Button } from "@/components/ui/button";

export function AdminChatCard() {
  const summary = chatInboxSummary();
  const latest = summary.latest;

  return (
    <section
      data-admin-chat="home"
      className="space-y-3 rounded-2xl border border-[#1a6fd4]/20 bg-white/95 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.22em] text-[#1a6fd4] uppercase">
            Chat
          </p>
          <h2 className="font-heading text-xl font-semibold text-[#051530]">
            Mijozlar bilan suhbat
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[#1c3358]">
            Dmed orqali yozilgan savollar shu yerga tushadi. Javobni admin
            paneldan yozasiz — mijoz saytdagi chatda ko‘radi. Telegram shart
            emas.
          </p>
        </div>
        <Button asChild className="bg-[#1a6fd4] text-white hover:bg-[#155bb0]">
          <Link href="/admin/chat">Chatni ochish</Link>
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-[#f3f7fd] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
            Ochiq savol
          </p>
          <p className="text-lg font-semibold text-[#1a6fd4]">{summary.unread}</p>
        </div>
        <div className="rounded-xl bg-[#f6f4f1] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
            Murojaatlar
          </p>
          <p className="text-lg font-semibold text-[#051530]">{summary.stats?.total ?? summary.total}</p>
        </div>
        <div className="rounded-xl bg-[#f6f4f1] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
            Yopilgan
          </p>
          <p className="text-lg font-semibold text-[#051530]">{summary.stats?.closed ?? 0}</p>
        </div>
        <div className="rounded-xl bg-[#f6f4f1] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
            Baholangan
          </p>
          <p className="text-lg font-semibold text-[#051530]">{summary.stats?.rated ?? 0}</p>
        </div>
        <div className="rounded-xl bg-[#fffbeb] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#1a3a66] uppercase">
            O‘rtacha baho
          </p>
          <p className="text-lg font-semibold text-[#b45309]">
            {summary.stats?.avg == null ? "—" : `${Number(summary.stats.avg).toFixed(1)}/5`}
          </p>
        </div>
      </div>
      {latest ? (
        <p className="truncate text-xs text-[#7a7166]">
          Oxirgi: {latest.name} · {latest.lastBody || latest.phone}
        </p>
      ) : (
        <p className="text-xs text-[#7a7166]">
          Hali xabar yo‘q. Mijoz katalogdagi Dmed tugmasidan yozadi.
        </p>
      )}
    </section>
  );
}
