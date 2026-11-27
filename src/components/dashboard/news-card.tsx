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
  savedToNotion: boolean;
};

export type SummaryRequest =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; summary: string };

export type SaveRequest =
  | { status: "saving" }
  | { status: "error"; message: string }
  | { status: "saved" };

export type DeleteRequest =
  | { status: "deleting" }
  | { status: "error"; message: string };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function NewsCard({
  article,
  request,
  onLoadSummary,
  saveRequest,
  onSave,
  deleteRequest,
  onDelete,
}: {
  article: NewsCardArticle;
  request: SummaryRequest | undefined;
  onLoadSummary: () => void;
  saveRequest: SaveRequest | undefined;
  onSave: () => void;
  deleteRequest: DeleteRequest | undefined;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const summaryId = useId();
  const summary =
    article.summaryKo ?? (request?.status === "done" ? request.summary : null);

  const saved = article.savedToNotion || saveRequest?.status === "saved";
  const saving = !saved && saveRequest?.status === "saving";
  const saveError =
    !saved && saveRequest?.status === "error" ? saveRequest.message : null;

  const deleting = deleteRequest?.status === "deleting";
  const deleteError =
    deleteRequest?.status === "error" ? deleteRequest.message : null;

  function toggle() {
    // 요청한 적이 없을 때만 만든다. 실패하면 '다시 시도'로 다시 요청한다.
    if (!open && !summary && !request) onLoadSummary();
    setOpen(!open);
  }

  return (
    <li
      data-article-id={article.id}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-foreground">
          {article.categoryName ?? "미분류"}
        </span>
        {/* 저장 중에 지우면 Notion 페이지만 만들어지고 저장 기록이 남지 않는다. */}
        <button
          type="button"
          aria-label={`'${article.titleKo ?? article.title}' 뉴스 삭제`}
          title="삭제"
          onClick={onDelete}
          disabled={deleting || saving}
          className={`-mt-2 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted ${focusRing}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="size-4"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

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
        <button
          type="button"
          onClick={onSave}
          disabled={saved || saving || deleting}
          className={`rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background disabled:cursor-not-allowed disabled:hover:bg-transparent ${
            saved ? "text-success" : "disabled:opacity-50"
          } ${focusRing}`}
        >
          {saved
            ? "✓ 저장됨"
            : saving
              ? "저장 중…"
              : saveError
                ? "다시 저장"
                : "Notion 저장"}
        </button>
      </div>

      {/* 화면 낭독기가 저장 완료를 읽도록 status 영역은 항상 둔다. */}
      <p role="status" className="sr-only">
        {saveRequest?.status === "saved" ? "Notion에 저장했습니다." : ""}
      </p>
      {saveError && (
        <p role="alert" className="text-sm text-danger">
          {saveError}
        </p>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-danger">
          {deleteError}
        </p>
      )}
    </li>
  );
}
