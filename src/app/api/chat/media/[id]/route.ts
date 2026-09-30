import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getChatMessage, readChatSessionId, CHAT_COOKIE } from "@/lib/chat";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { safeContentType, safeMediaAbsPath } from "@/lib/chat-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const messageId = Number(id);
  const row = getChatMessage(messageId);
  if (!row?.mediaKey) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }

  const visitorSid = await readChatSessionId(
    request.cookies.get(CHAT_COOKIE)?.value,
  );
  const admin = await verifySessionToken(
    request.cookies.get(COOKIE_NAME)?.value || "",
  );
  const allowed =
    visitorSid === row.sessionId || admin?.role === "admin";
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  }

  const abs = safeMediaAbsPath(row.mediaKey);
  if (!abs) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }

  try {
    const bytes = await readFile(abs);
    return new NextResponse(Uint8Array.from(bytes), {
      headers: {
        "content-type": safeContentType(row.mime || "application/octet-stream"),
        "cache-control": "private, max-age=3600",
        "content-disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }
}
