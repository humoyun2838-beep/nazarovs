
import { UiText } from "@/components/ui-locale";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TopicIcon } from "@/components/topic-icon";
import { cn } from "@/lib/utils";

export type NotionListItem = {
  href: string;
  title: string;
  description?: string;
  icon: string;
  image?: string;
  cover?: string;
  order?: number;
  children?: NotionListItem[];
};

function ListRow({
  item,
  depth,
}: {
  item: NotionListItem;
  depth: number;
}) {
  return (
    <li className={item.cover ? "catalog-panel rounded-3xl" : undefined}>
      <Link
        href={item.href}
        prefetch
        className={cn(
          "group relative isolate flex items-center gap-3.5 overflow-hidden py-3.5 transition-colors duration-200 hover:bg-[#f3f8ff] sm:py-4",
          item.cover && "min-h-36 border-l-4 border-l-transparent hover:border-l-cyan-400",
          depth === 0 ? "px-3.5 sm:px-4" : "pr-3.5 sm:pr-4",
        )}
        style={depth > 0 ? { paddingLeft: `${14 + depth * 18}px` } : undefined}
      >
        {item.cover ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-20 size-full object-cover object-[right_25%] transition-transform duration-500 group-hover:scale-[1.03]" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/90 to-white/5" />
        </> : null}
        <TopicIcon name={item.icon} image={item.image} />
        <span className={cn("min-w-0 flex-1", item.cover && "pr-16 sm:pr-32")}>
          {item.order ? <span className="mb-1 block text-[10px] font-bold tracking-[0.18em] text-[#45618d]"><UiText>{String(item.order).padStart(2, "0")}</UiText></span> : null}
          <span className={cn("block font-semibold tracking-tight text-[#071428]", item.cover ? "line-clamp-3 text-[15px] sm:text-base" : "truncate text-base")}>
            <UiText>{item.title}</UiText>
          </span>
          {item.description ? (
            <span className="mt-0.5 block truncate text-[15px] leading-6 font-medium text-[#163056]">
              <UiText>{item.description}</UiText>
            </span>
          ) : null}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f1ff] text-[#0a4cae] ring-1 ring-[#c5daf6] transition group-hover:translate-x-0.5 group-hover:bg-[#0a5ad4] group-hover:text-white group-hover:ring-[#0a5ad4]">
          <ChevronRight className="size-4" />
        </span>
      </Link>
      {item.children && item.children.length > 0 ? (
        <ul className="border-t border-[#e3eefb] bg-[#f7fbff]">
          {item.children.map((child) => (
            <ListRow key={child.href + child.title} item={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function NotionLinkList({ items }: { items: NotionListItem[] }) {
  return (
    <ul className={items.some(item => item.cover) ? "catalog-list space-y-3" : "catalog-list catalog-panel divide-y divide-white/45 rounded-[1.6rem]"}>
      {items.map((item) => (
        <ListRow key={item.href + item.title} item={item} depth={0} />
      ))}
    </ul>
  );
}

export function Callout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border border-[#d5e4f6] bg-white px-4 py-3.5 text-base leading-relaxed font-medium text-[#10243f] shadow-[0_16px_40px_-28px_rgba(11,42,85,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
