export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="space-y-4">
        <div className="catalog-hero h-36 animate-pulse rounded-3xl" />
        <div className="h-11 animate-pulse rounded-xl bg-white/80" />
        <div className="catalog-panel divide-y divide-[#d7e4fb]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="size-12 animate-pulse rounded-2xl bg-[#e8f1fb]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#e8f1fb]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-[#eef5ff]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
