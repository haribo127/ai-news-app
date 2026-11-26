"use client";

import { useId, useState } from "react";

export type NewsCardArticle = {
  id: number;
  url: string;
  source: string;
  title: string;
  titleKo: string | null;
  summaryKo: string | null;
  categoryName: string | null;
  publishedAtIso: string;
  publishedAtLabel: string;
};

export type SummaryRequest =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; summary: string };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function NewsCard({
  article,
  request,
  onLoadSummary,
}: {
  article: NewsCardArticle;
  request: SummaryRequest | undefined;
  onLoadSummary: () => void;
}) {
  const [open, setOpen] = useState(false);
  const summaryId = useId();
  const summary =
    article.summaryKo ?? (request?.status === "done" ? request.summary : null);

  function toggle() {
    // 요청한 적이 없을 때만 만든다. 실패하면 '다시 시도'로 다시 요청한다.
    if (!open && !summary && !request) onLoadSummary();
    setOpen(!open);
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm">
      <span className="self-start rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-foreground">
        {article.categoryName ?? "미분류"}
      </span>

      <h2 className="text-base font-semibold leading-snug break-keep wrap-anywhere">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={summaryId}
          onClick={toggle}
          className={`text-left hover:text-accent ${focusRing}`}
        >
          <span lang={article.titleKo ? undefined : "en"}>
            {article.titleKo ?? article.title}
          </span>
        </button>
      </h2>

      <div id={summaryId} aria-live="polite">
        {open && !summary && request?.status === "loading" ? (
          <div role="status">
            <span className="sr-only">요약을 만드는 중입니다.</span>
            <div
              aria-hidden="true"
              className="flex animate-pulse flex-col gap-3 py-1.5 motion-reduce:animate-none"
            >
              <div className="h-4 w-full rounded bg-border" />
              <div className="h-4 w-full rounded bg-border" />
              <div className="h-4 w-2/3 rounded bg-border" />
            </div>
          </div>
        ) : open && !summary && request?.status === "error" ? (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-danger">요약을 만들지 못했습니다.</p>
            <button
              type="button"
              onClick={onLoadSummary}
              className={`rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background ${focusRing}`}
            >
              다시 시도
            </button>
          </div>
        ) : (
          <p
            className={`text-[15px] leading-7 break-keep wrap-anywhere ${
              open ? "whitespace-pre-line" : "line-clamp-2"
            } ${summary ? "" : "text-muted"}`}
          >
            {summary ?? "열면 한국어 요약을 만듭니다."}
          </p>
        )}
      </div>

      <p className="text-xs text-muted">
        {article.source} ·{" "}
        <time dateTime={article.publishedAtIso}>
          {article.publishedAtLabel}
        </time>
      </p>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm font-medium text-accent hover:underline ${focusRing}`}
        >
          원문 보기 ↗
        </a>
        {/* Notion 저장은 아직 구현하지 않았다. */}
        <button
          type="button"
          disabled
          title="준비 중인 기능입니다."
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Notion 저장
        </button>
      </div>
    </li>
  );
}
