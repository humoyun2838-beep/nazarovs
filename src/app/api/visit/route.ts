import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { getClientAccess } from "@/lib/client-access";
import { touchClientVisit } from "@/lib/client-visits";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (session?.role === "client") {
    const access = getClientAccess(Number(session.sub), session.username);
    if (access.expired) {
      await clearSessionCookie();
      return NextResponse.json({ ok: false, expired: true });
    }
  }
  if (!session?.vid || session.role !== "client") {
    return NextResponse.json({ ok: true, skip: true });
  }
  const body = (await request.json().catch(() => null)) as { page?: string } | null;
  const page =
    typeof body?.page === "string"
      ? body.page
      : request.nextUrl.searchParams.get("page") || "";
  try {
    touchClientVisit(session.vid, page);
  } catch {
    // sqlite busy — next ping retries
  }
  return NextResponse.json({ ok: true });
}
