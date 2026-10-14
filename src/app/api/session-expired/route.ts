import { type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return redirectTo(request, "/nazarov", 303);
}

export async function POST(request: NextRequest) {
  await clearSessionCookie();
  return redirectTo(request, "/nazarov", 303);
}
