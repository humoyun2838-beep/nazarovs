import { NextResponse } from "next/server";
import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export function GET() {
  // Only an opaque revision is public: no user, chat or catalog content.
  return NextResponse.json({ version: getAppVersion() }, {
    headers: { "Cache-Control": "no-store" },
  });
}
