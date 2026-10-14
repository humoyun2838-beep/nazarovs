import { NextResponse } from "next/server";
import { adminStatus, requireAdmin } from "@/lib/admin";
import { createOperator, listOperators, setOperatorStatus } from "@/lib/operators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });
  return NextResponse.json({ ok: true, operators: listOperators() });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return NextResponse.json(denied, { status: adminStatus(denied) });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "block" || action === "activate") {
    const id = Number(body.id);
    const result = setOperatorStatus(id, action === "block" ? "blocked" : "active");
    if (!result.ok) return NextResponse.json(result, { status: 404 });
    return NextResponse.json({ ok: true, operators: listOperators() });
  }

  const result = createOperator({
    fullName: body.fullName,
    username: body.username,
    password: body.password,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, operator: result.operator, operators: listOperators() });
}
