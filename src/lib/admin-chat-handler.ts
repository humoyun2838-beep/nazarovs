import { NextResponse, type NextRequest } from "next/server";
import { adminStatus, requireAdmin, requireChatOperator } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import {
  addOperatorReply,
  adminSession,
  chatDashboard,
  chatInboxSummary,
  closeChatByOperator,
  expireIdleChats,
  listChatInbox,
  listInquiryCategories,
} from "@/lib/chat";
import { drainWaitingChats, isAiChatAuto, setAiChatAuto } from "@/lib/ai-reply";
import { hasAiKey } from "@/lib/ai";
import {
  deleteChatTemplate,
  publicChatTemplates,
  saveChatTemplate,
} from "@/lib/chat-template-store";


export async function GET(request: NextRequest) {
  const denied = await requireChatOperator();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });
  expireIdleChats();
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const q = request.nextUrl.searchParams.get("q") || "";
  const includeId = request.nextUrl.searchParams.get("s") || "";
  const from = request.nextUrl.searchParams.get("from") || "";
  const to = request.nextUrl.searchParams.get("to") || "";
  const folder = request.nextUrl.searchParams.get("f") || "all";
  const sessions = listChatInbox({ q, includeId, folder, limit: 150 });
  const summary = chatInboxSummary();
  return NextResponse.json({
    ok: true,
    sessions,
    unread: summary.unread,
    waiting: summary.waiting,
    total: summary.total,
    folders: summary.folders,
    templates: publicChatTemplates(),
    categories: listInquiryCategories(), // Materiallar katalogidagi jonli bo‘limlar.
    stats: isAdmin ? chatDashboard({ from, to }) : undefined,
    aiAuto: isAiChatAuto(),
    aiReady: hasAiKey(),
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireChatOperator();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "reply";

  if (action === "ai-auto") {
    const enabled = body.enabled === true || body.enabled === "1";
    const aiAuto = setAiChatAuto(enabled);
    if (aiAuto) {
      void drainWaitingChats(3).catch((error) => console.error(error));
    }
    return NextResponse.json({
      ok: true,
      aiAuto,
      aiReady: hasAiKey(),
    });
  }

  if (action === "expire") {
    const adminDenied = await requireAdmin();
    if (adminDenied) {
      return NextResponse.json(adminDenied, { status: adminStatus(adminDenied) });
    }
    const idleMs =
      typeof body.idleMs === "number" && Number.isFinite(body.idleMs)
        ? Math.max(0, body.idleMs)
        : 24 * 60 * 60 * 1000;
    const closed = expireIdleChats(
      idleMs,
      typeof body.sessionId === "string" ? body.sessionId : "",
    );
    return NextResponse.json({
      ok: true,
      closed,
      stats: chatDashboard({
        from: typeof body.from === "string" ? body.from : "",
        to: typeof body.to === "string" ? body.to : "",
      }),
    });
  }

  if (action === "thread") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const session = adminSession(sessionId, { markRead: false });
    if (!session) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session });
  }

  if (action === "template-save") {
    const adminDenied = await requireAdmin();
    if (adminDenied) {
      return NextResponse.json(adminDenied, { status: adminStatus(adminDenied) });
    }
    const result = saveChatTemplate({
      id: body.id,
      lang: body.lang,
      label: body.label,
      body: body.body,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "template-delete") {
    const adminDenied = await requireAdmin();
    if (adminDenied) {
      return NextResponse.json(adminDenied, { status: adminStatus(adminDenied) });
    }
    const result = deleteChatTemplate(body.id);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "close") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const actor = await getSession();
    const result = closeChatByOperator(sessionId, { categoryId: Number(body.categoryId), actorId: Number(actor?.sub) || 0 });
    if (!result.ok) {
      const status = result.error === "session" ? 404 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json({
      ok: true,
      session: result.session,
      stats: chatDashboard(),
    });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (action !== "reply") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  const text = typeof body.text === "string" ? body.text : "";
  if (!addOperatorReply(sessionId, text)) {
    const session = adminSession(sessionId, { markRead: false });
    return NextResponse.json(
      {
        ok: false,
        error: session?.status === "closed" ? "closed" : "reply",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    session: adminSession(sessionId, { markRead: true }),
  });
}
