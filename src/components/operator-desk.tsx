"use client";
import { UiText } from "@/components/ui-locale";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";
import { BRAND_NAME } from "@/lib/brand";
import { CheckCheck, MessageSquareText, ShieldCheck } from "lucide-react";
import { AdminChatTemplates } from "@/components/admin-chat-templates";
import { CloseChatDialog, type InquiryCategory } from "@/components/close-chat-dialog";
import type { ChatTemplatePack } from "@/lib/chat-templates";
import { ChatMessageBody } from "@/components/chat-message-media";
import { BrandMark } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";

type Row = {
  id: string;
  name: string;
  phone: string;
  status: string;
  lastBody: string;
  lastAt: string;
  unread: boolean;
  unreadCount: number;
  assignedUserId?: number;
  lastVisitorAt?: string;
};

type Msg = {
  id: number;
  role: string;
  body: string;
  createdAt: string;
  kind?: string;
  mediaUrl?: string;
};

type Thread = {
  id: string;
  name: string;
  phone: string;
  language: string;
  status: string;
  assignedUserId?: number;
  inquiryCategoryTitle?: string;
  messages: Msg[];
};

const COPY = {
  uz: {
    title: "Suhbatlar",
    search: "Ism, telefon yoki xabar",
    newOnly: "Yangi",
    all: "Hammasi",
    empty: "Suhbat yo‘q.",
    claim: "Biriktirish",
    mine: "Mening",
    taken: "Boshqa operator olgan",
    waiting: "Javob kutilmoqda",
    pick: "Chapdan suhbatni tanlang.",
    reply: "Javob yozing",
    send: "Yuborish",
    ai: "AI javob",
    logout: "Chiqish",
    back: "Ro‘yxat",
    you: "Siz",
    visitor: "Mijoz",
    closed: "Suhbat yopilgan.",
    close: "Suhbatni yakunlash",
    fail: "Yuborilmadi.",
    loading: "Yuklanmoqda…",
  },
  ru: {
    title: "Диалоги",
    search: "Имя, телефон или текст",
    newOnly: "Новые",
    all: "Все",
    empty: "Диалогов нет.",
    claim: "Взять",
    mine: "Мои",
    taken: "Занят другим",
    waiting: "Ждёт ответа",
    pick: "Выберите диалог слева.",
    reply: "Напишите ответ",
    send: "Отправить",
    ai: "Ответ ИИ",
    logout: "Выйти",
    back: "Список",
    you: "Вы",
    visitor: "Клиент",
    closed: "Диалог закрыт.",
    close: "Завершить чат",
    fail: "Не отправилось.",
    loading: "Загрузка…",
  },
  en: {
    title: "Conversations",
    search: "Name, phone, or message",
    newOnly: "New",
    all: "All",
    empty: "No conversations.",
    claim: "Assign to me",
    mine: "Mine",
    taken: "Taken by another operator",
    waiting: "Waiting for a reply",
    pick: "Choose a conversation.",
    reply: "Write a reply",
    send: "Send",
    ai: "AI reply",
    logout: "Log out",
    back: "List",
    you: "You",
    visitor: "Client",
    closed: "This chat is closed.",
    close: "End chat",
    fail: "Could not send.",
    loading: "Loading…",
  },
  kaa: {
    title: "Sáwbetler",
    search: "At, telefon yamasa xabar",
    newOnly: "Jańa",
    all: "Hámmesi",
    empty: "Sáwbet joq.",
    claim: "Ózime alıw",
    mine: "Meniki",
    taken: "Basqa operator alǵan",
    waiting: "Juwap kútilmekte",
    pick: "Shepten sáwbetti tańlań.",
    reply: "Juwap jazıń",
    send: "Jiberiw",
    ai: "AI juwap",
    logout: "Shıǵıw",
    back: "Dizim",
    you: "Siz",
    visitor: "Mijoz",
    closed: "Sáwbet jabılǵan.",
    close: "Sáwbetti juwmaqlaw",
    fail: "Jiberilmedi.",
    loading: "Júklenbekte…",
  },
} as const;

function when(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("sv-SE", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OperatorDesk({
  username,
  locale,
}: {
  username: string;
  locale: Locale;
}) {
  const t = COPY[locale] || COPY.uz;
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [me, setMe] = useState(0);
  const [activeId, setActiveId] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<InquiryCategory[]>([]);
  const [templates, setTemplates] = useState<ChatTemplatePack>({ uz: [], ru: [] });
  const [closingId, setClosingId] = useState("");
  const [closeError, setCloseError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileThread, setMobileThread] = useState(false);

  const activeRef = useRef("");
  const drafts = useRef<Record<string, string>>({});
  const listRequest = useRef(0);
  const threadRequest = useRef(0);
  const loadedId = useRef("");
  const [listError, setListError] = useState("");
  const [listLoading, setListLoading] = useState(true);

  const loadList = useCallback(async (search: string) => {
    const request = ++listRequest.current;
    try {
    const res = await fetch(`/api/operator/chat-workspace?q=${encodeURIComponent(search)}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      window.location.replace("/operator");
      return;
    }
    const data = (await res.json().catch(() => null)) as { sessions?: Row[]; me?: number; categories?: InquiryCategory[]; templates?: ChatTemplatePack } | null;
    if (request !== listRequest.current) return;
    if (!res.ok || !data?.sessions) throw new Error("list");
    setListError("");
    setRows(data.sessions);
    if (data?.categories) setCategories(data.categories);
    if (data?.templates) setTemplates(data.templates);
    if (typeof data?.me === "number") setMe(data.me);
    } catch { if (request === listRequest.current) setListError("Suhbatlar yuklanmadi. Aloqani tekshiring va qayta urinib ko‘ring."); }
    finally { if (request === listRequest.current) setListLoading(false); }
  }, []);

  const openThread = useCallback(async (id: string) => {
    const request = ++threadRequest.current;
    try {
    const res = await fetch("/api/operator/chat-workspace", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "thread", sessionId: id }),
    });
    if (res.status === 401 || res.status === 403) {
      window.location.replace("/operator");
      return;
    }
    const data = (await res.json().catch(() => null)) as { session?: Thread } | null;
    if (activeRef.current !== id || request !== threadRequest.current) return;
    if (!res.ok || !data?.session) throw new Error("thread");
    loadedId.current = data.session.id;
    setThread(data.session);
    setError("");
    } catch {
      if (activeRef.current === id && request === threadRequest.current && loadedId.current !== id) {
        setError("Suhbat yuklanmadi. Qayta urinib ko‘ring.");
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(q.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    void loadList(query);
    const timer = window.setInterval(() => { if (!document.hidden) void loadList(query); }, 8000);
    return () => window.clearInterval(timer);
  }, [loadList, query]);

  useEffect(() => {
    if (!activeId) return;
    const timer = window.setInterval(() => { if (!document.hidden) void openThread(activeId); }, 8000);
    return () => window.clearInterval(timer);
  }, [activeId, openThread]);

  const visible = useMemo(
    () =>
      rows.filter((row) => {
        if (onlyNew && !row.unread) return false;
        if (onlyMine && row.assignedUserId !== me) return false;
        return true;
      }),
    [onlyMine, onlyNew, rows, me],
  );
  const unread = rows.reduce((sum, row) => sum + (row.unread ? row.unreadCount : 0), 0);

  async function mutateThread(action: "reply" | "ai" | "claim") {
    if (!activeId || busy || (action === "reply" && !text.trim())) return;
    const target = activeId;
    const draft = text;
    ++threadRequest.current;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/operator/chat-workspace", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, sessionId: target, text: action === "reply" ? draft : "" }),
      });
      const data = await res.json().catch(() => null) as { session?: Thread; error?: string; message?: string } | null;
      if (activeRef.current !== target) return;
      if (!res.ok || !data?.session) { setError(data?.error === "taken" ? t.taken : data?.error === "closed" ? t.closed : data?.message || t.fail); return; }
      ++threadRequest.current;
      setThread(data.session);
      if (action === "reply") setText(current => current === draft ? "" : current);
      void loadList(query);
    } catch { if (activeRef.current === target) setError("Tarmoq bilan aloqa yo‘q. Qayta urinib ko‘ring."); }
    finally { setBusy(false); }
  }

  const send = (action: "reply" | "ai") => mutateThread(action);
  const claim = () => mutateThread("claim");

  async function endChat(categoryId: number) {
    if (!closingId || busy) return;
    const targetId = closingId;
    setBusy(true);
    setCloseError("");
    try {
      const res = await fetch("/api/operator/chat-workspace", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "close", sessionId: targetId, categoryId }),
      });
      const data = await res.json() as { session?: Thread; error?: string };
      if (!res.ok || !data.session) {
        setCloseError(data.error === "taken" ? t.taken : data.error === "closed" ? "Suhbat allaqachon yakunlangan." : data.error || "Suhbat yopilmadi.");
        return;
      }
      ++threadRequest.current;
      if (activeRef.current === targetId) { setThread(data.session); setText(""); }
      setClosingId("");
      setNotice(`Suhbat yakunlandi. Bo‘lim: ${data.session.inquiryCategoryTitle}.`);
      void loadList(query);
    } catch { setCloseError("Tarmoq bilan aloqa yo‘q. Qayta urinib ko‘ring."); }
    finally { setBusy(false); }
  }

  return (
    <div data-operator-desk="chat" className="flex h-full min-h-0 w-full text-[#122033]">
      <aside
        className={`${mobileThread ? "hidden" : "flex"} min-h-0 w-full flex-col border-r border-[#d5dee8] bg-white md:flex md:w-[340px] md:shrink-0`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#e6edf4] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark className="size-9" />
            <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#0b4fa8] uppercase">
              <UiText>{BRAND_NAME}</UiText>
            </p>
            <p className="truncate text-sm font-medium text-[#122033]"><UiText>{t.title}</UiText></p>
            <p className="truncate text-[11px] text-[#5b6b7c]">{username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 ? (
              <span className="rounded-full bg-[#0b4fa8] px-2 py-0.5 text-xs font-semibold text-white">
                {unread}
              </span>
            ) : null}
            <form action="/api/logout" method="post">
              <input type="hidden" name="scope" value="operator" />
              <button
                type="submit"
                className="rounded-lg border border-[#d5dee8] px-3 py-1.5 text-sm font-medium text-[#1d3b63] hover:bg-[#f4f7fb]"
              >
                <UiText>{t.logout}</UiText>
              </button>
            </form>
          </div>
        </header>
        <div className="space-y-2 border-b border-[#e6edf4] p-3">
          <LanguageSwitcher locale={locale} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={t.search}
            className="h-10 w-full rounded-xl border border-[#d5dee8] bg-[#f7f9fb] px-3 text-sm outline-none focus:border-[#0b4fa8]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOnlyNew(false)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${onlyNew ? "bg-[#eef3f8] text-[#5b6b7c]" : "bg-[#0b4fa8] text-white"}`}
            >
              <UiText>{t.all}</UiText>
            </button>
            <button
              type="button"
              onClick={() => setOnlyNew(true)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${onlyNew ? "bg-[#0b4fa8] text-white" : "bg-[#eef3f8] text-[#5b6b7c]"}`}
            >
              <UiText>{t.newOnly}</UiText>
            </button>
            <button
              type="button"
              onClick={() => setOnlyMine((value) => !value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${onlyMine ? "bg-[#0b4fa8] text-white" : "bg-[#eef3f8] text-[#5b6b7c]"}`}
            >
              <UiText>{t.mine}</UiText>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listError ? <div role="alert" className="m-3 rounded-xl bg-red-50 p-3 text-xs text-red-700"><UiText>{listError}</UiText><button type="button" onClick={() => void loadList(query)} className="mt-2 block font-semibold underline"><UiText>{"Qayta urinish"}</UiText></button></div> : null}
          {listLoading ? <p role="status" className="p-6 text-sm text-slate-500"><UiText>{"Suhbatlar yuklanmoqda…"}</UiText></p> : visible.length === 0 ? (
            <p className="px-4 py-8 text-sm text-[#5b6b7c]"><UiText>{t.empty}</UiText></p>
          ) : (
            visible.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  if (activeRef.current) drafts.current[activeRef.current] = text;
                  activeRef.current = row.id;
                  loadedId.current = "";
                  setActiveId(row.id);
                  setError("");
                  setMobileThread(true);
                  setText(drafts.current[row.id] || "");
                  setNotice("");
                  setThread(null);
                  void openThread(row.id);
                }}
                disabled={busy}
                className={`flex w-full flex-col gap-1 border-b border-[#eef2f6] px-4 py-3 text-left hover:bg-[#f7f9fb] ${activeId === row.id ? "bg-[#eef5ff]" : "bg-white"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{row.name || row.phone}</span>
                  {row.unread ? (
                    <span className="rounded-full bg-[#d92d20] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {row.unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-xs text-[#5b6b7c]"><UiText>{row.lastBody}</UiText></span>
                {row.unread ? <span className="text-[11px] font-semibold text-[#0b4fa8]"><UiText>{t.waiting}</UiText></span> : null}
                <span className="text-[11px] text-[#8a97a6]"><UiText>{when(row.lastAt)}</UiText></span>
              </button>
            ))
          )}
        </div>
      </aside>
      <section
        className={`${mobileThread ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col bg-transparent md:flex`}
      >
        {thread ? (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b border-[#e6edf4] bg-white px-4 py-3">
              <button
                type="button"
                className="rounded-lg border border-[#d5dee8] px-2 py-1 text-sm md:hidden"
                onClick={() => setMobileThread(false)}
              >
                <UiText>{t.back}</UiText>
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{thread.name}</p>
                <p className="truncate text-xs text-[#5b6b7c]">{thread.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => void claim()}
                disabled={busy || thread.status === "closed" || thread.assignedUserId === me}
                className="ml-auto rounded-full border border-[#c5d7f2] px-3 py-1 text-xs font-semibold text-[#0b4fa8] disabled:opacity-60"
              >
                <UiText>{thread.assignedUserId === me ? t.mine : t.claim}</UiText>
              </button>
              {thread.status !== "closed" ? <button type="button" data-operator-chat="close" disabled={busy} onClick={() => { setCloseError(""); setClosingId(thread.id); }} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"><CheckCheck className="size-4" /><UiText>{t.close}</UiText></button> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="size-3" /><UiText>{"Yakunlangan"}</UiText></span>}
            </header>
            {notice ? <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><UiText>{notice}</UiText></p> : null}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {thread.messages.map((message) => {
                const mine = message.role === "dmed";
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${mine ? "bg-[#0b4fa8] text-white" : "bg-white text-[#122033]"}`}
                    >
                      <p className={`mb-1 text-[10px] font-semibold uppercase ${mine ? "text-white/70" : "text-[#8a97a6]"}`}>
                        <UiText>{mine ? t.you : t.visitor}</UiText>
                      </p>
                      <ChatMessageBody message={message} />
                      <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-[#8a97a6]"}`}>
                        <UiText>{when(message.createdAt)}</UiText>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              className="border-t border-[#e6edf4] bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send("reply");
              }}
            >
              {thread.status === "closed" ? (
                <p className="text-sm text-[#5b6b7c]"><UiText>{t.closed}</UiText> <UiText>{thread.inquiryCategoryTitle ? `Bo‘lim: ${thread.inquiryCategoryTitle}` : ""}</UiText></p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500"><MessageSquareText className="size-4 text-blue-600" /><UiText>{"Tayyor javoblar"}</UiText></div>
                  <AdminChatTemplates language={thread.language} draft={text} templates={thread.language === "ru" ? templates.ru : templates.uz} onInsert={setText} onTemplates={setTemplates} endpoint="/api/operator/chat-workspace" />
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    aria-label={t.reply}
                    disabled={busy || Boolean(thread.assignedUserId && thread.assignedUserId !== me)}
                    placeholder={t.reply}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#d5dee8] px-3 py-2 text-sm outline-none focus:border-[#0b4fa8]"
                  />
                  {error ? <p role="alert" className="text-sm text-[#b42318]"><UiText>{error}</UiText></p> : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      data-operator-chat="close"
                      disabled={busy}
                      onClick={() => { setCloseError(""); setClosingId(thread.id); }}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCheck className="size-4" />
                      <UiText>{t.close}</UiText>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || Boolean(thread.assignedUserId && thread.assignedUserId !== me)}
                        onClick={() => void send("ai")}
                        className="rounded-xl border border-[#0b4fa8] px-3 py-2 text-sm font-semibold text-[#0b4fa8] disabled:opacity-50"
                      >
                        <UiText>{busy ? t.loading : t.ai}</UiText>
                      </button>
                      <button
                        type="submit"
                        disabled={busy || !text.trim() || Boolean(thread.assignedUserId && thread.assignedUserId !== me)}
                        className="rounded-xl bg-[#0b4fa8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <UiText>{t.send}</UiText>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="hidden flex-1 items-center justify-center text-sm text-[#5b6b7c] md:flex">
            {error ? <div role="alert" className="space-y-3 text-center"><p><UiText>{error}</UiText></p><button type="button" onClick={() => void openThread(activeId)} className="rounded-xl bg-blue-600 px-4 py-2 text-white"><UiText>{"Qayta urinish"}</UiText></button></div> : t.pick}
          </div>
        )}
      </section>
      <CloseChatDialog key={closingId || "idle"} open={Boolean(closingId)} name={thread?.name || ""} categories={categories} busy={busy} error={closeError} onOpenChange={value => { if (!value) setClosingId(""); }} onConfirm={endChat} />
    </div>
  );
}
