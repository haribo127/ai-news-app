"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { fetchNews, type FetchNewsResult } from "@/app/dashboard/actions";

type FetchNewsState = {
  pending: boolean;
  result: FetchNewsResult | null;
  run: () => void;
};

const FetchNewsContext = createContext<FetchNewsState | null>(null);

function useFetchNews() {
  const state = useContext(FetchNewsContext);
  if (!state) throw new Error("FetchNewsProvider 안에서 사용해야 합니다.");
  return state;
}

/** 헤더의 버튼과 본문의 결과 문구가 실행 상태를 공유한다. */
export function FetchNewsProvider({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FetchNewsResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      let next: FetchNewsResult;
      try {
        next = await fetchNews();
      } catch (error) {
        // 네트워크 오류 등으로 액션 호출 자체가 실패한 경우
        console.error(error);
        next = {
          status: "error",
          message: "뉴스를 가져오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
        };
      }
      // await 뒤의 갱신은 다시 감싸야 목록과 함께 반영된다.
      startTransition(() => setResult(next));
    });
  }

  return (
    <FetchNewsContext value={{ pending, result, run }}>
      {children}
    </FetchNewsContext>
  );
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function FetchNewsButton() {
  const { pending, run } = useFetchNews();

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
    >
      {pending ? (
        "가져오는 중…"
      ) : (
        <>
          <span className="sm:hidden">가져오기</span>
          <span className="hidden sm:inline">뉴스 가져오기</span>
        </>
      )}
    </button>
  );
}

export function FetchNewsStatus() {
  const { pending, result, run } = useFetchNews();

  let message = "";
  if (result?.status === "success") {
    if (result.newCount > 0) {
      message = `새 뉴스 ${result.newCount}건을 가져왔습니다.`;
    } else if (result.failedSources.length === 0) {
      message = "새 뉴스가 없습니다.";
    }
  }

  const errors: string[] = [];
  if (result?.status === "error") {
    errors.push(result.message);
  } else if (result) {
    if (result.failedSources.length > 0) {
      errors.push(
        `${result.failedSources.join(", ")}에서 뉴스를 가져오지 못했습니다.`,
      );
    }
    if (result.processingFailed) {
      errors.push("저장된 뉴스의 번역·분류에 실패했습니다.");
    }
  }
  const error = errors.length ? `${errors.join(" ")} 다시 시도해 주세요.` : "";

  return (
    <>
      {/* 화면 낭독기가 변화를 읽도록 status 영역은 항상 둔다. */}
      <p role="status" className={message ? "mb-4 text-sm" : "sr-only"}>
        {message}
      </p>
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className={`rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            다시 시도
          </button>
        </div>
      )}
    </>
  );
}
