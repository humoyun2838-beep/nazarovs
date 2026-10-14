import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listLearn, saveLearn } from "@/lib/learn";

export const dynamic = "force-dynamic";

async function userId() {
  const session = await getSession();
  if (!session || (session.role !== "client" && session.role !== "admin")) return 0;
  return Number(session.sub) || 0;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ ok: true, rows: [] });
  return NextResponse.json({ ok: true, rows: listLearn(id) });
}

export async function POST(request: NextRequest) {
  const id = await userId();
  if (!id) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    seen?: boolean;
    done?: boolean;
    saved?: boolean;
  } | null;
  if (!body?.slug) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json(
    saveLearn(id, body.slug, {
      seen: body.seen,
      done: body.done,
      saved: body.saved,
    }),
  );
}
