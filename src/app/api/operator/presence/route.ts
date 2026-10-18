import { requireOperator } from "@/lib/operator-guard";
import { operatorHeartbeat } from "@/lib/operator-analytics";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const gate = await requireOperator();
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });
  const origin = request.headers.get("origin");
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== request.headers.get("host")) {
    return Response.json({ error: "Origin mos emas." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  operatorHeartbeat(Number(gate.session.sub), body?.active !== false);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
