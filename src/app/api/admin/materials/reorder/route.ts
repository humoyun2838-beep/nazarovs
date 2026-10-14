import { NextResponse } from "next/server";
import { adminStatus, reorderMaterials } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    categoryId?: unknown;
    ids?: unknown;
  } | null;
  const categoryId = Number(body?.categoryId);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];
  const result = await reorderMaterials(categoryId, ids);
  return NextResponse.json(result, { status: adminStatus(result) });
}
