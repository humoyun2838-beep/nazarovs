"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleStop, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminChatTemplates } from "@/components/admin-chat-templates";
import { ChatMessageBody } from "@/components/chat-message-media";
import type { ChatTemplatePack } from "@/lib/chat-templates";
import { starLabel } from "@/lib/chat-rating";
import { cn } from "@/lib/utils";

type InboxRow = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  language?: string;
  page?: string;
  ip?: string;
  lastBody: string;
  lastAt: string;
  unread?: boolean;
  unreadCount?: number;
  status?: string;
  rating?: string;
};

type InboxFolder = "all" | "new" | "replied";

type InboxFolders = {
  all: number;
  new: number;
  replied: number;
};

type ChatMsg = {
  id: number;
  role: string;
  body: string;
  createdAt: string;
  kind?: string;
  mime?: string;
  mediaUrl?: string;
};

type Thread = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  language?: string;
  page?: string;
  ip?: string;
  status?: string;
  rating?: string;
  messages: ChatMsg[];
};

function formatClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return "hozir";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} daq`;
  if (diff < 86_400_000) return formatClock(iso);
  return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

export function AdminChatInbox({
  initialSessionId = "",
}: {
  initialSessionId?: string;
}) {
  const [sessions, setSessions] = useState<InboxRow[]>([]);
  const [active, setActive] = useState(initialSessionId);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<InboxFolder>("all");
  const [folders, setFolders] = useState<InboxFolders>({ all: 0, new: 0, replied: 0 });
  const [templatePack, setTemplatePack] = useState<ChatTemplatePack>({ uz: [], ru: [] });
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [mobileThread, setMobileThread] = useState(Boolean(initialSessionId));
  const listRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const lastMsgId = useRef(0);
  const activeRef = useRef(active);
  const queryRef = useRef(query);
  const folderRef = useRef(folder);

  activeRef.current = active;
  queryRef.current = query;
  folderRef.current = folder;

  async function loadList() {
    const params = new URLSearchParams();
    const q = queryRef.current.trim();
    if (q) params.set("q", q);
    if (activeRef.current) params.set("s", activeRef.current);
    const f = folderRef.current;
    if (f !== "all") params.set("f", f);
    try {
      const res = await fetch(`/api/admin/chat?${params.toString()}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sessions?: InboxRow[];
        folders?: InboxFolders;
        templates?: ChatTemplatePack;
        error?: string;
      } | null;
      if (!res.ok || !data?.sessions) {
        setListError(data?.error || "Suhbatlar yuklanmadi.");
        return;
      }
      setListError("");
      setSessions(data.sessions);
      if (data.folders) setFolders(data.folders);
      if (data.templates) setTemplatePack(data.templates);
    } catch {
      setListError("Suhbatlar yuklanmadi.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadThread(id: string, silent = false) {
    if (!silent && !thread) setLoadingThread(true);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "thread",
          sessionId: id,
          markRead: false,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        session?: Thread;
      } | null;
      if (data?.session && data.session.id === id) {
        setThread(data.session);
      }
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    loadList();
    const id = window.setInterval(loadList, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadList();
    }, 280);
    return () => window.clearTimeout(id);
  }, [query, folder]);

  useEffect(() => {
    if (!active) return;
    lastMsgId.current = 0;
    loadThread(active, false);
    const id = window.setInterval(() => loadThread(active, true), 2500);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    const last = thread?.messages.at(-1)?.id || 0;
    if (last > lastMsgId.current) {
      lastMsgId.current = last;
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [thread?.messages]);

  function openSession(id: string) {
    if (id !== active) {
      setText("");
      setThread(null);
    }
    setActive(id);
    setMobileThread(true);
    setError("");
  }

  async function sendReplyBody(body: string) {
    if (!active) return false;
    const res = await fetch("/api/admin/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: active, text: body }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      session?: Thread;
      error?: string;
    } | null;
    if (!data?.ok) {
      setError(data?.error || "Javob yozilmadi.");
      return false;
    }
    if (data.session) setThread(data.session);
    loadList();
    return true;
  }

  async function reply(event?: React.FormEvent) {
    event?.preventDefault();
    if (!active || !text.trim() || busy) return;
    const body = text.trim();
    setBusy(true);
    setError("");
    const ok = await sendReplyBody(body);
    setBusy(false);
    if (!ok) return;
    setText("");
    replyRef.current?.focus();
  }

  async function endChat() {
    if (!active || busy) return;
    setBusy(true);
    setError("");
    const pending = text.trim();
    if (pending) {
      const sent = await sendReplyBody(pending);
      if (!sent) {
        setBusy(false);
        return;
      }
      setText("");
    }
    const res = await fetch("/api/admin/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "close", sessionId: active }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      session?: Thread;
      error?: string;
    } | null;
    setBusy(false);
    if (!data?.ok) {
      setError(
        data?.error === "closed"
          ? "Suhbat allaqachon yakunlangan."
          : data?.error || "Suhbat yopilmadi.",
      );
      return;
    }
    if (data.session) setThread(data.session);
    loadList();
  }

  function insertTemplate(body: string) {
    setText(body);
    window.setTimeout(() => {
      replyRef.current?.focus();
      const node = replyRef.current;
      if (node) {
        node.selectionStart = body.length;
        node.selectionEnd = body.length;
      }
    }, 0);
  }

  function onReplyKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void reply();
    }
  }

  const open =
    thread && thread.id === active
      ? {
          ...thread,
          ip: thread.ip || sessions.find((row) => row.id === active)?.ip || "",
        }
      : null;
  const emptyCopy =
    query
      ? "Qidiruv bo‘yicha suhbat topilmadi."
      : folder === "new"
        ? "Yangi savol yo‘q — hammasi javoblangan."
        : folder === "replied"
          ? "Hali javob yozilgan suhbat yo‘q."
          : "Hali mijoz savoli yo‘q. Katalogdagi Dmed orqali yozilganda shu yerda chiqadi.";

  const folderTabs = [
    { id: "all" as const, label: "Hammasi", count: folders.all },
    { id: "new" as const, label: "Yangi", count: folders.new },
    { id: "replied" as const, label: "Javoblangan", count: folders.replied },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <aside
        data-admin-chat="inbox"
        className={cn(
          "flex max-h-[min(74vh,44rem)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-[#d7e6fb] bg-white shadow-sm",
          mobileThread ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="space-y-3 border-b border-[#e7eef8] p-3">
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#5b7aa8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ism, telefon yoki xabar…"
                className="h-10 rounded-xl border-[#cfe0f5] bg-[#f4f8ff] pl-9 text-[#051530]"
                aria-label="Suhbatlarni qidirish"
              />
            </div>
          </form>
          <div
            data-admin-chat="filters"
            role="tablist"
            aria-label="Suhbat filtri"
            className="grid grid-cols-3 gap-1 rounded-xl bg-[#eaf2fc] p-1"
          >
            {folderTabs.map((tab) => {
              const selected = folder === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-inbox-filter={tab.id}
                  onClick={() => setFolder(tab.id)}
                  className={cn(
                    "rounded-lg px-1.5 py-2 text-center transition",
                    selected
                      ? "bg-white text-[#051530] shadow-sm"
                      : "text-[#1a3a66] hover:text-[#051530]",
                  )}
                >
                  <span className="block text-[11px] font-semibold leading-none">
                    {tab.label}
                  </span>
                  <span
                    data-inbox-count={tab.id}
                    data-inbox-total={tab.count}
                    className={cn(
                      "mt-1 inline-flex max-w-full min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums whitespace-nowrap",
                      selected ? "bg-[#1a6fd4] text-white" : "bg-white/80 text-[#1a6fd4]",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {loadingList ? (
            <p className="p-3 text-sm font-medium text-[#1c3358]">Suhbatlar yuklanmoqda…</p>
          ) : listError ? (
            <div className="space-y-2 p-3">
              <p className="text-sm text-[#b42318]" role="alert">
                {listError}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => loadList()}>
                Qayta urinish
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="p-3 text-sm font-medium text-[#1c3358]">{emptyCopy}</p>
          ) : (
            sessions.map((row) => {
              const selected = active === row.id;
              const initial = (row.name || "?").trim().charAt(0).toUpperCase();
              return (
              <button
                key={row.id}
                type="button"
                data-unread={row.unread ? "1" : "0"}
                data-folder-item={row.unread ? "new" : "replied"}
                onClick={() => openSession(row.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2.5 text-left text-sm transition",
                  selected
                    ? "bg-[#1a6fd4] text-white shadow-sm"
                    : row.unread
                      ? "bg-[#eaf3ff] text-[#051530] hover:bg-[#dcebff]"
                      : "bg-transparent text-[#051530] hover:bg-[#f4f8ff]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    selected
                      ? "bg-white/20 text-white"
                      : row.unread
                        ? "bg-[#1a6fd4] text-white"
                        : "bg-[#d9e7f8] text-[#0b4fa8]",
                  )}
                >
                  {initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{row.name}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-medium",
                        selected ? "text-white/80" : "text-[#3d5f8a]",
                      )}
                    >
                      {formatWhen(row.lastAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-xs",
                        selected ? "text-white/85" : "text-[#1c3358]",
                      )}
                    >
                      {row.lastBody || row.phone}
                    </span>
                    {row.status === "closed" ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 text-[10px] font-semibold",
                          selected
                            ? "bg-white/20 text-white"
                            : "bg-[#e8eef6] text-[#1a3a66]",
                        )}
                      >
                        {starLabel(row.rating) || "Yopilgan"}
                      </span>
                    ) : null}
                    {row.unread ? (
                      <span
                        data-unread-count={row.unreadCount || 1}
                        className={cn(
                          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                          selected ? "bg-white text-[#1a6fd4]" : "bg-[#1a6fd4] text-white",
                        )}
                      >
                        {row.unreadCount || 1}
                      </span>
                    ) : null}
                  </span>
                  {row.ip ? (
                    <span
                      data-inbox-ip={row.ip}
                      className={cn(
                        "mt-0.5 block truncate font-mono text-[11px] font-semibold",
                        selected ? "text-white/90" : "text-[#0b4fa8]",
                      )}
                    >
                      IP {row.ip}
                    </span>
                  ) : null}
                </span>
              </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        data-admin-chat="thread"
        className={cn(
          "flex min-h-[22rem] max-h-[min(74vh,44rem)] flex-col overflow-hidden rounded-2xl border border-[#d7e6fb] bg-white shadow-sm",
          mobileThread ? "flex" : "hidden lg:flex",
        )}
      >
        {open ? (
          <>
            <header className="flex items-start gap-2 border-b border-[#e7eef8] px-3 py-3 sm:px-4">
              <button
                type="button"
                className="mt-0.5 rounded-full p-1 text-[#5a5248] hover:bg-[#f3f4f6] lg:hidden"
                aria-label="Ro‘yxatga qaytish"
                onClick={() => setMobileThread(false)}
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#051530]">{open.name}</p>
                <p className="truncate text-xs font-medium text-[#1c3358]">
                  {open.phone}
                  {open.email ? ` · ${open.email}` : ""}
                  {open.language ? ` · ${open.language === "ru" ? "Русский" : "O‘zbekcha"}` : ""}
                  {open.status === "closed"
                    ? starLabel(open.rating)
                      ? ` · Yopilgan · ${starLabel(open.rating)}`
                      : " · Yopilgan"
                    : ""}
                </p>
                <p
                  className="mt-0.5 font-mono text-xs font-semibold tracking-wide text-[#0b4fa8]"
                  data-visitor-ip={open.ip || ""}
                >
                  {open.ip ? `IP ${open.ip}` : "IP —"}
                </p>
              </div>
              {open.status !== "closed" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-admin-chat="close"
                  disabled={busy}
                  onClick={() => void endChat()}
                  className="shrink-0 rounded-full border-[#f3c4c0] text-[#b42318] hover:bg-[#fff1f0]"
                >
                  <CircleStop className="size-3.5" />
                  <span className="hidden sm:inline">Suhbatni yakunlash</span>
                  <span className="sm:hidden">Yakunlash</span>
                </Button>
              ) : null}
            </header>
            <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
              {open.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "visitor"
                      ? "mr-8 rounded-2xl rounded-bl-md bg-[#eef4fb] px-3 py-2 text-sm text-[#051530]"
                      : "ml-8 rounded-2xl rounded-br-md bg-[#1a6fd4] px-3 py-2 text-sm text-white"
                  }
                >
                  <ChatMessageBody message={msg} />
                  <p
                    className={
                      msg.role === "visitor"
                        ? "mt-1 text-[10px] font-medium text-[#3d5f8a]"
                        : "mt-1 text-[10px] text-white/75"
                    }
                  >
                    {msg.role === "visitor" ? "Mijoz" : "Siz"} · {formatClock(msg.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            {open.status === "closed" ? (
              <p className="border-t border-[#eee] px-4 py-3 text-sm text-[#7a7166]">
                Suhbat yakunlandi. Yangi javob yozib bo‘lmaydi.
                {starLabel(open.rating)
                  ? ` Baho: ${starLabel(open.rating)}.`
                  : " Mijoz operatorni 1–5 ball bilan baholashi kutilmoqda."}
              </p>
            ) : (
            <form className="border-t border-[#e7eef8] p-3" onSubmit={reply}>
              <AdminChatTemplates
                language={open.language}
                draft={text}
                templates={
                  open.language === "ru" ? templatePack.ru : templatePack.uz
                }
                onInsert={insertTemplate}
                onTemplates={setTemplatePack}
              />
              <div className="mt-2 flex items-end gap-2">
                <Textarea
                  ref={replyRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onReplyKey}
                  placeholder="Javob yozing — Enter bilan yuboriladi"
                  className="min-h-16 flex-1 resize-none rounded-xl border-[#cfe0f5] bg-[#f4f8ff] text-[#051530]"
                />
                <Button
                  type="submit"
                  disabled={busy || !text.trim()}
                  className="h-11 rounded-full bg-[#1a6fd4] px-4 text-white hover:bg-[#155bb0]"
                >
                  <Send className="size-4" />
                  <span className="hidden sm:inline">Yuborish</span>
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-admin-chat="close"
                  disabled={busy}
                  onClick={() => void endChat()}
                  className="h-8 rounded-full border-[#f3c4c0] text-[#b42318] hover:bg-[#fff1f0]"
                >
                  <CircleStop className="size-3.5" />
                  Suhbatni yakunlash
                </Button>
                {error ? (
                  <p className="text-sm text-[#b42318]" role="alert">
                    {error}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#9a9186]">
                    Yakunlagach mijoz operatorni 1–5 ball bilan baholaydi. Shift+Enter — yangi qator.
                  </p>
                )}
              </div>
            </form>
            )}
          </>
        ) : loadingThread ? (
          <p className="m-auto text-sm font-medium text-[#1c3358]">Suhbat ochilmoqda…</p>
        ) : (
          <p className="m-auto max-w-xs px-6 text-center text-sm font-medium text-[#1c3358]">
            Chapdan suhbatni bosing. Javobni shablon bilan tez yozasiz —
            hech narsa avtomatik ochilmaydi.
          </p>
        )}
      </section>
    </div>
  );
}
