import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, adminStatus } from "@/lib/admin";
import { chatDashboard } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });
  const from = request.nextUrl.searchParams.get("from") || "";
  const to = request.nextUrl.searchParams.get("to") || "";
  const validDay = (day: string) => !day || (/^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day);
  if (!validDay(from) || !validDay(to) || Boolean(from) !== Boolean(to) || (from && to && from > to)) {
    return NextResponse.json({ ok: false, error: "Sana oralig‘ini to‘g‘ri tanlang." }, { status: 400 });
  }
  if (from && to && Date.parse(to) - Date.parse(from) > 399 * 86_400_000) {
    return NextResponse.json({ ok: false, error: "Bir martada ko‘pi bilan 400 kunlik davrni tanlang." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, stats: chatDashboard({ from, to }), updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
}
