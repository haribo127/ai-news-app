"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p>뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        다시 시도
      </button>
    </main>
  );
}
