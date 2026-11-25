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
            className="flex animate-pulse flex-col gap-3 rounded-xl border border-border bg-surface p-5 motion-reduce:animate-none"
          >
            <div className="h-6 w-20 rounded-full bg-border" />
            <div className="h-5 w-full rounded bg-border" />
            <div className="h-14 w-full rounded bg-border" />
            <div className="h-4 w-1/2 rounded bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
