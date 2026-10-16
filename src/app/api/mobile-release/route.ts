import { NextResponse } from "next/server";
import { getMobileRelease } from "@/lib/mobile-release";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(getMobileRelease(), { headers: { "Cache-Control": "no-store" } });
}
