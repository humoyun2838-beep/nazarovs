import { NextResponse } from "next/server";
import { adminStatus, reorderCategories } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];
  const result = await reorderCategories(ids);
  return NextResponse.json(result, { status: adminStatus(result) });
}
