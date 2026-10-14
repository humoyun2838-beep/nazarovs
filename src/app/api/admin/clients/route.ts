import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  createClientDirect,
  deleteIssuedLogin,
  issueClientLogin,
  listClientRequests,
  pendingClientCount,
  rejectClientRequest,
  resetClientPassword,
  setClientExpiry,
} from "@/lib/clients";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    pending: pendingClientCount(),
    requests: listClientRequests(),
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const action = typeof body?.action === "string" ? body.action : "";
  if (action === "reject") {
    const result = rejectClientRequest(body?.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (action === "delete") {
    const result = deleteIssuedLogin(body?.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (action === "create") {
    const result = createClientDirect({
      name: body?.name,
      phone: body?.phone,
      telegram: body?.telegram,
      username: body?.username,
      password: body?.password,
      expiresAt: body?.expiresAt,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (action === "issue") {
    const result = issueClientLogin({
      requestId: body?.id,
      username: body?.username,
      password: body?.password,
      expiresAt: body?.expiresAt,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (action === "reset-password") {
    const result = resetClientPassword(body?.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (action === "expiry") {
    const result = setClientExpiry(body?.id, body?.expiresAt);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
}
