import { createElement } from "react";
import { getIcon, getIconTone } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function TopicIcon({
  name,
  size = "md",
  image = "",
}: {
  name: string;
  size?: "md" | "lg";
  image?: string;
}) {
  const large = size === "lg";

  if (image) {
    return (
      <span
        aria-hidden
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-[0_12px_28px_-14px_rgba(15,40,80,0.5)] ring-1 ring-[#d5e4f6]",
          large ? "size-16 rounded-[22px]" : "size-14 rounded-[18px]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          width={large ? 64 : 56}
          height={large ? 64 : 56}
          decoding="async"
          loading={large ? "eager" : "lazy"}
          fetchPriority={large ? "high" : "low"}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const tone = getIconTone(name);

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        large ? "size-14 rounded-2xl" : "size-12 rounded-[14px]",
      )}
      style={{
        backgroundColor: tone.bg,
        color: tone.fg,
        boxShadow: `0 8px 18px -8px ${tone.glow}, inset 0 0 0 2px ${tone.ring}`,
      }}
    >
      {createElement(getIcon(name), {
        className: large ? "size-7" : "size-6",
        strokeWidth: 2.45,
        absoluteStrokeWidth: true,
      })}
    </span>
  );
}
