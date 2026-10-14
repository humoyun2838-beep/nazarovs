import { type NextRequest } from "next/server";
import { OPERATOR_COOKIE } from "@/lib/operator-cookie";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { redirectTo } from "@/lib/http";
import { endClientVisit } from "@/lib/client-visits";
import { routes } from "@/lib/site";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const scope = form?.get("scope") === "operator" ? "operator" : "";
  const account = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value || "");
  const operator = await verifySessionToken(request.cookies.get(OPERATOR_COOKIE)?.value || "");
  const role = account?.role || "";
  if (account?.vid) endClientVisit(account.vid);

  const clearingOperator = scope === "operator" || (!role && operator?.role === "operator");
  const dest = clearingOperator
    ? routes.operator
    : role === "admin"
      ? routes.adminLogin
      : role === "client"
        ? routes.catalog
        : role === "operator"
          ? routes.operator
          : routes.catalog;
  const res = redirectTo(request, dest, 303);
  res.headers.set("Cache-Control", "no-store");
  const blank = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: 0,
  };
  if (clearingOperator) {
    res.cookies.set(OPERATOR_COOKIE, "", blank);
    if (role === "operator") res.cookies.set(COOKIE_NAME, "", blank);
  } else {
    res.cookies.set(COOKIE_NAME, "", blank);
    if (role === "operator") res.cookies.set(OPERATOR_COOKIE, "", blank);
  }
  res.cookies.set("dmed_chat", "", blank);
  return res;
}
