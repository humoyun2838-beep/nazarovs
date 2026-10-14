import { NextResponse, type NextRequest } from "next/server";
import { OPERATOR_COOKIE } from "@/lib/operator-cookie";
import { COOKIE_NAME, inspectSessionToken } from "@/lib/session";
import {
  isPublicClientRequest,
  nextWithClientIp,
  rewriteTo,
  sendTo,
  stayOnHost,
} from "@/lib/http";
import { publicSlugExists } from "@/lib/slug-exists";
import { operatorAccess } from "@/lib/operators";
import { isAdminAreaPath } from "@/lib/admin-area";
import { routes } from "@/lib/site";

const cookieClear = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

async function readSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value || "";
  const inspected = await inspectSessionToken(token);
  return inspected.session;
}

async function readOperator(request: NextRequest) {
  const dedicated = request.cookies.get(OPERATOR_COOKIE)?.value || "";
  if (dedicated) {
    const inspected = await inspectSessionToken(dedicated);
    return {
      session: inspected.session?.role === "operator" ? inspected.session : null,
      expired: inspected.expired,
      source: "operator" as const,
    };
  }
  const legacy = await readSession(request);
  if (legacy?.role === "operator") {
    return { session: legacy, expired: false, source: "legacy" as const };
  }
  return { session: null, expired: false, source: "none" as const };
}

function clearNamed(response: NextResponse, name: string) {
  response.cookies.set(name, "", cookieClear);
  return response;
}

function operatorMayEnter(pathname: string) {
  if (pathname === routes.operator || pathname === `${routes.operator}/`) return true;
  if (pathname === routes.operatorLogin || pathname === `${routes.operatorLogin}/`) {
    return true;
  }
  if (pathname.startsWith("/api/operator/")) return true;
  if (pathname === "/api/logout" || pathname === "/api/locale") return true;
  if (pathname.startsWith("/api/chat/media")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep browser navigation on the matching local site; APIs stay same-origin.
  if (process.env.SEPARATE_SITES === "1" && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && !pathname.includes(".")) {
    const entryPort = pathname.startsWith("/admin") ? "3852"
      : pathname.startsWith("/operator") || pathname === "/chat" || pathname.startsWith("/chat/") ? "3853"
      : pathname === "/nazarov" || pathname.startsWith("/b/") || pathname.startsWith("/m/") ? "3850" : "";
    const currentHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    if (entryPort && /^(127\.0\.0\.1|localhost):\d+$/.test(currentHost) && !currentHost.endsWith(`:${entryPort}`)) {
      return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, `http://127.0.0.1:${entryPort}`));
    }
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes(".")
  ) {
    return nextWithClientIp(request);
  }

  const materialMatch = pathname.match(/^\/m\/([^/]+)\/?$/);
  if (materialMatch && !publicSlugExists("material", decodeURIComponent(materialMatch[1]))) {
    return rewriteTo(request, "/__not-found");
  }
  const categoryMatch = pathname.match(/^\/b\/([^/]+)\/?$/);
  if (categoryMatch && !publicSlugExists("category", decodeURIComponent(categoryMatch[1]))) {
    return rewriteTo(request, "/__not-found");
  }

  if (pathname === "/login" || pathname === "/login/") {
    return stayOnHost(request, routes.catalog);
  }

  if (pathname === "/kirish" || pathname === "/kirish/") {
    return stayOnHost(request, routes.catalog);
  }

  if (pathname === "/materials" || pathname === "/materials/") {
    return stayOnHost(request, routes.catalog);
  }

  const isOperatorLogin =
    pathname === routes.operatorLogin || pathname === `${routes.operatorLogin}/`;
  const isLegacyChatLogin =
    pathname === "/chat/kirish" || pathname === "/chat/kirish/";
  const isLegacyChat =
    pathname === "/chat" ||
    pathname === "/chat/" ||
    (pathname.startsWith("/chat/") && !isLegacyChatLogin);

  if (isLegacyChatLogin || isOperatorLogin) {
    const search = request.nextUrl.search || "";
    return sendTo(request, `${routes.operator}${search}`);
  }
  if (isLegacyChat) {
    return sendTo(request, routes.operator);
  }

  const sessionEarly = await readSession(request);
  const operatorEarly = await readOperator(request);
  const onOperatorPage =
    pathname === routes.operator || pathname === `${routes.operator}/`;
  const onOperatorSurface = isOperatorLogin || onOperatorPage || operatorMayEnter(pathname);

  if (operatorEarly.expired && onOperatorSurface) {
    return clearNamed(
      sendTo(request, `${routes.operator}?error=expired`),
      OPERATOR_COOKIE,
    );
  }

  if (operatorEarly.session) {
    const access = operatorAccess(Number(operatorEarly.session.sub));
    if (access !== "active") {
      if (onOperatorSurface) {
        const res = clearNamed(
          sendTo(request, `${routes.operator}?error=${access === "blocked" ? "blocked" : "expired"}`),
          OPERATOR_COOKIE,
        );
        if (operatorEarly.source === "legacy") clearNamed(res, COOKIE_NAME);
        return res;
      }
    } else if (onOperatorPage || operatorMayEnter(pathname)) {
      return nextWithClientIp(request);
    } else if (operatorEarly.source === "legacy" && sessionEarly?.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return sendTo(request, routes.operator);
    }
  }

  if (pathname === "/" && isPublicClientRequest(request)) {
    return sendTo(request, routes.catalog);
  }

  if (pathname === "/admin/login") {
    if (sessionEarly?.role === "admin") {
      return sendTo(request, "/admin");
    }
    return nextWithClientIp(request);
  }

  const isAdminArea = isAdminAreaPath(pathname);

  if (!isAdminArea) {
    return nextWithClientIp(request);
  }

  if (sessionEarly?.role === "admin") {
    return nextWithClientIp(request);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return sendTo(
    request,
    `/admin/login?next=${encodeURIComponent(pathname)}`,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|nazarov-|stickers/|favicon|robots.txt|sitemap.xml).*)",
  ],
};
