import { NextResponse } from "next/server";
import { registerClient } from "@/lib/clients";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const result = registerClient({
    name: body?.name,
    phone: body?.phone,
    telegram: body?.telegram ?? body?.workplace,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
