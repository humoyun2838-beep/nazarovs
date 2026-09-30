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
          "relative shrink-0 overflow-hidden rounded-[14px] bg-white shadow-[0_8px_18px_-10px_rgba(15,40,80,0.45)] ring-1 ring-black/5",
          large ? "size-16 rounded-2xl" : "size-12",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          width={large ? 64 : 48}
          height={large ? 64 : 48}
          decoding="async"
          loading="lazy"
          className="h-full w-full object-contain p-0.5"
        />
      </span>
    );
  }

  const Icon = getIcon(name);
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
      <Icon
        className={large ? "size-7" : "size-6"}
        strokeWidth={2.45}
        absoluteStrokeWidth
      />
    </span>
  );
}
