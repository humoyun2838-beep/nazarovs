import { NextResponse, type NextRequest } from "next/server";
import { visitorIp } from "@/lib/http";
import { LOCAL_PORT, SERVICE_NAME } from "@/lib/site";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    service: SERVICE_NAME,
    port: Number(process.env.PORT || LOCAL_PORT),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    originalHost: request.headers.get("x-original-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    forwardedFor: request.headers.get("x-forwarded-for") ? "set" : null,
    visitorIp: visitorIp(request) || null,
  });
}
