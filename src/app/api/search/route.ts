import { NextResponse, type NextRequest } from "next/server";
import { searchLessons } from "@/lib/search-lessons";
import { getLocale } from '@/lib/locale-server';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ ok: true, hits: searchLessons(q,8,await getLocale()) });
}
