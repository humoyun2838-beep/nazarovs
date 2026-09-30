import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import {
  isPublicClientRequest,
  nextWithClientIp,
  rewriteTo,
  sendTo,
  stayOnHost,
} from "@/lib/http";
import { publicSlugExists } from "@/lib/slug-exists";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Keep /nazarov in the address bar — the page itself renders the catalog.
  if (pathname === "/nazarov" || pathname === "/nazarov/") {
    return nextWithClientIp(request);
  }

  // One client URL: /materials always becomes /nazarov on the same host.
  if (pathname === "/materials" || pathname === "/materials/") {
    return stayOnHost(request, "/nazarov");
  }

  // Public URLs open the client catalog, not the local admin chooser.
  // Rewrite (do not redirect) so the hostname never jumps.
  if (pathname === "/" && isPublicClientRequest(request)) {
    return sendTo(request, "/nazarov");
  }

  if (pathname === "/login") {
    return rewriteTo(request, "/nazarov");
  }

  if (pathname === "/admin/login") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (session?.role === "admin") {
      return sendTo(request, "/admin");
    }
    return nextWithClientIp(request);
  }

  const isAdminArea =
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login") ||
    (pathname.startsWith("/api/") &&
      pathname !== "/api/login" &&
      pathname !== "/api/logout" &&
      pathname !== "/api/health" &&
      !pathname.startsWith("/api/media") &&
      !pathname.startsWith("/api/chat") &&
      !pathname.startsWith("/api/telegram"));

  if (!isAdminArea) {
    return nextWithClientIp(request);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || session.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return sendTo(
      request,
      `/admin/login?next=${encodeURIComponent(pathname)}`,
    );
  }

  return nextWithClientIp(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|nazarov-|favicon|robots.txt|sitemap.xml).*)",
  ],
};
