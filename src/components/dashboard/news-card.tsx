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

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function NewsCard({ article }: { article: NewsCardArticle }) {
  const [open, setOpen] = useState(false);
  const summaryId = useId();

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
          onClick={() => setOpen((value) => !value)}
          className={`text-left hover:text-accent ${focusRing}`}
        >
          <span lang={article.titleKo ? undefined : "en"}>
            {article.titleKo ?? article.title}
          </span>
        </button>
      </h2>

      {/* 요약 생성은 아직 구현하지 않아 저장된 요약만 보여준다. */}
      <p
        id={summaryId}
        className={`text-[15px] leading-7 break-keep wrap-anywhere ${
          open ? "whitespace-pre-line" : "line-clamp-2"
        } ${article.summaryKo ? "" : "text-muted"}`}
      >
        {article.summaryKo ?? "아직 한국어 요약이 없습니다."}
      </p>

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
