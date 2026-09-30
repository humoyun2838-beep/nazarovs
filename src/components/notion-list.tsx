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
    <li>
      <Link
        href={item.href}
        prefetch={false}
        className={cn(
          "group flex items-center gap-3.5 py-3.5 transition-colors hover:bg-[#f3f8ff] sm:py-4",
          depth === 0 ? "px-3.5 sm:px-4" : "pr-3.5 sm:pr-4",
        )}
        style={depth > 0 ? { paddingLeft: `${14 + depth * 18}px` } : undefined}
      >
        <TopicIcon name={item.icon} image={item.image} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-tight text-[#071a38]">
            {item.title}
          </span>
          {item.description ? (
            <span className="mt-0.5 block truncate text-sm font-medium text-[#3d5a84]">
              {item.description}
            </span>
          ) : null}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eef5ff] text-[#1a6fd4] transition group-hover:translate-x-0.5 group-hover:bg-[#1a6fd4] group-hover:text-white">
          <ChevronRight className="size-4" />
        </span>
      </Link>
      {item.children && item.children.length > 0 ? (
        <ul className="border-t border-[#d7e4fb]/80">
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
    <ul className="catalog-list catalog-panel divide-y divide-[#d7e4fb]/90 rounded-2xl">
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
        "rounded-2xl border border-[#cfe0fb] bg-white/90 px-4 py-3.5 text-sm font-medium leading-relaxed text-[#12315f] shadow-[0_10px_24px_-20px_rgba(11,42,85,0.55)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
