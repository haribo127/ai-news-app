"use client";

import { useState } from "react";
import { NewsCard, type NewsCardArticle } from "./news-card";

type Filter = "all" | "uncategorized" | number;

type Article = NewsCardArticle & { categoryId: number | null };

const chip =
  "rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function NewsBoard({
  categories,
  articles,
}: {
  categories: { id: number; name: string }[];
  articles: Article[];
}) {
  const [selected, setSelected] = useState<Filter>("all");

  const hasUncategorized = articles.some((a) => a.categoryId === null);
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "전체" },
    ...categories.map(({ id, name }) => ({ value: id, label: name })),
    ...(hasUncategorized
      ? [{ value: "uncategorized" as const, label: "미분류" }]
      : []),
  ];

  const visible = articles.filter((a) => {
    if (selected === "all") return true;
    if (selected === "uncategorized") return a.categoryId === null;
    return a.categoryId === selected;
  });

  return (
    <>
      <nav aria-label="카테고리">
        <ul className="flex flex-wrap items-center gap-2">
          {filters.map(({ value, label }) => (
            <li key={value}>
              <button
                type="button"
                aria-pressed={selected === value}
                onClick={() => setSelected(value)}
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
            {/* 카테고리 추가 기능은 아직 구현하지 않았다. */}
            <button
              type="button"
              disabled
              title="준비 중인 기능입니다."
              className={`${chip} border-dashed border-muted text-muted disabled:cursor-not-allowed disabled:opacity-50`}
            >
              + 카테고리 추가
            </button>
          </li>
        </ul>
      </nav>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {articles.length === 0
            ? "아직 수집된 뉴스가 없습니다."
            : "이 카테고리에는 뉴스가 없습니다."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </ul>
      )}
    </>
  );
}
