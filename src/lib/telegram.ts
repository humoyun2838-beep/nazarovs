import { getSetting } from "@/lib/settings";

export const CALLMEBOT_START_URL = "https://t.me/CallMeBot_txtbot";
export const CALLMEBOT_LOGIN_URL = "https://api2.callmebot.com/txt/login.php";

function env(name: string) {
  return (process.env[name] || "").trim();
}

function telegramUsername() {
  return (env("TELEGRAM_USERNAME") || "nazarov_07_09").replace(/^@/, "");
}

const DEFAULT_API = "https://api.telegram.org";
const DEFAULT_CALLMEBOT = "https://api.callmebot.com";

export function telegramApiBase() {
  return (env("TELEGRAM_API_BASE") || DEFAULT_API).replace(/\/$/, "");
}

export function getBotToken() {
  return env("TELEGRAM_BOT_TOKEN") || getSetting("telegram_bot_token");
}

export function getOwnerChatId() {
  return env("TELEGRAM_CHAT_ID") || getSetting("telegram_chat_id");
}

export function telegramTarget() {
  const chatId = getOwnerChatId();
  if (chatId) return chatId;
  const user = telegramUsername();
  return user ? `@${user}` : "";
}

export function publicSiteUrl() {
  const host = (env("PUBLIC_HOST") || "nazarov.tunn3l.sh").replace(/\/$/, "");
  if (host.startsWith("http")) return host;
  return `https://${host}`;
}

export function sessionTag(sessionId: string) {
  return `#dmed:${sessionId}`;
}

export function parseSessionTag(text: string) {
  const match = text.match(/#dmed:([0-9a-f-]{8,})/i);
  return match?.[1] || "";
}

export function formatVisitorTelegram(input: {
  kind: "start" | "message";
  sessionId?: string;
  name: string;
  phone: string;
  email?: string;
  language: string;
  page?: string;
  ip?: string;
  text?: string;
}) {
  const lang = input.language === "ru" ? "Русский" : "O‘zbekcha";
  const lines = [];
  if (input.sessionId) lines.push(sessionTag(input.sessionId));
  lines.push(
    input.kind === "start"
      ? "Dmed chat — yangi suhbat"
      : "Dmed chat — yangi xabar",
    "",
    `Ism: ${input.name}`,
    `Telefon: ${input.phone}`,
  );
  if (input.email) lines.push(`Email: ${input.email}`);
  lines.push(`Til: ${lang}`);
  if (input.ip) lines.push(`IP: ${input.ip}`);
  if (input.page) lines.push(`Sahifa: ${input.page}`);
  if (input.kind === "message" && input.text) {
    lines.push("", "Xabar:", input.text);
  }
  lines.push(
    "",
    "Javob: shu xabarga Reply qiling — saytdagi mijozga tushadi.",
    `${publicSiteUrl()}/admin/chat${input.sessionId ? `?s=${input.sessionId}` : ""}`,
  );
  return lines.join("\n").slice(0, 4000);
}

export type TelegramSendResult = {
  ok: boolean;
  reason?: string;
  messageId?: number;
};

async function sendViaBotApi(text: string): Promise<TelegramSendResult> {
  const token = getBotToken();
  const chatId = telegramTarget();
  if (!token) return { ok: false, reason: "not_configured" };
  if (!chatId) return { ok: false, reason: "no_chat" };

  const url = `${telegramApiBase()}/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    } | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        reason: data?.description || `http_${res.status}`,
      };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "network",
    };
  }
}

async function sendViaCallMeBot(text: string): Promise<TelegramSendResult> {
  const user = telegramUsername();
  if (!user) return { ok: false, reason: "no_user" };
  const apiBase = (env("CALLMEBOT_API_BASE") || DEFAULT_CALLMEBOT).replace(
    /\/$/,
    "",
  );
  const url = `${apiBase}/text.php?user=${encodeURIComponent(`@${user}`)}&text=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await res.text();
    if (/permission denied|you need to authorize|not authorized/i.test(body)) {
      return { ok: false, reason: "callmebot_denied" };
    }
    if (!res.ok || /<b>Error:/i.test(body)) {
      return { ok: false, reason: `callmebot_${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "callmebot_network",
    };
  }
}

export async function sendTelegramMessage(
  text: string,
): Promise<TelegramSendResult> {
  const bot = await sendViaBotApi(text);
  if (bot.ok) return bot;
  const callme = await sendViaCallMeBot(text);
  if (callme.ok) return callme;
  if (bot.reason === "not_configured") return callme;
  return {
    ok: false,
    reason: callme.reason || bot.reason,
  };
}
