import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminChatNav } from "@/components/admin-chat-nav";
import { cn } from "@/lib/utils";

/** Header keeps the portrait; the page backdrop uses the DMED mark. */
const PORTRAIT = "/nazarov-portrait.webp?v=hq1";
const PORTRAIT_SM = "/nazarov-portrait-sm.webp?v=hq1";

export function BrandLogo({
  size = "sm",
  showText = true,
}: {
  size?: "sm" | "lg";
  showText?: boolean;
}) {
  const px = size === "lg" ? 96 : 44;

  return (
    <Link href="/nazarov" className="group inline-flex items-center gap-3">
      <span
        className="relative overflow-hidden rounded-xl bg-[#0a1220] ring-1 ring-white/50 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)]"
        style={{ width: px, height: px }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={size === "lg" ? PORTRAIT : PORTRAIT_SM}
          srcSet={`${PORTRAIT_SM} 320w, ${PORTRAIT} 640w`}
          sizes={`${px}px`}
          alt="Nazarov"
          width={px}
          height={px}
          decoding="async"
          className={
            size === "lg"
              ? "h-full w-full origin-[24%_70%] scale-[1.65] object-cover"
              : "h-full w-full origin-[24%_70%] scale-[2.05] object-cover"
          }
        />
      </span>
      {showText ? (
        <span className="flex flex-col leading-none">
          <span
            className={
              size === "lg"
                ? "font-heading text-3xl font-semibold tracking-tight text-[#071a38]"
                : "font-heading text-xl font-semibold tracking-tight text-[#071a38]"
            }
          >
            Nazarov
          </span>
          <span className="mt-1 text-[11px] font-medium tracking-wide text-[#1a3a66] transition group-hover:text-[#071a38]">
            Humoyun Mirzo
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function SiteHeader({
  username,
  role,
  showAdminLink = false,
  wide = false,
}: {
  username?: string;
  role?: "client" | "admin";
  showAdminLink?: boolean;
  wide?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#d7e4fb]/80 bg-white/80 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex min-h-14 w-full flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6",
          wide ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        <BrandLogo />

        <div className="flex items-center gap-2">
          {role === "admin" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/nazarov">Materiallar</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">Boshqaruv</Link>
              </Button>
              <AdminChatNav />
              {username ? (
                <span className="hidden text-xs text-[#7a7166] lg:inline">
                  {username} · admin
                </span>
              ) : null}
              <form action="/api/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Chiqish
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
