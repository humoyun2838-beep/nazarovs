"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Mic, Paperclip, Send, Square, Star, X } from "lucide-react";
import { ratingFromStored } from "@/lib/chat-rating";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChatMessageBody } from "@/components/chat-message-media";

type Lang = "uz" | "ru";

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
};

const copy = {
  uz: {
    welcome: "Xush kelibsiz!",
    intro: "Iltimos, suhbatni boshlash uchun o‘zingizni tanishing",
    name: "Ism",
    namePh: "Ismingizni kiriting",
    phone: "Telefon",
    email: "Email",
    emailPh: "Emailingizni kiriting (ixtiyoriy)",
    language: "Til tanlash",
    start: "Suhbatni boshlash",
    online: "Online · saytda javob beriladi",
    waiting: "Operator javobini kutyapmiz…",
    open: "Dmed bilan yozish",
    close: "Yopish",
    messagePh: "Xabar yozing…",
    send: "Yuborish",
    sending: "Yuborilmoqda…",
    attach: "Rasm yoki video",
    voice: "Ovozli xabar",
    stopVoice: "Yozishni to‘xtatish",
    recording: "Yozilmoqda…",
    needMic: "Mikrofonga ruxsat bering.",
    mediaFail: "Fayl yuborilmadi. Qayta urinib ko‘ring.",
    pendingAck: "Xabaringiz qabul qilindi. Shu chatda javob beramiz.",
    empty: "Ism va telefonni to‘ldiring.",
    fail: "Xabar yuborilmadi. Qayta urinib ko‘ring.",
    closed: "Suhbat yopildi",
    rateTitle: "Operatorni baholang",
    rateHint: "1 dan 5 gacha ball qo‘ying",
    restart: "Yangi suhbat",
    star: "ball",
    thanks: "Bahoyingiz uchun rahmat.",
    uz: "O‘zbekcha",
    ru: "Rus",
  },
  ru: {
    welcome: "Добро пожаловать!",
    intro: "Пожалуйста, представьтесь, чтобы начать чат",
    name: "Имя",
    namePh: "Введите имя",
    phone: "Телефон",
    email: "Email",
    emailPh: "Введите email (необязательно)",
    language: "Выбор языка",
    start: "Начать чат",
    online: "Online · ответ будет на сайте",
    waiting: "Ожидаем ответ оператора…",
    open: "Написать Dmed",
    close: "Закрыть",
    messagePh: "Напишите сообщение…",
    send: "Отправить",
    sending: "Отправка…",
    attach: "Фото или видео",
    voice: "Голосовое",
    stopVoice: "Остановить запись",
    recording: "Идёт запись…",
    needMic: "Разрешите доступ к микрофону.",
    mediaFail: "Файл не отправлен. Попробуйте ещё раз.",
    pendingAck: "Сообщение принято. Ответим в этом чате.",
    empty: "Заполните имя и телефон.",
    fail: "Не удалось отправить. Попробуйте ещё раз.",
    closed: "Чат закрыт",
    rateTitle: "Оцените оператора",
    rateHint: "Поставьте оценку от 1 до 5",
    restart: "Начать новый чат",
    star: "балл",
    thanks: "Спасибо за оценку.",
    uz: "O‘zbekcha",
    ru: "Русский",
  },
} as const;

async function chatJson(
  payload?: Record<string, unknown>,
  method = "POST",
  query = "",
) {
  const res = await fetch(`/api/chat${query}`, {
    method,
    credentials: "same-origin",
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { status: res.status, data };
}

async function chatForm(form: FormData) {
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
}

function hasReceiptAck(messages: ChatMsg[]) {
  return messages.some(
    (msg) =>
      msg.role === "dmed" &&
      (msg.body === copy.uz.pendingAck || msg.body === copy.ru.pendingAck),
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

export function DmedChat() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("uz");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [canSend, setCanSend] = useState(true);
  const [canRate, setCanRate] = useState(false);
  const [closed, setClosed] = useState(false);
  const [rating, setRating] = useState("");
  const [hoverStar, setHoverStar] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number>(0);
  const t = copy[lang];

  const hidden = useMemo(
    () => pathname === "/admin" || pathname.startsWith("/admin/"),
    [pathname],
  );

  function applySession(session: ChatSession | null | undefined, markOpen: boolean) {
    if (!session) return;
    setStarted(true);
    if (session.language === "ru") setLang("ru");
    if (Array.isArray(session.messages)) setMessages(session.messages);
    setWaiting(Boolean(session.waitingForOperator) && session.status !== "closed");
    setUnread(markOpen ? 0 : Number(session.unreadFromOperator) || 0);
    const isClosed = session.status === "closed" || session.canSend === false;
    setClosed(isClosed);
    setCanSend(session.canSend !== false && !isClosed);
    setCanRate(Boolean(session.canRate));
    setRating(
      session.rating == null || session.rating === ""
        ? ""
        : String(session.rating),
    );
    setHoverStar(0);
  }

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    let idleId = 0;
    let timeoutId = 0;
    const load = () => {
      chatJson(undefined, "GET").then(({ data }) => {
        if (cancelled || !data || typeof data !== "object") return;
        applySession(data.session as ChatSession | null, false);
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(load);
    } else {
      timeoutId = window.setTimeout(load, 450);
    }
    return () => {
      cancelled = true;
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden || !started) return;
    let id = 0;
    const tick = () => {
      if (document.hidden) return;
      const query = open ? "?seen=1" : "";
      chatJson(undefined, "GET", query).then(({ data }) => {
        applySession(data?.session as ChatSession | null, open);
      });
    };
    id = window.setInterval(tick, open ? 4000 : 12000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hidden, started, open]);

  useEffect(() => {
    if (!open || !started) return;
    chatJson(undefined, "GET", "?seen=1").then(({ data }) => {
      applySession(data?.session as ChatSession | null, true);
    });
  }, [open, started]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      window.clearInterval(recordTimerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, []);

  if (hidden) return null;

  async function onStart(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    const { status, data } = await chatJson({
      action: "start",
      name,
      phone,
      email,
      language: lang,
      page: pathname,
    });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      const errors =
        data && typeof data.errors === "object" && data.errors
          ? (data.errors as Record<string, string>)
          : {};
      setFieldErrors(errors);
      setError(Object.values(errors)[0] || t.empty);
      return;
    }
    setStarted(true);
    setName("");
    setPhone("");
    setEmail("");
    applySession(
      {
        language: lang,
        messages: Array.isArray(data.messages) ? (data.messages as ChatMsg[]) : [],
        waitingForOperator: Boolean(data.waitingForOperator),
        unreadFromOperator: 0,
        status: "open",
        canSend: true,
        canRate: false,
        canRestart: false,
      },
      true,
    );
  }

  function applyFromPayload(data: Record<string, unknown> | null) {
    if (!data) return;
    applySession(
      {
        language: lang,
        messages: Array.isArray(data.messages) ? (data.messages as ChatMsg[]) : [],
        waitingForOperator: Boolean(data.waitingForOperator),
        unreadFromOperator: 0,
        status: typeof data.status === "string" ? data.status : "open",
        rating:
          data.rating == null || data.rating === ""
            ? ""
            : String(data.rating),
        canSend: data.canSend !== false,
        canRate: Boolean(data.canRate),
        canRestart: Boolean(data.canRestart),
      },
      true,
    );
  }

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
      body: t.pendingAck,
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
      page: pathname,
    });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      setError(typeof data?.error === "string" ? data.error : t.fail);
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
    const showAck = !hasReceiptAck(messages);
    const tempAck: ChatMsg = {
      id: tempVisitor.id - 1,
      role: "dmed",
      body: t.pendingAck,
      createdAt: now,
    };
    setMessages((current) =>
      showAck ? [...current, tempVisitor, tempAck] : [...current, tempVisitor],
    );
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
    form.set("page", pathname);
    const { status, data } = await chatForm(form);
    setBusy(false);
    URL.revokeObjectURL(localUrl);
    if (status >= 400 || !data?.ok) {
      setError(typeof data?.error === "string" ? data.error : t.mediaFail);
      return;
    }
    applyFromPayload(data);
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void sendMedia(file, file.name);
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function toggleVoice() {
    if (busy || !canSend) return;
    if (recording) {
      stopRecording();
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t.needMic);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
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
      setError(t.needMic);
    }
  }

  async function onRate(value: number) {
    if (busy || !canRate) return;
    setBusy(true);
    setError("");
    const { status, data } = await chatJson({
      action: "rate",
      rating: value,
    });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      setError(typeof data?.error === "string" ? data.error : t.fail);
      return;
    }
    applySession((data.session as ChatSession) || null, true);
  }

  async function onRestart() {
    if (busy) return;
    setBusy(true);
    setError("");
    const { status, data } = await chatJson({
      action: "restart",
      page: pathname,
    });
    setBusy(false);
    if (status >= 400 || !data?.ok) {
      setStarted(false);
      setClosed(false);
      setCanSend(true);
      setCanRate(false);
      setRating("");
      setMessages([]);
      setHoverStar(0);
      setError(typeof data?.error === "string" ? data.error : t.fail);
      return;
    }
    applyFromPayload(data);
  }

  function onComposerKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void onSend();
    }
  }

  return (
    <div data-dmed-chat="widget">
      {open ? (
        <section
          className="fixed right-4 bottom-5 z-[80] flex w-[min(calc(100%-2rem),22.5rem)] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_18px_50px_-12px_rgba(15,23,42,0.45)]"
          role="dialog"
          aria-label="Dmed"
        >
          <header className="flex items-center gap-3 bg-[#1a6fd4] px-4 py-3 text-white">
            <span className="relative flex size-11 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
              D
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-[#1a6fd4] bg-[#22c55e]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] leading-none font-semibold">Dmed</p>
              <p className="mt-1 text-xs text-white/85">
                {closed ? t.closed : waiting ? t.waiting : t.online}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
              aria-label={t.close}
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </button>
          </header>

          {!started ? (
            <form className="space-y-3 px-5 py-5" onSubmit={onStart}>
              <div>
                <h2 className="text-center text-2xl font-semibold tracking-tight text-[#1f1b16]">
                  {t.welcome}
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-[#6b7280]">
                  {t.intro}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dmed-name">
                  {t.name} <span className="text-[#1a6fd4]">*</span>
                </Label>
                <Input
                  id="dmed-name"
                  name="name"
                  autoComplete="name"
                  placeholder={t.namePh}
                  value={name}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-[#f3f4f6]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dmed-phone">
                  {t.phone} <span className="text-[#1a6fd4]">*</span>
                </Label>
                <Input
                  id="dmed-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+998901234567"
                  value={phone}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 rounded-xl bg-[#f3f4f6]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dmed-email">{t.email}</Label>
                <Input
                  id="dmed-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t.emailPh}
                  value={email}
                  aria-invalid={Boolean(fieldErrors.email)}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl bg-[#f3f4f6]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dmed-lang">{t.language}</Label>
                <select
                  id="dmed-lang"
                  name="language"
                  value={lang}
                  onChange={(e) => setLang(e.target.value === "ru" ? "ru" : "uz")}
                  className="h-11 w-full rounded-xl border border-input bg-[#f3f4f6] px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="uz">{t.uz}</option>
                  <option value="ru">{t.ru}</option>
                </select>
              </div>

              {error ? (
                <p className="text-sm text-[#b42318]" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-full bg-[#1a6fd4] text-base text-white hover:bg-[#155bb0]"
              >
                {busy ? t.sending : t.start}
                <span aria-hidden> →</span>
              </Button>
            </form>
          ) : (
            <div className="flex h-[min(28rem,calc(100dvh-8rem))] flex-col">
              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.role === "visitor"
                        ? "ml-8 rounded-2xl rounded-br-md bg-[#1a6fd4] px-3 py-2 text-sm text-white"
                        : "mr-8 rounded-2xl rounded-bl-md bg-[#f3f4f6] px-3 py-2 text-sm text-[#1f1b16]"
                    }
                  >
                    <ChatMessageBody message={msg} />
                    {msg.createdAt ? (
                      <p
                        className={
                          msg.role === "visitor"
                            ? "mt-1 text-[10px] text-white/75"
                            : "mt-1 text-[10px] text-[#7a7166]"
                        }
                      >
                        {formatClock(msg.createdAt)}
                      </p>
                    ) : null}
                  </div>
                ))}
                {waiting && canSend ? (
                  <p className="px-1 text-xs text-[#7a7166]">{t.waiting}</p>
                ) : null}
                {canRate || (closed && ratingFromStored(rating)) ? (
                  <div
                    data-dmed-chat="rate"
                    className="mt-2 rounded-2xl bg-[#eef5ff] px-3 py-3"
                  >
                    <p className="text-center text-sm font-medium text-[#0b2a55]">
                      {canRate ? t.rateTitle : t.thanks}
                    </p>
                    {canRate ? (
                      <p className="mt-1 text-center text-xs text-[#3d5f8a]">
                        {t.rateHint}
                      </p>
                    ) : null}
                    <div
                      className="mt-2 flex items-center justify-center gap-1"
                      role="radiogroup"
                      aria-label={t.rateTitle}
                    >
                      {[1, 2, 3, 4, 5].map((n) => {
                        const current = ratingFromStored(rating) || 0;
                        const shown = canRate ? hoverStar || current : current;
                        const filled = n <= shown;
                        return (
                          <button
                            key={n}
                            type="button"
                            data-dmed-chat="rate"
                            data-rate={n}
                            disabled={busy || !canRate}
                            aria-label={`${n} ${t.star}`}
                            onMouseEnter={() => {
                              if (canRate) setHoverStar(n);
                            }}
                            onMouseLeave={() => setHoverStar(0)}
                            onClick={() => {
                              if (canRate) void onRate(n);
                            }}
                            className="rounded-full p-0.5 transition hover:scale-110 disabled:hover:scale-100"
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
                    data-dmed-chat="attach"
                    aria-label={t.attach}
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
                    data-dmed-chat="voice"
                    aria-label={recording ? t.stopVoice : t.voice}
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
                        ? `${t.recording} ${Math.floor(recordMs / 60000)}:${String(
                            Math.floor(recordMs / 1000) % 60,
                          ).padStart(2, "0")}`
                        : text
                    }
                    placeholder={t.messagePh}
                    disabled={recording}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onComposerKey}
                    className="h-11 flex-1 rounded-xl bg-[#f3f4f6]"
                  />
                  <Button
                    type="submit"
                    size="icon-lg"
                    disabled={busy || recording || !text.trim()}
                    aria-label={t.send}
                    className="rounded-full bg-[#1a6fd4] text-white hover:bg-[#155bb0]"
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              ) : (
                <div className="space-y-2 border-t border-[#eee] px-4 py-3">
                  <p className="text-center text-xs text-[#7a7166]">{t.closed}</p>
                  <Button
                    type="button"
                    data-dmed-chat="restart"
                    disabled={busy}
                    onClick={() => void onRestart()}
                    className="h-11 w-full rounded-full bg-[#1a6fd4] text-sm text-white hover:bg-[#155bb0]"
                  >
                    {busy ? t.sending : t.restart}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <button
          type="button"
          data-dmed-chat="launcher"
          aria-label={t.open}
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-5 z-[80] flex size-16 items-center justify-center rounded-full bg-[#1a6fd4] text-white shadow-[0_12px_30px_-8px_rgba(26,111,212,0.7)] transition hover:bg-[#155bb0]"
        >
          <MessageCircle className="size-7" />
          {unread > 0 ? (
            <span
              data-dmed-unread={unread}
              className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-semibold"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}
