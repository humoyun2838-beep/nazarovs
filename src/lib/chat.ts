import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { asc, desc, eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { formatVisitorTelegram, sendTelegramMessage } from "@/lib/telegram";
import {
  kindFromMime,
  maxBytesForKind,
  mimeFromFilename,
  saveChatMediaFile,
  type ChatMediaKind,
} from "@/lib/chat-media";
import {
  STAR_SQL,
  normalizeStarRating,
  publicRating,
  roundStarAvg,
  type ChatStarCounts,
} from "@/lib/chat-rating";

export const CHAT_COOKIE = "dmed_chat";

function chatSecret() {
  const secret =
    process.env.AUTH_SECRET || "nazarov-uz-local-dev-secret-change-me";
  return new TextEncoder().encode(`chat:${secret}`);
}

export function chatCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

export async function signChatToken(sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(chatSecret());
}

export async function readChatSessionId(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chatSecret());
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function digitCount(phone: string) {
  return (phone.match(/\d/g) || []).length;
}

export function validateVisitor(input: {
  name: unknown;
  phone: unknown;
  email?: unknown;
  language?: unknown;
}) {
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 32);
  const email = clean(input.email, 120);
  const language = clean(input.language, 8) === "ru" ? "ru" : "uz";
  const errors: Record<string, string> = {};

  if (name.length < 2) {
    errors.name =
      language === "ru" ? "Введите имя." : "Ismni kiriting.";
  }
  if (digitCount(phone) < 9) {
    errors.phone =
      language === "ru"
        ? "Введите номер телефона."
        : "Telefon raqamini kiriting.";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email =
      language === "ru" ? "Некорректный email." : "Email noto‘g‘ri.";
  }

  return { name, phone, email, language, errors };
}

export function getChatSession(id: string) {
  return db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .limit(1)
    .all()[0];
}

export function getChatMessages(sessionId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.id))
    .all();
}

export const CHAT_IDLE_MS = 24 * 60 * 60 * 1000;

export const RECEIPT_ACK_UZ =
  "Xabaringiz qabul qilindi. Shu chatda javob beramiz.";
export const RECEIPT_ACK_RU = "Сообщение принято. Ответим в этом чате.";
export const GREETING_UZ = "Savolingizni yozing — shu chatda javob beramiz.";
export const GREETING_RU = "Напишите вопрос по уроку — ответим в этом чате.";
export const RATE_PROMPT_UZ = "Suhbat yopildi. Operatorni baholang.";
export const RATE_PROMPT_RU = "Чат закрыт. Оцените оператора.";
export const RATE_THANKS_UZ = "Bahoyingiz uchun rahmat.";
export const RATE_THANKS_RU = "Спасибо за оценку.";

const AUTO_ACK = new Set([
  GREETING_UZ,
  GREETING_RU,
  "Va alaykum assalom! Dars bo‘yicha savolingizni yozing — shu chatda javob beramiz.",
  "Здравствуйте! Напишите вопрос по уроку — ответим в этом чате.",
  RECEIPT_ACK_UZ,
  RECEIPT_ACK_RU,
]);

const RATE_PROMPTS = new Set([RATE_PROMPT_UZ, RATE_PROMPT_RU]);
const RATE_THANKS = new Set([RATE_THANKS_UZ, RATE_THANKS_RU]);

export function isAutoAck(body: string) {
  return AUTO_ACK.has(body.trim());
}

export function isReceiptAck(body: string) {
  const text = body.trim();
  return text === RECEIPT_ACK_UZ || text === RECEIPT_ACK_RU;
}

function isHumanOperator(body: string) {
  const text = body.trim();
  return !isAutoAck(text) && !RATE_PROMPTS.has(text) && !RATE_THANKS.has(text);
}

function receiptAck(language: string) {
  return language === "ru" ? RECEIPT_ACK_RU : RECEIPT_ACK_UZ;
}

function ratePrompt(language: string) {
  return language === "ru" ? RATE_PROMPT_RU : RATE_PROMPT_UZ;
}

function rateThanks(language: string) {
  return language === "ru" ? RATE_THANKS_RU : RATE_THANKS_UZ;
}

export function mediaPlaceholder(kind: ChatMediaKind, language: string) {
  if (kind === "image") return language === "ru" ? "Фото" : "Rasm";
  if (kind === "video") return language === "ru" ? "Видео" : "Video";
  return language === "ru" ? "Голосовое" : "Ovozli xabar";
}

export type PublicChatMessage = {
  id: number;
  role: string;
  body: string;
  createdAt: string;
  kind: string;
  mime: string;
  mediaUrl: string;
};

function serializeMessage(
  row: {
    id: number;
    role: string;
    body: string;
    createdAt: string;
    kind?: string | null;
    mime?: string | null;
    mediaKey?: string | null;
  },
  name = "",
): PublicChatMessage {
  const kind = row.kind === "image" || row.kind === "video" || row.kind === "voice"
    ? row.kind
    : "text";
  return {
    id: row.id,
    role: row.role,
    body: hideVisitorName(row.body, name),
    createdAt: row.createdAt,
    kind,
    mime: row.mime || "",
    mediaUrl: row.mediaKey ? `/api/chat/media/${row.id}` : "",
  };
}

export function getChatMessage(id: number) {
  if (!Number.isFinite(id) || id <= 0) return undefined;
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, id))
    .limit(1)
    .all()[0];
}

function hideVisitorName(body: string, name: string) {
  let next = body
    .replace(
      /^Assalomu alaykum,[^\n]*/i,
      "Savolingizni yozing — shu chatda javob beramiz.",
    )
    .replace(
      /^Здравствуйте,[^\n]*/i,
      "Напишите вопрос — ответим в этом чате.",
    )
    .replace(
      /Xabaringiz\s+@?\S*\s*Telegramiga yuborildi\.?/gi,
      "Xabar yuborildi.",
    )
    .replace(
      /Ваше сообщение отправлено в Telegram\s+@?\S*\.?/gi,
      "Сообщение отправлено.",
    )
    .replace(/xabar Telegramga yuboriladi\.?/gi, "shu chatda javob beramiz.")
    .replace(
      /сообщение будет отправлено в Telegram\.?/gi,
      "ответим в этом чате.",
    );
  if (name && name.length >= 2) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next
      .replace(new RegExp(`,\\s*${escaped}\\s*`, "gi"), " ")
      .replace(new RegExp(escaped, "gi"), "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([!?.,])/g, "$1");
  }
  return next.trim();
}

function publicMessages(sessionId: string, name = "") {
  return getChatMessages(sessionId).map((row) => serializeMessage(row, name));
}

function waitingForOperator(messages: { id: number; role: string; body: string }[]) {
  const lastVisitor = [...messages].reverse().find((row) => row.role === "visitor");
  if (!lastVisitor) return false;
  const lastHuman = [...messages]
    .reverse()
    .find((row) => row.role === "dmed" && isHumanOperator(row.body));
  return !lastHuman || lastVisitor.id > lastHuman.id;
}

export function markAdminRead(sessionId: string) {
  db.update(chatSessions)
    .set({ lastReadAt: new Date().toISOString() })
    .where(eq(chatSessions.id, sessionId))
    .run();
}

export function markVisitorSeen(sessionId: string) {
  db.update(chatSessions)
    .set({ lastVisitorSeenAt: new Date().toISOString() })
    .where(eq(chatSessions.id, sessionId))
    .run();
}

function unreadFromOperator(
  messages: { role: string; body: string; createdAt: string }[],
  lastVisitorSeenAt: string,
) {
  const cutoff = lastVisitorSeenAt || "";
  return messages.filter(
    (row) =>
      row.role === "dmed" &&
      !isAutoAck(row.body) &&
      !RATE_THANKS.has(row.body.trim()) &&
      row.createdAt > cutoff,
  ).length;
}

export function parseChatDateRange(from?: string, to?: string) {
  const fromDay = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : "";
  const toDay = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : "";
  return {
    from: fromDay,
    to: toDay,
    fromIso: fromDay ? `${fromDay}T00:00:00.000Z` : "",
    toIso: toDay ? `${toDay}T23:59:59.999Z` : "",
  };
}

export function expireIdleChats(idleMs = CHAT_IDLE_MS, sessionId = "") {
  const cutoff = new Date(Date.now() - Math.max(0, idleMs)).toISOString();
  const rows = sqlite
    .prepare(
      `
      SELECT s.id, s.language
      FROM chat_sessions s
      WHERE s.status = 'open'
        AND IFNULL(s.last_operator_at, '') != ''
        AND s.last_operator_at <= ?
        AND (? = '' OR s.id = ?)
        AND NOT EXISTS (
          SELECT 1 FROM chat_messages m
          WHERE m.session_id = s.id
            AND m.role = 'visitor'
            AND m.created_at > s.last_operator_at
        )
      `,
    )
    .all(cutoff, sessionId, sessionId) as { id: string; language: string }[];

  if (!rows.length) return 0;

  const now = new Date().toISOString();
  const close = sqlite.prepare(
    `UPDATE chat_sessions SET status = 'closed', closed_at = ? WHERE id = ? AND status = 'open'`,
  );
  const insert = sqlite.prepare(
    `
    INSERT INTO chat_messages (
      session_id, role, body, telegram_ok, telegram_error, telegram_payload, telegram_mid, created_at
    ) VALUES (?, 'dmed', ?, 1, '', '', 0, ?)
    `,
  );

  const apply = sqlite.transaction((items: { id: string; language: string }[]) => {
    for (const row of items) {
      close.run(now, row.id);
      insert.run(row.id, ratePrompt(row.language), now);
    }
  });
  apply(rows);
  return rows.length;
}

async function recordAndSend(input: {
  sessionId: string;
  role: "visitor" | "dmed";
  body: string;
  skipTelegram?: boolean;
  telegramText?: string;
  kind?: string;
  mediaKey?: string;
  mime?: string;
}) {
  const now = new Date().toISOString();
  let telegramOk = 0;
  let telegramError = "";
  let telegram: { ok: boolean; reason?: string } = {
    ok: false,
    reason: "not_sent",
  };

  if (input.skipTelegram) {
    telegram = { ok: true, reason: "test" };
    telegramOk = 1;
  }

  const inserted = db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      role: input.role,
      body: input.body,
      telegramOk,
      telegramError,
      telegramPayload: input.telegramText || "",
      kind: input.kind || "text",
      mediaKey: input.mediaKey || "",
      mime: input.mime || "",
      createdAt: now,
    })
    .run();
  const rowId = Number(inserted.lastInsertRowid);

  if (input.skipTelegram || !input.telegramText) {
    return { telegram };
  }

  const sendPromise = sendTelegramMessage(input.telegramText);
  const raced = await Promise.race([
    sendPromise.then((result) => ({ ...result, timedOut: false as const })),
    new Promise<{
      ok: boolean;
      reason: string;
      timedOut: true;
      messageId?: number;
    }>((resolve) => {
      setTimeout(
        () => resolve({ ok: true, reason: "queued", timedOut: true }),
        800,
      );
    }),
  ]);

  if (!raced.timedOut) {
    telegram = { ok: raced.ok, reason: raced.reason };
    db.update(chatMessages)
      .set({
        telegramOk: raced.ok ? 1 : 0,
        telegramError: raced.ok ? "" : raced.reason || "failed",
        telegramMid: raced.messageId || 0,
      })
      .where(eq(chatMessages.id, rowId))
      .run();
    if (!raced.ok) console.warn("[dmed-telegram]", raced.reason || "failed");
    return { telegram };
  }

  void sendPromise.then((result) => {
    db.update(chatMessages)
      .set({
        telegramOk: result.ok ? 1 : 0,
        telegramError: result.ok ? "" : result.reason || "failed",
        telegramMid: result.messageId || 0,
      })
      .where(eq(chatMessages.id, rowId))
      .run();
    if (!result.ok) console.warn("[dmed-telegram]", result.reason || "failed");
  });

  return { telegram: { ok: true, reason: "queued" } };
}

export async function startChat(input: {
  name: unknown;
  phone: unknown;
  email?: unknown;
  language?: unknown;
  page?: unknown;
  ip?: unknown;
  skipTelegram?: boolean;
}) {
  const visitor = validateVisitor(input);
  if (Object.keys(visitor.errors).length) {
    return { ok: false as const, errors: visitor.errors };
  }

  const id = randomUUID();
  const page = clean(input.page, 180);
  const ip = clean(input.ip, 45);
  const now = new Date().toISOString();

  db.insert(chatSessions)
    .values({
      id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      language: visitor.language,
      page,
      visitorIp: ip,
      createdAt: now,
      lastReadAt: "",
      lastVisitorSeenAt: now,
      status: "open",
      closedAt: "",
      lastOperatorAt: "",
      rating: "",
      ratedAt: "",
    })
    .run();

  const greeting = visitor.language === "ru" ? GREETING_RU : GREETING_UZ;

  const liveTelegram =
    !input.skipTelegram && process.env.CHAT_LIVE_TELEGRAM === "1";

  const startSend = await recordAndSend({
    sessionId: id,
    role: "dmed",
    body: greeting,
    skipTelegram: !liveTelegram,
    telegramText: liveTelegram
      ? formatVisitorTelegram({
          kind: "start",
          sessionId: id,
          name: visitor.name,
          phone: visitor.phone,
          email: visitor.email,
          language: visitor.language,
          page,
          ip,
        })
      : "",
  });

  markVisitorSeen(id);

  return {
    ok: true as const,
    sessionId: id,
    language: visitor.language,
    telegram: startSend.telegram,
    messages: publicMessages(id, visitor.name),
    waitingForOperator: false,
    unreadFromOperator: 0,
    status: "open",
    rating: "",
    canSend: true,
    canRate: false,
    canRestart: false,
  };
}

export async function restartChat(input: {
  sessionId: string;
  page?: unknown;
  ip?: unknown;
  skipTelegram?: boolean;
}) {
  const session = getChatSession(input.sessionId);
  if (!session) {
    return { ok: false as const, error: "session" };
  }
  if (session.status !== "closed") {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Чат ещё открыт. Сначала дождитесь закрытия."
          : "Suhbat hali ochiq. Avval yakunlang.",
    };
  }

  const result = await startChat({
    name: session.name,
    phone: session.phone,
    email: session.email,
    language: session.language,
    page: input.page || session.page,
    ip: input.ip || session.visitorIp,
    skipTelegram: input.skipTelegram,
  });
  if (result.ok) return result;
  return {
    ok: false as const,
    error:
      Object.values(result.errors)[0] ||
      (session.language === "ru"
        ? "Не удалось начать новый чат."
        : "Yangi suhbat ochilmadi."),
  };
}

export async function addVisitorMessage(input: {
  sessionId: string;
  text?: unknown;
  page?: unknown;
  ip?: unknown;
  skipTelegram?: boolean;
  media?: {
    kind: ChatMediaKind;
    mediaKey: string;
    mime: string;
  };
}) {
  const session = getChatSession(input.sessionId);
  if (!session) {
    return { ok: false as const, error: "session" };
  }
  if (session.status === "closed") {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Чат закрыт. Новое сообщение отправить нельзя."
          : "Suhbat yopilgan. Yangi xabar yozib bo‘lmaydi.",
    };
  }

  const text = clean(input.text, 2000);
  if (!text && !input.media) {
    return {
      ok: false as const,
      error: session.language === "ru" ? "Введите сообщение." : "Xabar yozing.",
    };
  }

  const body = input.media
    ? text || mediaPlaceholder(input.media.kind, session.language)
    : text;

  const page = clean(input.page, 180) || session.page;
  const ip = clean(input.ip, 45);
  if (ip && ip !== session.visitorIp) {
    db.update(chatSessions)
      .set({ visitorIp: ip })
      .where(eq(chatSessions.id, session.id))
      .run();
    session.visitorIp = ip;
  }
  const liveTelegram =
    !input.skipTelegram && process.env.CHAT_LIVE_TELEGRAM === "1";
  const telegramBody = input.media
    ? `${mediaPlaceholder(input.media.kind, session.language)}${text ? `\n${text}` : ""}`
    : body;
  const sent = await recordAndSend({
    sessionId: session.id,
    role: "visitor",
    body,
    kind: input.media?.kind,
    mediaKey: input.media?.mediaKey,
    mime: input.media?.mime,
    skipTelegram: !liveTelegram,
    telegramText: liveTelegram
      ? formatVisitorTelegram({
          kind: "message",
          sessionId: session.id,
          name: session.name,
          phone: session.phone,
          email: session.email,
          language: session.language,
          page,
          ip: session.visitorIp,
          text: telegramBody,
        })
      : "",
  });

  const alreadyAcked = getChatMessages(session.id).some((row) =>
    isReceiptAck(row.body),
  );
  if (!alreadyAcked) {
    await recordAndSend({
      sessionId: session.id,
      role: "dmed",
      body: receiptAck(session.language),
      skipTelegram: true,
    });
  }
  markVisitorSeen(session.id);

  const messages = publicMessages(session.id, session.name);
  return {
    ok: true as const,
    sessionId: session.id,
    telegram: sent.telegram,
    messages,
    waitingForOperator: waitingForOperator(messages),
    unreadFromOperator: 0,
    status: "open",
    rating: publicRating(session.rating),
    canSend: true,
    canRate: false,
    canRestart: false,
  };
}

export async function addVisitorMedia(input: {
  sessionId: string;
  bytes: Buffer;
  mime: string;
  filename?: string;
  kind?: string;
  caption?: unknown;
  page?: unknown;
  ip?: unknown;
  skipTelegram?: boolean;
}) {
  const session = getChatSession(input.sessionId);
  if (!session) {
    return { ok: false as const, error: "session" };
  }
  if (session.status === "closed") {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Чат закрыт. Новое сообщение отправить нельзя."
          : "Suhbat yopilgan. Yangi xabar yozib bo‘lmaydi.",
    };
  }

  const mime = (
    input.mime || mimeFromFilename(input.filename || "")
  )
    .toLowerCase()
    .split(";")[0]
    .trim();
  let kind = kindFromMime(mime);
  if (
    input.kind === "voice" &&
    (!mime || mime.startsWith("audio/") || mime === "video/webm" || mime === "application/octet-stream")
  ) {
    kind = "voice";
  } else if (input.kind === "image" && kind === "image") {
    kind = "image";
  } else if (input.kind === "video" && kind === "video") {
    kind = "video";
  }
  if (!kind) {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Отправьте фото, видео или голосовое."
          : "Rasm, video yoki ovozli xabar yuboring.",
    };
  }
  if (input.bytes.length > maxBytesForKind(kind)) {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Файл слишком большой."
          : "Fayl juda katta.",
    };
  }
  if (input.bytes.length < 8) {
    return {
      ok: false as const,
      error:
        session.language === "ru" ? "Пустой файл." : "Fayl bo‘sh.",
    };
  }

  const storedMime =
    mime ||
    (kind === "voice" ? "audio/webm" : kind === "video" ? "video/webm" : "image/jpeg");

  const mediaKey = await saveChatMediaFile({
    sessionId: session.id,
    mime: storedMime,
    kind,
    bytes: input.bytes,
  });

  return addVisitorMessage({
    sessionId: session.id,
    text: input.caption,
    page: input.page,
    ip: input.ip,
    skipTelegram: input.skipTelegram,
    media: { kind, mediaKey, mime: storedMime },
  });
}

function sessionFlags(session: {
  status?: string | null;
  rating?: string | null;
}) {
  const closed = session.status === "closed";
  const rating = publicRating(session.rating);
  return {
    status: closed ? "closed" : "open",
    rating,
    canSend: !closed,
    canRate: closed && !rating,
    canRestart: closed,
  };
}

export function publicSession(sessionId: string, opts?: { seen?: boolean }) {
  const session = getChatSession(sessionId);
  if (!session) return null;
  if (opts?.seen) markVisitorSeen(sessionId);
  const fresh = opts?.seen ? getChatSession(sessionId) : session;
  const messages = publicMessages(sessionId, session.name);
  const flags = sessionFlags(fresh || session);
  return {
    id: session.id,
    language: session.language,
    messages,
    waitingForOperator: flags.canSend ? waitingForOperator(messages) : false,
    unreadFromOperator: unreadFromOperator(
      messages,
      fresh?.lastVisitorSeenAt || session.lastVisitorSeenAt || "",
    ),
    ...flags,
  };
}

export function rateChat(sessionId: string, rating: unknown) {
  const session = getChatSession(sessionId);
  if (!session) {
    return { ok: false as const, error: "session" };
  }
  if (session.status !== "closed") {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Сначала дождитесь закрытия чата."
          : "Avval suhbat yopilishi kerak.",
    };
  }
  if (session.rating) {
    return {
      ok: false as const,
      error:
        session.language === "ru" ? "Оценка уже отправлена." : "Baho allaqachon yuborilgan.",
    };
  }
  const stars = normalizeStarRating(rating);
  if (!stars) {
    return {
      ok: false as const,
      error:
        session.language === "ru"
          ? "Выберите оценку от 1 до 5."
          : "1 dan 5 gacha baho tanlang.",
    };
  }

  const now = new Date().toISOString();
  db.update(chatSessions)
    .set({ rating: String(stars), ratedAt: now })
    .where(eq(chatSessions.id, sessionId))
    .run();
  db.insert(chatMessages)
    .values({
      sessionId,
      role: "dmed",
      body: rateThanks(session.language),
      telegramOk: 1,
      telegramError: "",
      telegramPayload: "",
      telegramMid: 0,
      createdAt: now,
    })
    .run();
  markVisitorSeen(sessionId);
  return {
    ok: true as const,
    session: publicSession(sessionId),
  };
}

function telegramPayloadFor(row: {
  role: string;
  body: string;
  telegramPayload?: string | null;
  sessionId: string;
}) {
  if (row.telegramPayload) return row.telegramPayload;
  const session = getChatSession(row.sessionId);
  if (!session) return "";
  if (row.role === "visitor") {
    return formatVisitorTelegram({
      kind: "message",
      name: session.name,
      phone: session.phone,
      email: session.email,
      language: session.language,
      page: session.page,
      ip: session.visitorIp,
      text: row.body,
    });
  }
  if (row.role !== "dmed") return "";
  if (
    /yetmadi|saqlandi|yuborildi|CallMeBot|сохранено|отправлен|не дошло/i.test(
      row.body,
    )
  ) {
    return "";
  }
  return formatVisitorTelegram({
    kind: "start",
    name: session.name,
    phone: session.phone,
    email: session.email,
    language: session.language,
    page: session.page,
    ip: session.visitorIp,
  });
}

function markTelegramSent(id: number) {
  db.update(chatMessages)
    .set({ telegramOk: 1, telegramError: "" })
    .where(eq(chatMessages.id, id))
    .run();
}

function markSessionAcksDelivered(sessionId: string) {
  const rows = getChatMessages(sessionId);
  for (const row of rows) {
    if (row.role !== "dmed") continue;
    if (
      !/yetmadi|не дошло|CallMeBot/i.test(row.body) &&
      !/saqlandi|сохранено/i.test(row.body)
    ) {
      continue;
    }
    db.update(chatMessages)
      .set({
        body: /[а-яё]/i.test(row.body)
          ? "Сообщение отправлено в Telegram."
          : "Xabar Telegramga yuborildi.",
      })
      .where(eq(chatMessages.id, row.id))
      .run();
  }
}

export async function retryFailedTelegram(limit = 20) {
  const pending = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.telegramOk, 0))
    .orderBy(desc(chatMessages.id))
    .limit(80)
    .all()
    .filter((row) => telegramPayloadFor(row))
    .slice(0, limit);

  if (!pending.length) {
    return { ok: false as const, sent: 0, connected: false, reason: "none" };
  }

  const probeText = telegramPayloadFor(pending[0]);
  const first = await sendTelegramMessage(probeText);
  if (!first.ok) {
    return {
      ok: false as const,
      sent: 0,
      connected: false,
      reason: first.reason || "failed",
    };
  }

  markTelegramSent(pending[0].id);
  const rest = pending.slice(1).reverse();
  let sent = 1;
  const sessions = new Set<string>([pending[0].sessionId]);
  for (const row of rest) {
    const text = telegramPayloadFor(row);
    if (!text) continue;
    const result = await sendTelegramMessage(text);
    if (!result.ok) break;
    markTelegramSent(row.id);
    sessions.add(row.sessionId);
    sent += 1;
  }
  for (const sessionId of sessions) markSessionAcksDelivered(sessionId);

  return { ok: true as const, sent, connected: true };
}

export function addOperatorReply(sessionId: string, text: string) {
  const session = getChatSession(sessionId);
  if (!session) return false;
  if (session.status === "closed") return false;
  const body = clean(text, 2000);
  if (!body) return false;
  const last = getChatMessages(sessionId).at(-1);
  if (last?.role === "dmed" && last.body === body) return false;
  const now = new Date().toISOString();
  db.insert(chatMessages)
    .values({
      sessionId,
      role: "dmed",
      body,
      telegramOk: 1,
      telegramError: "",
      telegramPayload: "",
      telegramMid: 0,
      createdAt: now,
    })
    .run();
  db.update(chatSessions)
    .set({ lastOperatorAt: now })
    .where(eq(chatSessions.id, sessionId))
    .run();
  markAdminRead(sessionId);
  return true;
}

export function closeChatByOperator(sessionId: string) {
  const session = getChatSession(sessionId);
  if (!session) return { ok: false as const, error: "session" };
  if (session.status === "closed") {
    return { ok: false as const, error: "closed" };
  }

  const now = new Date().toISOString();
  const prompt = ratePrompt(session.language);
  const last = getChatMessages(sessionId).at(-1);
  if (!(last?.role === "dmed" && last.body === prompt)) {
    db.insert(chatMessages)
      .values({
        sessionId,
        role: "dmed",
        body: prompt,
        telegramOk: 1,
        telegramError: "",
        telegramPayload: "",
        telegramMid: 0,
        kind: "text",
        mediaKey: "",
        mime: "",
        createdAt: now,
      })
      .run();
  }
  db.update(chatSessions)
    .set({
      status: "closed",
      closedAt: now,
      lastOperatorAt: now,
    })
    .where(eq(chatSessions.id, sessionId))
    .run();
  markAdminRead(sessionId);
  return {
    ok: true as const,
    session: adminSession(sessionId, { markRead: false }),
  };
}

type InboxSqlRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  language: string;
  page: string;
  visitor_ip: string;
  created_at: string;
  status: string | null;
  rating: string | null;
  closed_at: string | null;
  last_body: string | null;
  last_role: string | null;
  last_at: string | null;
  last_visitor_body: string | null;
  last_visitor_at: string | null;
  count: number;
  unread_count: number;
};

export type InboxFolder = "all" | "new" | "replied";

export function inboxFolder(value?: string | null): InboxFolder {
  return value === "new" || value === "replied" ? value : "all";
}

export function listChatInbox(opts?: {
  limit?: number;
  q?: string;
  includeId?: string;
  folder?: string | null;
}) {
  const limit = Math.min(Math.max(opts?.limit ?? 150, 1), 400);
  const q = (opts?.q || "").trim();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const includeId = opts?.includeId || "";
  const folder = inboxFolder(opts?.folder);

  const rows = sqlite
    .prepare(
      `
      SELECT
        s.id,
        s.name,
        s.phone,
        s.email,
        s.language,
        s.page,
        s.visitor_ip,
        s.created_at,
        s.status,
        s.rating,
        s.closed_at,
        last.body AS last_body,
        last.role AS last_role,
        COALESCE(last.created_at, s.created_at) AS last_at,
        vis.body AS last_visitor_body,
        vis.created_at AS last_visitor_at,
        (SELECT COUNT(*) FROM chat_messages c WHERE c.session_id = s.id) AS count,
        (
          SELECT COUNT(*) FROM chat_messages c
          WHERE c.session_id = s.id
            AND c.role = 'visitor'
            AND c.created_at > COALESCE(NULLIF(s.last_operator_at, ''), '')
        ) AS unread_count
      FROM chat_sessions s
      LEFT JOIN chat_messages last ON last.id = (
        SELECT m.id FROM chat_messages m
        WHERE m.session_id = s.id
        ORDER BY m.id DESC
        LIMIT 1
      )
      LEFT JOIN chat_messages vis ON vis.id = (
        SELECT m.id FROM chat_messages m
        WHERE m.session_id = s.id AND m.role = 'visitor'
        ORDER BY m.id DESC
        LIMIT 1
      )
      WHERE (
        s.id = ?
        OR ? = ''
        OR s.name LIKE ? COLLATE NOCASE
        OR s.phone LIKE ?
        OR s.email LIKE ? COLLATE NOCASE
        OR IFNULL(s.visitor_ip, '') LIKE ?
        OR IFNULL(vis.body, '') LIKE ? COLLATE NOCASE
        OR IFNULL(last.body, '') LIKE ? COLLATE NOCASE
      )
      AND (
        s.id = ?
        OR ? = 'all'
        OR (
          ? = 'new'
          AND EXISTS (
            SELECT 1 FROM chat_messages c
            WHERE c.session_id = s.id
              AND c.role = 'visitor'
              AND c.created_at > COALESCE(NULLIF(s.last_operator_at, ''), '')
          )
        )
        OR (
          ? = 'replied'
          AND IFNULL(s.last_operator_at, '') != ''
          AND NOT EXISTS (
            SELECT 1 FROM chat_messages c
            WHERE c.session_id = s.id
              AND c.role = 'visitor'
              AND c.created_at > COALESCE(NULLIF(s.last_operator_at, ''), '')
          )
        )
      )
      ORDER BY (s.id = ?) DESC, (unread_count > 0) DESC, last_at DESC
      LIMIT ?
      `,
    )
    .all(
      includeId,
      q,
      like,
      like,
      like,
      like,
      like,
      like,
      includeId,
      folder,
      folder,
      folder,
      includeId,
      limit,
    ) as InboxSqlRow[];

  return rows.map((row) => {
    const unreadCount = Number(row.unread_count) || 0;
    const preview = row.last_visitor_body || row.last_body || "";
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      language: row.language,
      page: row.page,
      ip: row.visitor_ip || "",
      createdAt: row.created_at,
      status: row.status === "closed" ? "closed" : "open",
      rating: publicRating(row.rating),
      closedAt: row.closed_at || "",
      lastBody: preview,
      lastRole: row.last_role || "",
      lastAt: row.last_at || row.created_at,
      lastVisitorAt: row.last_visitor_at || "",
      count: Number(row.count) || 0,
      unread: unreadCount > 0,
      unreadCount,
      waiting: unreadCount > 0,
    };
  });
}

export function chatInboxSummary() {
  const total = (
    sqlite.prepare(`SELECT COUNT(*) AS n FROM chat_sessions`).get() as {
      n: number;
    }
  ).n;
  const unread = (
    sqlite
      .prepare(
        `
        SELECT COUNT(*) AS n FROM chat_sessions s
        WHERE EXISTS (
          SELECT 1 FROM chat_messages m
          WHERE m.session_id = s.id
            AND m.role = 'visitor'
            AND m.created_at > COALESCE(NULLIF(s.last_operator_at, ''), '')
        )
        `,
      )
      .get() as { n: number }
  ).n;
  const replied = (
    sqlite
      .prepare(
        `
        SELECT COUNT(*) AS n FROM chat_sessions s
        WHERE IFNULL(s.last_operator_at, '') != ''
          AND NOT EXISTS (
            SELECT 1 FROM chat_messages m
            WHERE m.session_id = s.id
              AND m.role = 'visitor'
              AND m.created_at > COALESCE(NULLIF(s.last_operator_at, ''), '')
          )
        `,
      )
      .get() as { n: number }
  ).n;
  const latest = listChatInbox({ limit: 1 })[0] || null;
  const stats = chatDashboard();
  return {
    total,
    unread,
    waiting: unread,
    replied,
    folders: { all: total, new: unread, replied },
    latest,
    stats,
  };
}

export function chatDashboard(opts?: { from?: string; to?: string }) {
  const range = parseChatDateRange(opts?.from, opts?.to);
  const row = sqlite
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN status = 'open' OR IFNULL(status, '') = '' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN (${STAR_SQL}) IS NOT NULL THEN 1 ELSE 0 END) AS rated,
        AVG(${STAR_SQL}) AS avg,
        SUM(CASE WHEN (${STAR_SQL}) = 1 THEN 1 ELSE 0 END) AS star1,
        SUM(CASE WHEN (${STAR_SQL}) = 2 THEN 1 ELSE 0 END) AS star2,
        SUM(CASE WHEN (${STAR_SQL}) = 3 THEN 1 ELSE 0 END) AS star3,
        SUM(CASE WHEN (${STAR_SQL}) = 4 THEN 1 ELSE 0 END) AS star4,
        SUM(CASE WHEN (${STAR_SQL}) = 5 THEN 1 ELSE 0 END) AS star5
      FROM chat_sessions
      WHERE (? = 0 OR created_at >= ?)
        AND (? = 0 OR created_at <= ?)
      `,
    )
    .get(
      range.fromIso ? 1 : 0,
      range.fromIso || "",
      range.toIso ? 1 : 0,
      range.toIso || "",
    ) as {
    total: number;
    closed: number | null;
    open: number | null;
    rated: number | null;
    avg: number | null;
    star1: number | null;
    star2: number | null;
    star3: number | null;
    star4: number | null;
    star5: number | null;
  };

  const stars: ChatStarCounts = {
    1: Number(row.star1) || 0,
    2: Number(row.star2) || 0,
    3: Number(row.star3) || 0,
    4: Number(row.star4) || 0,
    5: Number(row.star5) || 0,
  };

  return {
    from: range.from,
    to: range.to,
    total: Number(row.total) || 0,
    closed: Number(row.closed) || 0,
    open: Number(row.open) || 0,
    rated: Number(row.rated) || 0,
    avg: roundStarAvg(row.avg),
    stars,
    daily: chatDailyAnalytics({ from: range.from, to: range.to }),
  };
}

export type ChatDayStat = {
  day: string;
  total: number;
  closed: number;
  rated: number;
  avg: number | null;
};

function enumerateDays(fromDay: string, toDay: string) {
  const out: string[] = [];
  const start = Date.parse(`${fromDay}T00:00:00.000Z`);
  const end = Date.parse(`${toDay}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return out;
  for (let t = start, n = 0; t <= end && n < 400; t += 86_400_000, n += 1) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function chatDailyAnalytics(opts?: { from?: string; to?: string }): ChatDayStat[] {
  const range = parseChatDateRange(opts?.from, opts?.to);
  let fromDay = range.from;
  let toDay = range.to;
  if (!fromDay || !toDay) {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 86_400_000);
    fromDay = from.toISOString().slice(0, 10);
    toDay = to.toISOString().slice(0, 10);
  }

  const rows = sqlite
    .prepare(
      `
      SELECT
        substr(created_at, 1, 10) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN (${STAR_SQL}) IS NOT NULL THEN 1 ELSE 0 END) AS rated,
        AVG(${STAR_SQL}) AS avg
      FROM chat_sessions
      WHERE created_at >= ?
        AND created_at <= ?
      GROUP BY substr(created_at, 1, 10)
      ORDER BY day
      `,
    )
    .all(`${fromDay}T00:00:00.000Z`, `${toDay}T23:59:59.999Z`) as {
    day: string;
    total: number;
    closed: number | null;
    rated: number | null;
    avg: number | null;
  }[];

  const byDay = new Map(rows.map((row) => [row.day, row]));
  return enumerateDays(fromDay, toDay).map((day) => {
    const row = byDay.get(day);
    return {
      day,
      total: Number(row?.total) || 0,
      closed: Number(row?.closed) || 0,
      rated: Number(row?.rated) || 0,
      avg: roundStarAvg(row?.avg),
    };
  });
}

export function adminSession(sessionId: string, opts?: { markRead?: boolean }) {
  const session = getChatSession(sessionId);
  if (!session) return null;
  if (opts?.markRead !== false) markAdminRead(sessionId);
  return {
    id: session.id,
    name: session.name,
    phone: session.phone,
    email: session.email,
    language: session.language,
    page: session.page,
    ip: session.visitorIp || "",
    createdAt: session.createdAt,
    status: session.status === "closed" ? "closed" : "open",
    rating: publicRating(session.rating),
    closedAt: session.closedAt || "",
    lastOperatorAt: session.lastOperatorAt || "",
    messages: getChatMessages(session.id).map((row) => serializeMessage(row)),
  };
}
