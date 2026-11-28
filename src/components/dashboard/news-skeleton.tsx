export function NewsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">뉴스를 불러오는 중입니다.</span>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col rounded-xl border border-border bg-surface p-5 motion-reduce:animate-none"
          >
            <div className="h-5 w-40 rounded bg-border" />
            <div className="mt-3 h-6 w-full rounded bg-border" />
            <div className="mt-2 h-6 w-3/5 rounded bg-border" />
            <div className="mt-4 h-14 w-full rounded bg-border" />
            <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
              <div className="h-6 w-20 rounded-full bg-border" />
              <div className="h-9 w-28 rounded-lg bg-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
