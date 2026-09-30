import { NextResponse, type NextRequest } from "next/server";
import {
  CHAT_COOKIE,
  CHAT_IDLE_MS,
  addVisitorMedia,
  addVisitorMessage,
  chatCookieOptions,
  expireIdleChats,
  publicSession,
  rateChat,
  readChatSessionId,
  restartChat,
  retryFailedTelegram,
  signChatToken,
  startChat,
} from "@/lib/chat";
import { mimeFromFilename } from "@/lib/chat-media";
import { visitorIp } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocalTest(request: NextRequest) {
  if (request.headers.get("x-nazarov-chat-test") !== "1") return false;
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  return host === "127.0.0.1" || host === "localhost";
}

function skipLiveTelegram(request: NextRequest) {
  if (isLocalTest(request)) return true;
  return process.env.CHAT_LIVE_TELEGRAM !== "1";
}

function idleMsFor(request: NextRequest) {
  if (!isLocalTest(request)) return CHAT_IDLE_MS;
  const raw =
    request.nextUrl.searchParams.get("idleMs") ??
    request.nextUrl.searchParams.get("expire");
  if (raw == null || raw === "") return CHAT_IDLE_MS;
  if (raw === "1") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : CHAT_IDLE_MS;
}

export async function GET(request: NextRequest) {
  const sid = await readChatSessionId(request.cookies.get(CHAT_COOKIE)?.value);
  const idleMs = idleMsFor(request);
  if (idleMs === 0) {
    if (sid) expireIdleChats(0, sid);
  } else {
    expireIdleChats(idleMs);
  }
  if (!sid) return NextResponse.json({ ok: true, session: null });
  const seen = request.nextUrl.searchParams.get("seen") === "1";
  const session = publicSession(sid, { seen });
  return NextResponse.json({ ok: true, session });
}

async function sessionIdFrom(request: NextRequest, fallback = "") {
  return (
    (await readChatSessionId(request.cookies.get(CHAT_COOKIE)?.value)) ||
    fallback
  );
}

async function postMedia(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "form" }, { status: 400 });
  }
  const action = typeof form.get("action") === "string" ? String(form.get("action")) : "media";
  if (action !== "media") {
    return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  }
  const sid = await sessionIdFrom(
    request,
    typeof form.get("sessionId") === "string" ? String(form.get("sessionId")) : "",
  );
  if (!sid) {
    return NextResponse.json({ ok: false, error: "session" }, { status: 401 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "file" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const rawType = (file.type || "").toLowerCase().split(";")[0].trim();
  const mime =
    !rawType || rawType === "application/octet-stream"
      ? mimeFromFilename(file.name) || rawType
      : rawType;
  const requestedKind =
    form.get("kind") === "voice" || form.get("kind") === "image" || form.get("kind") === "video"
      ? String(form.get("kind"))
      : "";
  const result = await addVisitorMedia({
    sessionId: sid,
    bytes,
    mime,
    filename: file.name,
    kind: requestedKind || undefined,
    caption: form.get("caption") ?? form.get("text"),
    page: form.get("page"),
    ip: visitorIp(request),
    skipTelegram: skipLiveTelegram(request),
  });
  if (!result.ok) {
    const status = result.error === "session" ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    return postMedia(request);
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const skipTelegram = skipLiveTelegram(request);

  if (action === "start") {
    const result = await startChat({
      name: body.name,
      phone: body.phone,
      email: body.email,
      language: body.language,
      page: body.page,
      ip: visitorIp(request),
      skipTelegram,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    const res = NextResponse.json(result);
    res.cookies.set(
      CHAT_COOKIE,
      await signChatToken(result.sessionId),
      chatCookieOptions(),
    );
    return res;
  }

  if (action === "restart") {
    const sid = await sessionIdFrom(
      request,
      typeof body.sessionId === "string" ? body.sessionId : "",
    );
    if (!sid) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 401 });
    }
    const result = await restartChat({
      sessionId: sid,
      page: body.page,
      ip: visitorIp(request),
      skipTelegram,
    });
    if (!result.ok) {
      const status = result.error === "session" ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    const res = NextResponse.json(result);
    res.cookies.set(
      CHAT_COOKIE,
      await signChatToken(result.sessionId),
      chatCookieOptions(),
    );
    return res;
  }

  if (action === "message") {
    const sid = await sessionIdFrom(
      request,
      typeof body.sessionId === "string" ? body.sessionId : "",
    );
    if (!sid) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 401 });
    }
    const result = await addVisitorMessage({
      sessionId: sid,
      text: body.text,
      page: body.page,
      ip: visitorIp(request),
      skipTelegram,
    });
    if (!result.ok) {
      const status = result.error === "session" ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (action === "rate") {
    const sid = await sessionIdFrom(
      request,
      typeof body.sessionId === "string" ? body.sessionId : "",
    );
    if (!sid) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 401 });
    }
    const result = rateChat(sid, body.rating);
    if (!result.ok) {
      const status = result.error === "session" ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (action === "retry") {
    const result = await retryFailedTelegram();
    const sid = await readChatSessionId(request.cookies.get(CHAT_COOKIE)?.value);
    const session = sid ? publicSession(sid) : null;
    return NextResponse.json({ ...result, session });
  }

  return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
}
