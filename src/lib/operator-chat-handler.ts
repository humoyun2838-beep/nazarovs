import { NextResponse, type NextRequest } from "next/server";
import { sqlite } from "@/db";
import { replyToVisitorWithAi } from "@/lib/ai-reply";
import { addOperatorReply, adminSession, claimChat, closeChatByOperator, listInquiryCategories, listChatInbox, transferChat } from "@/lib/chat";
import { requireOperator } from "@/lib/operator-guard";
import { publicChatTemplates, saveChatTemplate, deleteChatTemplate } from "@/lib/chat-template-store";
import { listOperators } from "@/lib/operators";


function deniedResponse(result: { status: number; error: string }) {
  return NextResponse.json(
    { ok: false, error: result.error },
    { status: result.status },
  );
}

function assignedOperatorId(sessionId: string) {
  const row = sqlite
    .prepare("SELECT assigned_user_id AS id FROM chat_sessions WHERE id = ?")
    .get(sessionId) as { id: number | null } | undefined;
  return Number(row?.id) || 0;
}

function publicThread(sessionId: string) {
  const session = adminSession(sessionId, { markRead: true });
  if (!session) return null;
  return {
    id: session.id,
    name: session.name,
    phone: session.phone,
    language: session.language,
    status: session.status,
    inquiryCategoryTitle: session.inquiryCategoryTitle,
    assignedUserId: assignedOperatorId(sessionId),
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      body: message.body,
      createdAt: message.createdAt,
      kind: message.kind,
      mediaUrl: message.mediaUrl,
    })),
  };
}

export async function GET(request: NextRequest) {
  const gate = await requireOperator();
  if (!gate.ok) return deniedResponse(gate);

  const q = request.nextUrl.searchParams.get("q") || "";
  const sessions = listChatInbox({ q, folder: "all", limit: 150 }).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    status: row.status,
    lastBody: row.lastBody,
    lastAt: row.lastAt,
    unread: row.unread,
    unreadCount: row.unreadCount,
    assignedUserId: row.assignedUserId,
    lastVisitorAt: row.lastVisitorAt,
  }));
  const operators = listOperators()
    .filter((row) => row.status === "active")
    .map((row) => ({ id: row.id, fullName: row.fullName }));
  const unread = sessions.reduce((sum, row) => sum + (row.unread ? 1 : 0), 0);
  return NextResponse.json({ ok: true, sessions, unread, operators, templates: publicChatTemplates(), categories: listInquiryCategories(), me: Number(gate.session.sub) || 0 });
}

export async function POST(request: NextRequest) {
  const gate = await requireOperator();
  if (!gate.ok) return deniedResponse(gate);

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  if (body.action === "template-save" || body.action === "template-delete") {
    const result = body.action === "template-save" ? saveChatTemplate(body) : deleteChatTemplate(body.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const action = typeof body.action === "string" ? body.action : "reply";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (action === "close") {
    const result = closeChatByOperator(sessionId, { categoryId: Number(body.categoryId), actorId: Number(gate.session.sub), enforceAssignment: true });
    if (!result.ok) return NextResponse.json(result, { status: result.error === "session" ? 404 : result.error === "taken" || result.error === "closed" ? 409 : 400 });
    return NextResponse.json({ ok: true, session: publicThread(sessionId) });
  }

  if (action === "thread") {
    const session = publicThread(sessionId);
    if (!session) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session });
  }

  if (action === "claim" || action === "transfer") {
    const me = Number(gate.session.sub) || 0;
    const result =
      action === "claim"
        ? claimChat(sessionId, me)
        : transferChat(sessionId, me, Number(body.toUserId) || 0);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "missing" ? 404 : 409 });
    }
    return NextResponse.json({ ok: true, session: publicThread(sessionId) });
  }

  if (action === "ai") {
    const ownership = claimChat(sessionId, Number(gate.session.sub));
    if (!ownership.ok) return NextResponse.json(ownership, { status: ownership.error === "missing" ? 404 : 409 });
    const result = await replyToVisitorWithAi(sessionId, true, false);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "ai", message: "message" in result ? result.message : "AI javob tayyorlay olmadi. Qayta urinib ko‘ring." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, session: publicThread(sessionId) });
  }

  if (action !== "reply") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ ok: false, error: "reply" }, { status: 400 });
  const ownership = claimChat(sessionId, Number(gate.session.sub));
  if (!ownership.ok) return NextResponse.json(ownership, { status: ownership.error === "missing" ? 404 : 409 });
  if (!addOperatorReply(sessionId, text)) {
    const existing = adminSession(sessionId, { markRead: false });
    return NextResponse.json(
      { ok: false, error: existing?.status === "closed" ? "closed" : "reply" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, session: publicThread(sessionId) });
}
