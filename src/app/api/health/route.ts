import { NextResponse, type NextRequest } from "next/server";
import { visitorIp } from "@/lib/http";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    originalHost: request.headers.get("x-original-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    forwardedFor: request.headers.get("x-forwarded-for") ? "set" : null,
    visitorIp: visitorIp(request) || null,
  });
}
