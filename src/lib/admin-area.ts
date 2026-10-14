export function isAdminRole(role: unknown) {
  return role === "admin";
}

export function isAdminAreaPath(pathname: string) {
  return (
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login") ||
    (pathname.startsWith("/api/") &&
      pathname !== "/api/login" &&
      pathname !== "/api/logout" &&
      pathname !== "/api/register" &&
      pathname !== "/api/health" &&
      pathname !== "/api/visit" &&
      pathname !== "/api/locale" &&
      pathname !== "/api/session-expired" &&
      !pathname.startsWith("/api/media") &&
      !pathname.startsWith("/api/chat") &&
      !pathname.startsWith("/api/telegram") &&
      pathname !== "/api/search" &&
      pathname !== "/api/learn")
  );
}
