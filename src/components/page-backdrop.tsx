"use client";

import { usePathname } from "next/navigation";

export function PageBackdrop() {
  const pathname = usePathname() || "";
  const kind = pathname.startsWith("/admin") ? "admin" : "client";
  if (pathname.startsWith("/operator")) return null;
  return (
    <div aria-hidden className={`page-backdrop page-backdrop-${kind}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={kind === "client" ? "/art/dmed-client-color-v4.webp" : "/art/dmed-admin-color-v5.webp"} alt="" decoding="async"
        fetchPriority="high" draggable={false} className="page-backdrop-wash" />
      <div className="page-backdrop-veil" />
    </div>
  );
}
