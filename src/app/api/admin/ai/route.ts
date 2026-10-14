import { NextResponse } from "next/server";
import { adminStatus, requireAdmin, requireChatOperator } from "@/lib/admin";
import { adminAiFailure } from "@/lib/admin-ai-errors";
import {
  PanelRateLimiter,
  sanitizePanelMessages,
} from "@/lib/admin-ai-flow";
import { getSession } from "@/lib/auth";
import {
  aiKeyStatus,
  completeAdminAssistant,
  setGeminiKey,
  setOpenAiKey,
  verifyGeminiKey,
  verifyOpenAiKey,
} from "@/lib/ai";
import { draftStaffReply, replyToVisitorWithAi } from "@/lib/ai-reply";
import { adminSession } from "@/lib/chat";
import { getLocale } from "@/lib/locale-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });
  return NextResponse.json({ ok: true, ...aiKeyStatus() });
}

const panelLimiter = new PanelRateLimiter();

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "panel";
  const staffAction = action === "chat-reply" || action === "chat-draft";
  const denied = staffAction
    ? await requireChatOperator()
    : await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });

  if (action === "save-key") {
    const raw = typeof body.openaiKey === "string" ? body.openaiKey.trim() : "";
    if (raw.includes("…")) {
      return NextResponse.json({ ok: true, ...aiKeyStatus() });
    }
    if (!raw) {
      return NextResponse.json({ ok: true, ...setOpenAiKey("") });
    }
    if (!raw.startsWith("sk-")) {
      return NextResponse.json(
        {
          ok: false,
          error: "key",
          message: "OpenAI kaliti sk- bilan boshlanishi kerak.",
        },
        { status: 400 },
      );
    }
    const checked = await verifyOpenAiKey(raw);
    if (!checked.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "key",
          message: checked.error || "ChatGPT kaliti noto‘g‘ri.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      ...setOpenAiKey(raw),
      billing: Boolean(checked.billing),
      message: checked.billing ? checked.error : undefined,
    });
  }

  if (action === "save-gemini") {
    const raw = typeof body.geminiKey === "string" ? body.geminiKey.trim() : "";
    if (raw.includes("…")) {
      return NextResponse.json({ ok: true, ...aiKeyStatus() });
    }
    if (!raw) {
      return NextResponse.json({ ok: true, ...setGeminiKey("") });
    }
    if (raw.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "key",
          message: "Gemini kaliti juda qisqa. Google AI Studio’dan API key oling.",
        },
        { status: 400 },
      );
    }
    const checked = await verifyGeminiKey(raw);
    if (!checked.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "key",
          message: checked.error || "Gemini kaliti noto‘g‘ri.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, ...setGeminiKey(raw) });
  }

  if (action === "chat-draft" || action === "chat-reply") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const result =
      action === "chat-draft"
        ? await draftStaffReply(sessionId)
        : await replyToVisitorWithAi(sessionId, true, body.force === true);
    if (!result.ok) {
      const status = result.error === "session" ? 404 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json({
      ok: true,
      text: result.text,
      session:
        action === "chat-reply"
          ? adminSession(sessionId, { markRead: true })
          : undefined,
    });
  }

  const locale = await getLocale();
  const history = sanitizePanelMessages(body.messages);
  const lastUser = [...history].reverse().find((turn) => turn.role === "user");
  const query =
    (typeof body.text === "string" ? body.text.trim() : "") || lastUser?.text || "";
  if (!query) {
    const failure = adminAiFailure("blank", locale);
    return NextResponse.json(failure, { status: failure.status });
  }
  if (query.length > 4000) {
    const failure = adminAiFailure("too-long", locale);
    return NextResponse.json(failure, { status: failure.status });
  }
  const session = await getSession();
  const adminId = session?.sub || "admin";
  if (!panelLimiter.allow(adminId)) {
    const failure = adminAiFailure("rate", locale);
    return NextResponse.json(failure, { status: failure.status });
  }

  const result = await completeAdminAssistant({
    query,
    history,
    locale,
    signal: request.signal,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    text: result.text,
    source: result.source,
    model: result.model,
  });
}
