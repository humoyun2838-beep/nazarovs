"use client";
import { UiText } from "@/components/ui-locale";


import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Send, Square, Star } from "lucide-react";
import { ratingFromStored } from "@/lib/chat-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/site-header";
import { ChatMessageBody } from "@/components/chat-message-media";
import { BrandMark } from "@/components/brand-logo";
import { OPERATOR_NAME, OPERATOR_ROLE } from "@/lib/chat-brand";

type ChatMsg = {
  id: number;
  role: string;
  body: string;
  createdAt: string;
  kind?: string;
  mime?: string;
  mediaUrl?: string;
  localUrl?: string;
};

type ChatSession = {
  language?: string;
  messages?: ChatMsg[];
  waitingForOperator?: boolean;
  unreadFromOperator?: number;
  status?: string;
  rating?: string;
  canSend?: boolean;
  canRate?: boolean;
  canRestart?: boolean;
  visitorName?: string;
  operatorName?: string;
  operatorRole?: string;
};

async function chatJson(
  body?: Record<string, unknown>,
  method = "POST",
  query = "",
) {
  try {
  const res = await fetch(`/api/chat${query}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { status: res.status, data };
  } catch { return { status: 503, data: null }; }
}

async function chatForm(form: FormData) {
  try {
  const res = await fetch("/api/chat", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { status: res.status, data };
  } catch { return { status: 503, data: null }; }
}

function hasReceiptAck(messages: ChatMsg[]) {
  return messages.some(
    (msg) =>
      msg.role === "dmed" &&
      msg.body === "Xabaringiz qabul qilindi. Shu chatda javob beramiz.",
  );
}

function formatClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatDesk({
  visitorName,
  operatorName = OPERATOR_NAME,
  operatorRole = OPERATOR_ROLE,
}: {
  visitorName: string;
  operatorName?: string;
  operatorRole?: string;
}) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [canRate, setCanRate] = useState(false);
  const [closed, setClosed] = useState(false);
  const [rating, setRating] = useState("");
  const [hoverStar, setHoverStar] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [who, setWho] = useState(operatorName);
  const [you, setYou] = useState(visitorName);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number>(0);

  function applySession(session: ChatSession | null | undefined) {
    if (!session) return;
    if (Array.isArray(session.messages)) setMessages(session.messages);
    setWaiting(Boolean(session.waitingForOperator) && session.status !== "closed");
    const isClosed = session.status === "closed" || session.canSend === false;
    setClosed(isClosed);
    setCanSend(session.canSend !== false && !isClosed);
    setCanRate(Boolean(session.canRate));
    setRating(
      session.rating == null || session.rating === ""
        ? ""
        : String(session.rating),
    );
    if (session.visitorName) setYou(session.visitorName);
    if (session.operatorName) setWho(session.operatorName);
    setHoverStar(0);
  }

  function applyFromPayload(data: Record<string, unknown> | null) {
    if (!data) return;
    applySession({
      messages: Array.isArray(data.messages) ? (data.messages as ChatMsg[]) : [],
      waitingForOperator: Boolean(data.waitingForOperator),
      status: typeof data.status === "string" ? data.status : "open",
      rating:
        data.rating == null || data.rating === "" ? "" : String(data.rating),
      canSend: data.canSend !== false,
      canRate: Boolean(data.canRate),
      canRestart: Boolean(data.canRestart),
      visitorName:
        typeof data.visitorName === "string" ? data.visitorName : undefined,
      operatorName:
        typeof data.operatorName === "string" ? data.operatorName : undefined,
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const existing = await chatJson(undefined, "GET", "?seen=1");
      if (cancelled) return;
      const session = existing.data?.session as ChatSession | null | undefined;
      const samePerson =
        !session?.visitorName ||
        session.visitorName === visitorName ||
        session.visitorName === you;
      if (session?.messages?.length && samePerson) {
        applySession(session);
        setBooting(false);
        return;
      }
      const started = await chatJson({
        action: "start",
        desk: true,
        language: "uz",
        page: "/chat",
      });
      if (cancelled) return;
      if (started.status >= 400 || !started.data?.ok) {
        setError("Suhbat ochilmadi. Qayta kiring.");
        setBooting(false);
        return;
      }
      applyFromPayload(started.data);
      setBooting(false);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (booting) return;
    let id = 0;
    const tick = () => {
      if (document.hidden) return;
      chatJson(undefined, "GET", "?seen=1").then(({ data }) => {
        applySession(data?.session as ChatSession | null);
      });
    };
    id = window.setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [booting]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    return () => {
      window.clearInterval(recordTimerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, []);

  async function onSend(event?: React.FormEvent) {
    event?.preventDefault();
    const body = text.trim();
    if (!body || busy || !canSend) return;
    const now = new Date().toISOString();
    const tempVisitor: ChatMsg = {
      id: -Date.now(),
      role: "visitor",
      body,
      createdAt: now,
    };
    const showAck = !hasReceiptAck(messages);
    const tempAck: ChatMsg = {
      id: tempVisitor.id - 1,
      role: "dmed",
      body: "Xabaringiz qabul qilindi. Shu chatda javob beramiz.",
      createdAt: now,
    };
    setMessages((current) =>
      showAck ? [...current, tempVisitor, tempAck] : [...current, tempVisitor],
    );
    setWaiting(true);
    setText("");
    setBusy(true);
    setError("");
    const { status, data } = await chatJson({
      action: "message",
      text: body,
      page: "/chat",
    });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      setMessages(current => current.filter(message => message.id !== tempVisitor.id && message.id !== tempAck.id));
      setText(current => current || body);
      setWaiting(waiting);
      setError(typeof data?.error === "string" ? data.error : "Xabar yuborilmadi.");
      return;
    }
    applyFromPayload(data);
  }

  function guessKind(file: Blob) {
    const mime = (file.type || "").toLowerCase();
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "voice";
    return "image";
  }

  async function sendMedia(file: Blob, filename: string) {
    if (busy || !canSend || recording) return;
    const localUrl = URL.createObjectURL(file);
    const caption = text.trim();
    const now = new Date().toISOString();
    const tempVisitor: ChatMsg = {
      id: -Date.now(),
      role: "visitor",
      body: caption,
      kind: guessKind(file),
      mime: file.type,
      localUrl,
      createdAt: now,
    };
    setMessages((current) => [...current, tempVisitor]);
    setWaiting(true);
    setText("");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("action", "media");
    form.set(
      "file",
      file instanceof File ? file : new File([file], filename, { type: file.type }),
    );
    form.set("kind", guessKind(file));
    if (caption) form.set("caption", caption);
    form.set("page", "/chat");
    const { status, data } = await chatForm(form);
    setBusy(false);
    URL.revokeObjectURL(localUrl);
    if (status >= 400 || !data?.ok) {
      setMessages(current => current.filter(message => message.id !== tempVisitor.id));
      setText(current => current || caption);
      setWaiting(waiting);
      setError(typeof data?.error === "string" ? data.error : "Fayl yuborilmadi.");
      return;
    }
    applyFromPayload(data);
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void sendMedia(file, file.name);
  }

  async function toggleVoice() {
    if (busy || !canSend) return;
    if (recording) {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Mikrofonga ruxsat bering.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        window.clearInterval(recordTimerRef.current);
        setRecording(false);
        setRecordMs(0);
        recorderRef.current = null;
        const type = rec.mimeType.split(";")[0] || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 80) return;
        void sendMedia(blob, "voice.webm");
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordMs(0);
      setError("");
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = window.setInterval(() => {
        setRecordMs((ms) => ms + 200);
      }, 200);
    } catch {
      setError("Mikrofonga ruxsat bering.");
    }
  }

  async function onRate(value: number) {
    if (busy || !canRate) return;
    setBusy(true);
    setError("");
    const { status, data } = await chatJson({ action: "rate", rating: value });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      setError(typeof data?.error === "string" ? data.error : "Baho yuborilmadi.");
      return;
    }
    applySession((data.session as ChatSession) || null);
  }

  async function onRestart() {
    if (busy) return;
    setBusy(true);
    setError("");
    const { status, data } = await chatJson({
      action: "restart",
      page: "/chat",
    });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      setError(typeof data?.error === "string" ? data.error : "Yangi suhbat ochilmadi.");
      return;
    }
    applyFromPayload(data);
  }

  function onComposerKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  }

  return (
    <div
      data-chat-desk="root"
      className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-3 py-3 sm:px-4 sm:py-5"
    >
      <header className="catalog-hero relative z-10 mb-3 flex items-center gap-3 rounded-[1.6rem] px-4 py-3">
        <BrandLogo href="/chat" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#1a6fd4] uppercase"><UiText>{" Chat sayti "}</UiText></p>
          <p className="truncate text-sm font-semibold text-[#071a38]" data-chat-desk="operator">
            <UiText>{who}</UiText>
          </p>
          <p className="truncate text-xs text-[#3d5a84]">
            <UiText>{operatorRole}</UiText><UiText>{" · siz — "}</UiText><UiText>{you}</UiText>
          </p>
        </div>
        <form action="/api/logout" method="post">
          <Button type="submit" variant="outline" size="sm" className="rounded-full"><UiText>{" Chiqish "}</UiText></Button>
        </form>
      </header>

      <section
        data-chat-desk="thread"
        className="catalog-panel relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem]"
      >
        <div className="flex items-center gap-3 border-b border-[#d7e4fb] bg-[#1a6fd4] px-4 py-3 text-white">
          <span className="relative flex size-10 items-center justify-center">
            <BrandMark tone="dark" className="size-10" />
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-[#1a6fd4] bg-[#22c55e]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-none"><UiText>{who}</UiText></p>
            <p className="mt-1 text-xs text-white/85">
              <UiText>{closed ? "Suhbat yopildi" : waiting ? "Javob kutilmoqda…" : "Online · shu yerda javob beriladi"}</UiText>
            </p>
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {booting ? (
            <p className="px-2 text-sm text-[#4a6288]"><UiText>{"Suhbat ochilmoqda…"}</UiText></p>
          ) : null}
          {messages.map((msg) =>
            msg.kind === "split" || msg.role === "system" ? (
              <div key={msg.id} className="flex items-center gap-2 py-1" role="separator">
                <span className="h-px flex-1 bg-[#d7e4fb]" />
                <span className="text-[11px] font-medium tracking-wide text-[#6b7c99]">
                  {msg.body}
                </span>
                <span className="h-px flex-1 bg-[#d7e4fb]" />
              </div>
            ) : (
              <div
                key={msg.id}
                className={
                  msg.role === "visitor"
                    ? "ml-8 rounded-2xl rounded-br-md bg-[#1a6fd4] px-3 py-2 text-sm text-white"
                    : "mr-8 rounded-2xl rounded-bl-md bg-[#eef5ff] px-3 py-2 text-sm text-[#1f1b16]"
                }
              >
                <p
                  className={
                    msg.role === "visitor"
                      ? "mb-1 text-[10px] font-semibold tracking-wide text-white/80"
                      : "mb-1 text-[10px] font-semibold tracking-wide text-[#1a6fd4]"
                  }
                >
                  <UiText>{msg.role === "visitor" ? you : who}</UiText>
                </p>
                <ChatMessageBody message={msg} />
                {msg.createdAt ? (
                  <p
                    className={
                      msg.role === "visitor"
                        ? "mt-1 text-[10px] text-white/75"
                        : "mt-1 text-[10px] text-[#7a7166]"
                    }
                  >
                    <UiText>{formatClock(msg.createdAt)}</UiText>
                  </p>
                ) : null}
              </div>
            ),
          )}
          {canRate || (closed && ratingFromStored(rating)) ? (
            <div className="rounded-2xl bg-[#eef5ff] px-3 py-3">
              <p className="text-center text-sm font-medium text-[#0b2a55]">
                <UiText>{canRate ? "Operatorni baholang" : "Bahoyingiz uchun rahmat."}</UiText>
              </p>
              <div className="mt-2 flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const current = ratingFromStored(rating) || 0;
                  const shown = canRate ? hoverStar || current : current;
                  const filled = n <= shown;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={busy || !canRate}
                      aria-label={`${n} ball`}
                      onMouseEnter={() => {
                        if (canRate) setHoverStar(n);
                      }}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => {
                        if (canRate) void onRate(n);
                      }}
                      className="rounded-full p-0.5"
                    >
                      <Star
                        className={
                          filled
                            ? "size-7 fill-[#f5b301] text-[#f5b301]"
                            : "size-7 text-[#9dbbe8]"
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="px-4 pb-1 text-sm text-[#b42318]" role="alert">
            {error}
          </p>
        ) : null}

        {canSend ? (
          <form
            data-auto-update-busy={busy || recording}
            className="flex items-end gap-1.5 border-t border-[#eee] px-2.5 py-3"
            onSubmit={onSend}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="sr-only"
              onChange={onPickFile}
            />
            <Button
              type="button"
              size="icon-lg"
              variant="ghost"
              aria-label="Rasm yoki video"
              disabled={busy || recording}
              onClick={() => fileRef.current?.click()}
              className="size-11 shrink-0 rounded-full text-[#1a6fd4] hover:bg-[#e8f1fb]"
            >
              <Paperclip className="size-5" />
            </Button>
            <Button
              type="button"
              size="icon-lg"
              variant="ghost"
              aria-label={recording ? "Yozishni to‘xtatish" : "Ovozli xabar"}
              disabled={busy}
              onClick={() => void toggleVoice()}
              className={
                recording
                  ? "size-11 shrink-0 rounded-full bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                  : "size-11 shrink-0 rounded-full text-[#1a6fd4] hover:bg-[#e8f1fb]"
              }
            >
              {recording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
            </Button>
            <Input
              name="message"
              value={
                recording
                  ? `Yozilmoqda… ${Math.floor(recordMs / 60000)}:${String(
                      Math.floor(recordMs / 1000) % 60,
                    ).padStart(2, "0")}`
                  : text
              }
              placeholder={`${who}ga yozing…`}
              disabled={recording || booting}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onComposerKey}
              className="h-11 flex-1 rounded-xl bg-[#f3f4f6]"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={busy || recording || booting || !text.trim()}
              aria-label="Yuborish"
              className="rounded-full bg-[#1a6fd4] text-white hover:bg-[#155bb0]"
            >
              <Send className="size-4" />
            </Button>
          </form>
        ) : (
          <div className="space-y-2 border-t border-[#eee] px-4 py-3">
            <p className="text-center text-xs text-[#7a7166]"><UiText>{"Suhbat yopildi"}</UiText></p>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void onRestart()}
              className="h-11 w-full rounded-full bg-[#1a6fd4] text-sm text-white hover:bg-[#155bb0]"
            ><UiText>{" Yangi suhbat "}</UiText></Button>
          </div>
        )}
      </section>
    </div>
  );
}
