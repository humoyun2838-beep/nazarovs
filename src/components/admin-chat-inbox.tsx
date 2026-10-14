"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleStop, Power, Search, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloseChatDialog, type InquiryCategory } from "@/components/close-chat-dialog";
import { AdminChatTemplates } from "@/components/admin-chat-templates";
import { ChatMessageBody } from "@/components/chat-message-media";
import type { ChatTemplatePack } from "@/lib/chat-templates";
import { starLabel } from "@/lib/chat-rating";
import type { Locale } from "@/lib/locale";
import { uiCopy } from "@/lib/ui-copy";
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
  inquiryCategoryTitle?: string;
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

async function chatFetch(input: RequestInfo | URL, init?: RequestInit) {
  try { return await fetch(input, init); }
  catch { return new Response(JSON.stringify({ ok: false, error: "Tarmoq bilan aloqa yo‘q. Qayta urinib ko‘ring." }), { status: 503, headers: { "content-type": "application/json" } }); }
}

export function AdminChatInbox({
  initialSessionId = "",
  staffOnly = false,
  locale = "uz",
}: {
  initialSessionId?: string;
  staffOnly?: boolean;
  locale?: Locale;
}) {
  const copy = uiCopy(locale);
  const [sessions, setSessions] = useState<InboxRow[]>([]);
  const [active, setActive] = useState(initialSessionId);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<InboxFolder>("all");
  const [folders, setFolders] = useState<InboxFolders>({ all: 0, new: 0, replied: 0 });
  const [templatePack, setTemplatePack] = useState<ChatTemplatePack>({ uz: [], ru: [] });
  const [categories, setCategories] = useState<InquiryCategory[]>([]);
  const [closingId, setClosingId] = useState("");
  const [closeError, setCloseError] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAuto, setAiAuto] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [mobileThread, setMobileThread] = useState(Boolean(initialSessionId));
  const listRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const lastMsgId = useRef(0);
  const activeRef = useRef(active);
  const drafts = useRef<Record<string, string>>({});
  const queryRef = useRef(query);
  const folderRef = useRef(folder);
  const listRequest = useRef(0);
  const threadRequest = useRef(0);
  const mutationBusy = useRef(false);
  mutationBusy.current = busy || aiBusy;

  activeRef.current = active;
  queryRef.current = query;
  folderRef.current = folder;

  async function loadList() {
    const request = ++listRequest.current;
    const params = new URLSearchParams();
    const q = queryRef.current.trim();
    if (q) params.set("q", q);
    if (activeRef.current) params.set("s", activeRef.current);
    const f = folderRef.current;
    if (f !== "all") params.set("f", f);
    try {
      const res = await chatFetch(`/api/admin/chat-workspace?${params.toString()}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sessions?: InboxRow[];
        folders?: InboxFolders;
        templates?: ChatTemplatePack;
        categories?: InquiryCategory[];
        aiAuto?: boolean;
        aiReady?: boolean;
        error?: string;
      } | null;
      if (request !== listRequest.current) return;
      if (!res.ok || !data?.sessions) {
        setListError(data?.error || "Suhbatlar yuklanmadi.");
        return;
      }
      setListError("");
      setSessions(data.sessions);
      if (data.folders) setFolders(data.folders);
      if (data.templates) setTemplatePack(data.templates);
      if (data.categories) setCategories(data.categories);
      if (typeof data.aiAuto === "boolean") setAiAuto(data.aiAuto);
      if (typeof data.aiReady === "boolean") setAiReady(data.aiReady);
    } catch {
      setListError("Suhbatlar yuklanmadi.");
    } finally {
      if (request === listRequest.current) setLoadingList(false);
    }
  }

  async function loadThread(id: string, silent = false) {
    if (silent && mutationBusy.current) return;
    const request = ++threadRequest.current;
    if (!silent && !thread) setLoadingThread(true);
    try {
      const res = await chatFetch("/api/admin/chat-workspace", {
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
      if (request !== threadRequest.current || activeRef.current !== id) return;
      if (!res.ok || !data?.session) { setError("Suhbat yuklanmadi. Qayta urinib ko‘ring."); return; }
      if (data.session.id === id) {
        setThread(data.session);
      }
    } finally {
      if (request === threadRequest.current) setLoadingThread(false);
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
    if (busy || aiBusy) return;
    if (activeRef.current) drafts.current[activeRef.current] = text;
    activeRef.current = id;
    ++threadRequest.current;
    if (id !== active) {
      setText(drafts.current[id] || "");
      setThread(null);
    }
    setActive(id);
    setMobileThread(true);
    setError("");
  }

  async function sendReplyBody(body: string) {
    if (!active) return false;
    const res = await chatFetch("/api/admin/chat-workspace", {
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
    if (data.session) { ++threadRequest.current; setThread(data.session); }
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

  async function aiDraft() {
    if (!active || busy || aiBusy) return;
    setAiBusy(true);
    setError("");
    const res = await chatFetch("/api/admin/ai", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "chat-draft", sessionId: active }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      text?: string;
      error?: string;
      message?: string;
    } | null;
    setAiBusy(false);
    if (!data?.ok || !data.text) {
      setError(data?.message || data?.error || copy.draftFail);
      return;
    }
    setText(data.text);
    window.setTimeout(() => {
      replyRef.current?.focus();
      const node = replyRef.current;
      if (node) {
        node.selectionStart = data.text!.length;
        node.selectionEnd = data.text!.length;
      }
    }, 0);
  }

  async function aiReply() {
    if (!active || busy || aiBusy) return;
    setAiBusy(true);
    setError("");
    const res = await chatFetch("/api/admin/ai", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "chat-reply", sessionId: active, force: true }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      session?: Thread;
      error?: string;
      message?: string;
    } | null;
    setAiBusy(false);
    if (!data?.ok) {
      setError(data?.message || data?.error || copy.replyFail);
      return;
    }
    if (data.session) { ++threadRequest.current; setThread(data.session); }
    setText("");
    loadList();
  }

  async function toggleAi() {
    const next = !aiAuto;
    setAiAuto(next);
    const res = await chatFetch("/api/admin/chat-workspace", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ai-auto", enabled: next }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      aiAuto?: boolean;
      aiReady?: boolean;
      error?: string;
    } | null;
    if (!data?.ok) {
      setAiAuto(!next);
      setError(data?.error || "AI holati saqlanmadi.");
      return;
    }
    setAiAuto(Boolean(data.aiAuto));
    if (typeof data.aiReady === "boolean") setAiReady(data.aiReady);
    void loadList();
    if (next && active) {
      await aiReply();
      return;
    }
    if (active) void loadThread(active);
  }

  async function endChat(categoryId: number) {
    if (!closingId || busy) return;
    const targetId = closingId;
    setBusy(true);
    setCloseError("");
    try {
      const res = await chatFetch("/api/admin/chat-workspace", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "close", sessionId: targetId, categoryId }),
      });
      const data = await res.json() as { ok?: boolean; session?: Thread; error?: string };
      if (!res.ok || !data.ok) {
        setCloseError(data.error === "closed" ? "Suhbat allaqachon yakunlangan." : data.error || "Suhbat yopilmadi.");
        return;
      }
      if (data.session && activeRef.current === targetId) { ++threadRequest.current; setThread(data.session); setText(""); }
      setClosingId("");
      void loadList();
      window.dispatchEvent(new Event("chat-closed"));
    } catch { setCloseError("Tarmoq bilan aloqa yo‘q. Qayta urinib ko‘ring."); }
    finally { setBusy(false); }
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
      ? copy.emptySearch
      : folder === "new"
        ? copy.emptyNew
        : folder === "replied"
          ? copy.emptyReplied
          : copy.emptyAll;

  const folderTabs = [
    { id: "all" as const, label: copy.all, count: folders.all },
    { id: "new" as const, label: copy.fresh, count: folders.new },
    { id: "replied" as const, label: copy.replied, count: folders.replied },
  ];

  return (
    <div
      className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
      data-staff-chat={staffOnly ? "desk" : undefined}
    >
      <aside
        data-admin-chat="inbox"
        className={cn(
          "flex max-h-[min(74vh,44rem)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-[#d7e6fb] bg-white shadow-sm",
          mobileThread ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="space-y-3 border-b border-[#e7eef8] p-3">
          {staffOnly ? null : (
          <>
          <button
            type="button"
            data-admin-chat="ai-auto"
            onClick={() => void toggleAi()}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium",
              aiAuto
                ? "bg-[#e8f4ff] text-[#0b4fa8]"
                : "bg-[#f3f4f6] text-[#5a5248]",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Power className="size-4" />
              <UiText>{copy.aiToggle}</UiText>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                aiAuto ? "bg-[#1a6fd4] text-white" : "bg-white text-[#7a7166]",
              )}
            >
              <UiText>{aiAuto ? copy.onShort : copy.offShort}</UiText>
            </span>
          </button>
          <p className="text-[11px] leading-relaxed text-[#7a7166]">
            <UiText>{aiAuto
              ? copy.aiOn
              : copy.aiOff}</UiText>
            <UiText>{!aiReady
              ? copy.aiMissing
              : ""}</UiText>
          </p>
          </>
          )}
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#5b7aa8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.searchChats}
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
                    <UiText>{tab.label}</UiText>
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
            <p className="p-3 text-sm font-medium text-[#1c3358]"><UiText>{"Suhbatlar yuklanmoqda…"}</UiText></p>
          ) : listError ? (
            <div className="space-y-2 p-3">
              <p className="text-sm text-[#b42318]" role="alert">
                <UiText>{listError}</UiText>
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => loadList()}><UiText>{" Qayta urinish "}</UiText></Button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="p-3 text-sm font-medium text-[#1c3358]"><UiText>{emptyCopy}</UiText></p>
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
                disabled={busy || aiBusy}
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
                  <UiText>{initial}</UiText>
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
                      <UiText>{formatWhen(row.lastAt)}</UiText>
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
                        <UiText>{starLabel(row.rating) || "Yopilgan"}</UiText>
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
                  {row.ip && !staffOnly ? (
                    <span
                      data-inbox-ip={row.ip}
                      className={cn(
                        "mt-0.5 block truncate font-mono text-[11px] font-semibold",
                        selected ? "text-white/90" : "text-[#0b4fa8]",
                      )}
                    ><UiText>{" IP "}</UiText><UiText>{row.ip}</UiText>
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
                  <UiText>{open.language
                    ? ` · ${
                        open.language === "ru"
                          ? "Русский"
                          : open.language === "en"
                            ? "English"
                            : "O‘zbekcha"
                      }`
                    : ""}</UiText>
                  <UiText>{staffOnly ? null : open.page ? ` · ${open.page}` : ""}</UiText>
                  <UiText>{open.status === "closed"
                    ? starLabel(open.rating)
                      ? ` · Yopilgan · ${starLabel(open.rating)}`
                      : " · Yopilgan"
                    : ""}</UiText>
                </p>
                {staffOnly ? null : (
                <p
                  className="mt-0.5 font-mono text-xs font-semibold tracking-wide text-[#0b4fa8]"
                  data-visitor-ip={open.ip || ""}
                >
                  <UiText>{open.ip ? `IP ${open.ip}` : "IP —"}</UiText>
                </p>
                )}
              </div>
              {open.status !== "closed" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-admin-chat="close"
                  disabled={busy}
                  onClick={() => { setCloseError(""); setClosingId(active); }}
                  className="shrink-0 rounded-full border-[#f3c4c0] text-[#b42318] hover:bg-[#fff1f0]"
                >
                  <CircleStop className="size-3.5" />
                  <span className="hidden sm:inline"><UiText>{"Suhbatni yakunlash"}</UiText></span>
                  <span className="sm:hidden"><UiText>{"Yakunlash"}</UiText></span>
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
                    <UiText>{msg.role === "visitor" ? copy.visitor : copy.you}</UiText> · <UiText>{formatClock(msg.createdAt)}</UiText>
                  </p>
                </div>
              ))}
              {aiBusy ? (
                <div className="ml-8 rounded-2xl rounded-br-md bg-[#1a6fd4]/80 px-3 py-2 text-sm text-white">
                  <UiText>{copy.loading}</UiText>
                </div>
              ) : null}
            </div>
            {open.status === "closed" ? (
              <p className="border-t border-[#eee] px-4 py-3 text-sm text-[#7a7166]">
                <UiText>{copy.closedLead}</UiText>
                <UiText>{open.inquiryCategoryTitle ? ` Bo‘lim: ${open.inquiryCategoryTitle}.` : ""}</UiText>
                <UiText>{starLabel(open.rating)
                  ? ` Baho: ${starLabel(open.rating)}.`
                  : " Mijoz operatorni 1–5 ball bilan baholashi kutilmoqda."}</UiText>
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
                onTemplates={staffOnly ? undefined : setTemplatePack}
                manage={!staffOnly}
              />
              <div className="mt-2 flex items-end gap-2">
                <Textarea
                  ref={replyRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onReplyKey}
                  placeholder={copy.replyPh}
                  className="min-h-16 flex-1 resize-none rounded-xl border-[#cfe0f5] bg-[#f4f8ff] text-[#051530]"
                />
                <Button
                  type="submit"
                  disabled={busy || aiBusy || !text.trim()}
                  className="h-11 rounded-full bg-[#1a6fd4] px-4 text-white hover:bg-[#155bb0]"
                >
                  <Send className="size-4" />
                  <span className="hidden sm:inline"><UiText>{copy.send}</UiText></span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || aiBusy || !aiReady}
                  onClick={() => void aiDraft()}
                  className="h-11 rounded-full border-[#9dbbe8] text-[#0b4fa8]"
                >
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline"><UiText>{copy.aiDraft}</UiText></span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || aiBusy || !aiReady}
                  onClick={() => void aiReply()}
                  className="h-11 rounded-full border-[#9dbbe8] text-[#0b4fa8]"
                >
                  <Sparkles className="size-4" />
                  <span className="hidden lg:inline"><UiText>{copy.aiSend}</UiText></span>
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-admin-chat="close"
                  disabled={busy}
                  onClick={() => { setCloseError(""); setClosingId(active); }}
                  className="h-8 rounded-full border-[#f3c4c0] text-[#b42318] hover:bg-[#fff1f0]"
                >
                  <CircleStop className="size-3.5" />
                  <UiText>{copy.closeChat}</UiText>
                </Button>
                {error ? (
                  <p className="text-sm text-[#b42318]" role="alert">
                    {error}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#9a9186]">
                    <UiText>{copy.closeHint}</UiText>
                  </p>
                )}
              </div>
            </form>
            )}
          </>
        ) : loadingThread ? (
          <p className="m-auto text-sm font-medium text-[#1c3358]"><UiText>{copy.opening}</UiText></p>
        ) : (
          <p className="m-auto max-w-xs px-6 text-center text-sm font-medium text-[#1c3358]">
            <UiText>{copy.pickThread}</UiText>
          </p>
        )}
      </section>
      <CloseChatDialog key={closingId || "idle"} open={Boolean(closingId)} name={open?.name || ""} categories={categories} busy={busy} error={closeError} onOpenChange={value => { if (!value) setClosingId(""); }} onConfirm={endChat} />
    </div>
  );
}
