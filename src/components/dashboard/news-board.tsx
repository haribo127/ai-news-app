"use client";

import { useRef, useState } from "react";
import { CategoryForm, type Category } from "./category-form";
import { CategoryActions, useReclassify } from "./category-toolbar";
import {
  NewsCard,
  type NewsCardArticle,
  type SaveRequest,
  type SummaryRequest,
} from "./news-card";
import { Pagination } from "./pagination";
import { secondaryButton } from "./styles";

const PAGE_SIZE = 9;

type Filter = "all" | "uncategorized" | number;

type Article = NewsCardArticle & { categoryId: number | null };

const chip =
  "rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// 필터 칩과 구분되도록 관리 버튼은 점선 테두리를 쓴다.
const manageChip = `${chip} border-dashed border-muted text-muted hover:border-accent hover:text-accent`;

export function NewsBoard({
  categories,
  articles,
}: {
  categories: Category[];
  articles: Article[];
}) {
  const [selected, setSelected] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  // 페이지나 필터를 바꿔도 남도록 이번에 만든 요약을 여기에 보관한다.
  const [requests, setRequests] = useState<Record<number, SummaryRequest>>({});
  const [saves, setSaves] = useState<Record<number, SaveRequest>>({});

  const reclassification = useReclassify();
  const allChipRef = useRef<HTMLButtonElement>(null);

  const hasUncategorized = articles.some((a) => a.categoryId === null);
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "전체" },
    ...categories.map(({ id, name }) => ({ value: id, label: name })),
    ...(hasUncategorized
      ? [{ value: "uncategorized" as const, label: "미분류" }]
      : []),
  ];

  // 선택한 칩이 사라지면(카테고리 삭제, 미분류 소진) '전체'로 돌아간다.
  if (!filters.some(({ value }) => value === selected)) {
    setSelected("all");
    setPage(1);
  }
  const selectedCategory = categories.find(({ id }) => id === selected);

  const visible = articles.filter((a) => {
    if (selected === "all") return true;
    if (selected === "uncategorized") return a.categoryId === null;
    return a.categoryId === selected;
  });

  // 목록이 줄어 현재 페이지가 없어지면 마지막 페이지를 보여준다.
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageArticles = visible.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  async function loadSummary(id: number) {
    const update = (request: SummaryRequest) =>
      setRequests((current) => ({ ...current, [id]: request }));

    update({ status: "loading" });
    try {
      const response = await fetch(`/api/articles/${id}/summary`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`요약 요청 실패: ${response.status}`);
      const { summary } = (await response.json()) as { summary: string };
      update({ status: "done", summary });
    } catch (error) {
      console.error(error);
      // 그사이 Notion 저장이 요약을 받아 왔으면 그대로 둔다.
      setRequests((current) =>
        current[id]?.status === "done"
          ? current
          : { ...current, [id]: { status: "error" } },
      );
    }
  }

  async function saveToNotion(id: number) {
    const update = (request: SaveRequest) =>
      setSaves((current) => ({ ...current, [id]: request }));

    update({ status: "saving" });
    try {
      const response = await fetch(`/api/articles/${id}/notion`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        code?: string;
        summary?: string | null;
      };

      if (body.code === "not_connected") {
        // 뒤로 돌아왔을 때 '저장 중'이 남지 않게 지우고 연결을 시작한다.
        setSaves((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        // Notion 승인 화면으로 넘어가는 API 경로라서 전체 이동이 필요하다.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/api/notion/connect");
        return;
      }
      if (body.code === "in_progress") {
        update({
          status: "error",
          message: "저장이 진행 중입니다. 잠시 후 다시 눌러 주세요.",
        });
        return;
      }
      if (!response.ok) throw new Error(`저장 요청 실패: ${response.status}`);

      // 저장하면서 만든 요약도 카드에 보여준다.
      const { summary } = body;
      if (summary) {
        setRequests((current) => ({
          ...current,
          [id]: { status: "done", summary },
        }));
      }
      update({ status: "saved" });
    } catch (error) {
      console.error(error);
      update({
        status: "error",
        message: "Notion에 저장하지 못했습니다. 다시 시도해 주세요.",
      });
    }
  }

  function selectFilter(value: Filter) {
    reclassification.clear();
    setSelected(value);
    setPage(1);
  }

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <nav aria-label="카테고리">
        <ul className="flex flex-wrap items-center gap-2">
          {filters.map(({ value, label }) => (
            <li key={value}>
              <button
                ref={value === "all" ? allChipRef : undefined}
                type="button"
                aria-pressed={selected === value}
                onClick={() => selectFilter(value)}
                className={`${chip} ${
                  selected === value
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
          <li>
            <CategoryForm className={manageChip}>+ 카테고리 추가</CategoryForm>
          </li>
          {selectedCategory && (
            <CategoryActions
              key={selectedCategory.id}
              category={selectedCategory}
              className={manageChip}
              // 삭제하면 열었던 버튼이 없어지므로 '전체' 칩으로 포커스를 옮긴다.
              onDeleted={() => {
                selectFilter("all");
                allChipRef.current?.focus();
              }}
            />
          )}
        </ul>
      </nav>

      {selected === "uncategorized" && (
        <div className="mt-3">
          <button
            type="button"
            onClick={reclassification.run}
            disabled={reclassification.pending}
            className={secondaryButton}
          >
            {reclassification.pending ? "분류하는 중…" : "미분류 다시 분류"}
          </button>
        </div>
      )}

      {/* 화면 낭독기가 변화를 읽도록 status 영역은 항상 둔다. */}
      <p
        role="status"
        className={reclassification.message ? "mt-3 text-sm" : "sr-only"}
      >
        {reclassification.message}
      </p>
      {reclassification.error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {reclassification.error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {articles.length === 0
            ? "아직 수집된 뉴스가 없습니다. 상단의 가져오기 버튼을 눌러 주세요."
            : "이 카테고리에는 뉴스가 없습니다."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageArticles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              request={requests[article.id]}
              onLoadSummary={() => loadSummary(article.id)}
              saveRequest={saves[article.id]}
              onSave={() => saveToNotion(article.id)}
            />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={changePage}
        />
      )}
    </>
  );
}
