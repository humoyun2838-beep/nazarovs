import { completeWithCatalog } from "@/lib/ai";
import { parseLocale } from "@/lib/locale";
import {
  addOperatorReply,
  getChatMessages,
  getChatSession,
  isAutoAck,
  isReceiptAck,
  listWaitingSessionIds,
} from "@/lib/chat";
import { getSetting, setSetting } from "@/lib/settings";

const AI_AUTO_KEY = "ai_chat_auto";

export function isAiChatAuto() {
  return getSetting(AI_AUTO_KEY) === "1";
}

export function setAiChatAuto(enabled: boolean) {
  setSetting(AI_AUTO_KEY, enabled ? "1" : "0");
  return isAiChatAuto();
}

function alreadyAnswered(
  messages: ReturnType<typeof getChatMessages>,
  lastVisitorId: number,
) {
  return messages.some(
    (row) =>
      row.role === "dmed" &&
      row.id > lastVisitorId &&
      row.body &&
      !isAutoAck(row.body) &&
      !isReceiptAck(row.body),
  );
}

export async function replyToVisitorWithAi(
  sessionId: string,
  send = true,
  force = false,
) {
  const session = getChatSession(sessionId);
  if (!session || session.status === "closed") {
    return { ok: false as const, error: "session" };
  }
  const messages = getChatMessages(sessionId);
  const visitorTurns = messages.filter(
    (row) => row.role === "visitor" && row.body && !isAutoAck(row.body),
  );
  const lastVisitor = visitorTurns.at(-1);
  if (!lastVisitor?.body) {
    return { ok: false as const, error: "empty" };
  }
  if (send && !force && alreadyAnswered(messages, lastVisitor.id)) {
    const last = [...messages]
      .reverse()
      .find(
        (row) =>
          row.role === "dmed" &&
          row.body &&
          !isAutoAck(row.body) &&
          !isReceiptAck(row.body),
      );
    if (last?.body) return { ok: true as const, text: last.body };
    return { ok: false as const, error: "replied" };
  }

  const history = messages
    .filter((row) => row.body && !isReceiptAck(row.body) && !isAutoAck(row.body))
    .slice(-10)
    .map((row) => ({
      role: row.role === "visitor" ? ("user" as const) : ("assistant" as const),
      text: row.body,
    }));

  const page = session.page || "";
  const lessonSlug = page.match(/\/m\/([^/?#]+)/)?.[1] || "";
  const generated = await completeWithCatalog({
    kind: "staff",
    query: lastVisitor.body,
    history,
    locale: parseLocale(session.language),
    lessonSlug,
  });
  if (!generated.ok) return generated;
  if (send && !addOperatorReply(sessionId, generated.text)) {
    return { ok: false as const, error: "reply" };
  }
  return { ok: true as const, text: generated.text };
}

export async function draftStaffReply(sessionId: string) {
  return replyToVisitorWithAi(sessionId, false);
}

const aiInflight = new Set<string>();

export function queueAutoAiReply(sessionId: string) {
  if (!isAiChatAuto() || aiInflight.has(sessionId)) return;
  aiInflight.add(sessionId);
  void replyToVisitorWithAi(sessionId, true)
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      aiInflight.delete(sessionId);
    });
}

export async function maybeAutoAiReply(sessionId: string) {
  if (!isAiChatAuto()) return;
  try {
    await replyToVisitorWithAi(sessionId, true);
  } catch (error) {
    console.error(error);
  }
}

export async function drainWaitingChats(limit = 8) {
  if (!isAiChatAuto()) return { replied: 0 };
  const ids = listWaitingSessionIds(limit);
  let replied = 0;
  for (const id of ids) {
    if (!isAiChatAuto()) break;
    const result = await replyToVisitorWithAi(id, true);
    if (result.ok) replied += 1;
  }
  return { replied };
}
