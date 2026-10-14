
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { useId } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  tone = "light",
  className,
  title,
}: {
  tone?: "light" | "dark";
  className?: string;
  title?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const a = `dmedA${raw}`;
  const b = `dmedB${raw}`;
  const base = tone === "dark" ? "#9CC4FF" : "#0B47C9";
  const stops =
    tone === "dark"
      ? [
          ["#7EB6FF", "#8AE7FF", "#F4FEFF"],
          ["#9CC4FF", "#5EEBFF", "#E9FCFF"],
        ]
      : [
          ["#0E5CDB", "#2B9BFF", "#5AF6FF"],
          ["#1258D4", "#1EC8FF", "#7AFAFF"],
        ];

  return (
    <svg
      viewBox="0 0 80 80"
      className={cn("brand-mark shrink-0", tone === "dark" && "brand-mark-dark", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={a} x1="10" y1="70" x2="70" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor={stops[0][0]} />
          <stop offset="0.42" stopColor={stops[0][1]} />
          <stop offset="1" stopColor={stops[0][2]} />
        </linearGradient>
        <linearGradient id={b} x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor={stops[1][0]} />
          <stop offset="0.5" stopColor={stops[1][1]} />
          <stop offset="1" stopColor={stops[1][2]} />
        </linearGradient>
      </defs>
      <g className="brand-mark-base" fill={base}>
        <rect x="33" y="4" width="14" height="72" />
        <rect x="4" y="33" width="72" height="14" />
      </g>
      <path className="brand-mark-accent" d="M16 64C24 46 34 42 40 40C46 38 56 34 64 16" fill="none" stroke={`url(#${a})`} strokeWidth="15" strokeLinecap="butt" />
      <path className="brand-mark-accent" d="M16 16C24 34 34 38 40 40C46 42 56 46 64 64" fill="none" stroke={`url(#${b})`} strokeWidth="15" strokeLinecap="butt" />
    </svg>
  );
}

export function BrandLogo({
  size = "sm",
  showText = true,
  href = "/nazarov",
  tone = "light",
}: {
  size?: "sm" | "lg";
  showText?: boolean;
  href?: string;
  tone?: "light" | "dark";
}) {
  const icon = size === "lg" ? "size-16" : "size-9 sm:size-10";

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b4fa8]"
    >
      <BrandMark tone={tone} title={showText ? undefined : BRAND_NAME} className={icon} />
      {showText ? (
        <span
          className={cn(
            "brand-title font-sans leading-none font-extrabold tracking-[0.14em]",
            size === "lg" ? "text-[1.75rem]" : "text-[1.05rem] sm:text-lg",
            tone === "dark" ? "text-[#f4fbff]" : "text-[#06245c]",
          )}
        >
          <UiText>{BRAND_NAME}</UiText>
        </span>
      ) : null}
    </Link>
  );
}
