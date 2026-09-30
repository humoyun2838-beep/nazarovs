import { type NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/session";
import { redirectTo } from "@/lib/http";

export async function POST(request: NextRequest) {
  const res = redirectTo(request, "/nazarov", 303);
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return res;
}
