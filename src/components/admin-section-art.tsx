import Image from "next/image";
import type { ReactNode } from "react";
export type AdminArtKind = "learning" | "clients" | "operators" | "chat" | "analytics" | "assistant" | "updates" | "visits";
/** Decorative artwork has no embedded copy; headings remain selectable and translated. */
export function AdminSectionArt({ kind, compact = false, priority = false }: { kind: AdminArtKind; compact?: boolean; priority?: boolean }) {
  return <div data-admin-art={kind} aria-hidden="true" className={`relative shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-[0_8px_24px_-16px_rgba(50,70,130,0.4)] ${compact ? "h-20 w-28 sm:h-24 sm:w-36" : "h-36 w-full sm:h-36 sm:w-56"}`}>
    <Image src={`/admin-art/${kind}-v1.webp`} alt="" width={640} height={360} unoptimized loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} className="h-full w-full object-cover" />
  </div>;
}
export function AdminIllustratedHeading({ kind, children, compact = false, priority = false }: { kind: AdminArtKind; children: ReactNode; compact?: boolean; priority?: boolean }) {
  return <div className={`relative z-10 flex w-full min-w-0 gap-4 ${compact ? "items-center justify-between" : "flex-col-reverse sm:flex-row sm:items-center sm:justify-between"}`}>
    <div className="min-w-0 flex-1 space-y-2">{children}</div>
    <AdminSectionArt kind={kind} compact={compact} priority={priority} />
  </div>;
}
