"use client";

import { useId, useRef, useState } from "react";
import { focusRing, primaryButton } from "./styles";

/** 입력 중에는 목록을 바꾸지 않고, '검색' 버튼이나 Enter로 검색어를 넘긴다. */
export function SearchForm({
  applied,
  onSearch,
}: {
  applied: string;
  onSearch: (keyword: string) => void;
}) {
  const [draft, setDraft] = useState(applied);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function search(value: string) {
    const keyword = value.trim();
    setDraft(keyword);
    onSearch(keyword);
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search(draft);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label htmlFor={inputId} className="sr-only">
        제목·요약 검색
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={100}
        placeholder="제목·요약에서 검색"
        autoComplete="off"
        className={`min-w-0 flex-1 rounded-lg border border-muted bg-surface px-3 py-2 text-base ${focusRing}`}
      />
      <button type="submit" className={`whitespace-nowrap ${primaryButton}`}>
        검색
      </button>
      {applied && (
        <button
          type="button"
          // 누르면 이 버튼이 없어지므로 입력창으로 포커스를 옮긴다.
          onClick={() => {
            search("");
            inputRef.current?.focus();
          }}
          // 페이지 배경 위라서 hover 배경은 surface를 쓴다.
          className={`whitespace-nowrap rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface ${focusRing}`}
        >
          초기화
        </button>
      )}
    </form>
  );
}
