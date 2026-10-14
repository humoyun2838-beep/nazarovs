export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="space-y-4">
        <div className="catalog-hero h-36 animate-pulse rounded-[1.85rem]" />
        <div className="catalog-search animate-pulse" />
        <div className="catalog-panel divide-y divide-white/40 rounded-[1.6rem]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="size-12 animate-pulse rounded-2xl bg-white/50" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/55" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
