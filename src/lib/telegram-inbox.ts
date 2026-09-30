import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { addOperatorReply, getChatSession } from "@/lib/chat";
import { getSetting, setSetting } from "@/lib/settings";
import {
  getBotToken,
  getOwnerChatId,
  parseSessionTag,
  telegramApiBase,
} from "@/lib/telegram";

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  chat?: { id?: number };
  from?: { is_bot?: boolean; id?: number };
  reply_to_message?: { message_id?: number; text?: string; caption?: string };
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

let pulling = false;

function textOf(message?: TelegramMessage) {
  return (message?.text || message?.caption || "").trim();
}

function sessionFromTelegram(message: TelegramMessage) {
  const replyId = message.reply_to_message?.message_id || 0;
  if (replyId) {
    const row = db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.telegramMid, replyId))
      .limit(1)
      .all()[0];
    if (row) return row.sessionId;
  }
  const tagged =
    parseSessionTag(textOf(message.reply_to_message)) ||
    parseSessionTag(textOf(message));
  if (tagged && getChatSession(tagged)) return tagged;
  const latest = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.role, "visitor"))
    .orderBy(desc(chatMessages.id))
    .limit(1)
    .all()[0];
  return latest?.sessionId || "";
}

export async function pullTelegramReplies() {
  const token = getBotToken();
  if (!token || pulling) return { pulled: 0 };
  pulling = true;
  try {
    const offset = Number(getSetting("telegram_update_offset") || "0");
    const url = `${telegramApiBase()}/bot${token}/getUpdates?offset=${offset}&timeout=0&limit=50`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      result?: TelegramUpdate[];
    } | null;
    if (!data?.ok || !Array.isArray(data.result)) {
      return { pulled: 0 };
    }

    let pulled = 0;
    let nextOffset = offset;
    const owner = getOwnerChatId();

    for (const update of data.result) {
      nextOffset = Math.max(nextOffset, update.update_id + 1);
      const message = update.message;
      if (!message || message.from?.is_bot) continue;
      const text = textOf(message);
      if (!text) continue;

      const chatId = String(message.chat?.id || "");
      if (chatId && !owner) setSetting("telegram_chat_id", chatId);
      if (owner && chatId) {
        const ownerIsNumeric = /^-?\d+$/.test(owner);
        if (ownerIsNumeric && owner !== chatId) continue;
      }

      if (/^\/start\b/i.test(text)) {
        if (chatId) setSetting("telegram_chat_id", chatId);
        continue;
      }

      const sessionId = sessionFromTelegram(message);
      if (!sessionId) continue;
      if (parseSessionTag(text) && !message.reply_to_message) continue;

      addOperatorReply(sessionId, text);
      pulled += 1;
    }

    if (nextOffset !== offset) {
      setSetting("telegram_update_offset", String(nextOffset));
    }
    return { pulled };
  } catch {
    return { pulled: 0 };
  } finally {
    pulling = false;
  }
}

export function startTelegramInbox() {
  const g = globalThis as { nazarovTgTimer?: ReturnType<typeof setInterval> };
  if (g.nazarovTgTimer) return;
  g.nazarovTgTimer = setInterval(() => {
    void pullTelegramReplies();
  }, 2500);
  void pullTelegramReplies();
}
