import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import {
  FetchNewsButton,
  FetchNewsProvider,
  FetchNewsStatus,
} from "@/components/dashboard/fetch-news";
import { NewsBoard } from "@/components/dashboard/news-board";
import { NewsSkeleton } from "@/components/dashboard/news-skeleton";
import { getDashboardData } from "@/lib/dashboard";
import { formatPublishedAt } from "@/lib/format-date";

export const metadata: Metadata = {
  title: "대시보드 | AI 뉴스 수집기",
};

// 뉴스 가져오기 액션은 RSS 수집과 Claude 호출을 이어서 실행한다.
export const maxDuration = 60;

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="m-auto text-muted">불러오는 중…</p>}>
      <FetchNewsProvider>
        <AuthGate headerActions={<FetchNewsButton />}>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            <h1 className="sr-only">뉴스 대시보드</h1>
            <FetchNewsStatus />
            <Suspense fallback={<NewsSkeleton />}>
              <News />
            </Suspense>
          </main>
        </AuthGate>
      </FetchNewsProvider>
    </Suspense>
  );
}

async function News() {
  const { categories, articles } = await getDashboardData();
  const now = new Date();

  return (
    <NewsBoard
      categories={categories}
      articles={articles.map(({ publishedAt, ...article }) => ({
        ...article,
        publishedAtIso: publishedAt.toISOString(),
        publishedAtLabel: formatPublishedAt(publishedAt, now),
      }))}
    />
  );
}
