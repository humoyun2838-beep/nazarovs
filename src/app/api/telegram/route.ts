import { NextResponse, type NextRequest } from "next/server";
import { pullTelegramReplies, startTelegramInbox } from "@/lib/telegram-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  startTelegramInbox();
  await request.json().catch(() => null);
  const result = await pullTelegramReplies();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  startTelegramInbox();
  const result = await pullTelegramReplies();
  return NextResponse.json({ ok: true, ...result });
}
