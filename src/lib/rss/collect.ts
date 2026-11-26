import "server-only";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { fetchFeed } from "./fetch-feed";
import { NEWS_SOURCES } from "./sources";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PER_SOURCE = 20;

/**
 * 모든 소스에서 최근 24시간의 기사를 병렬로 수집해 신규 URL만 저장한다.
 * 일부 소스가 실패해도 나머지는 저장한다.
 */
export async function collectNews() {
  const now = new Date();
  const since = now.getTime() - WINDOW_MS;

  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => fetchFeed(source, now)),
  );

  const failedSources: string[] = [];
  const recent = results.flatMap((result, i) => {
    if (result.status === "rejected") {
      console.error(`${NEWS_SOURCES[i].name} 피드 수집 실패`, result.reason);
      failedSources.push(NEWS_SOURCES[i].name);
      return [];
    }

    return result.value
      .filter((article) => article.publishedAt.getTime() >= since)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, MAX_PER_SOURCE);
  });

  // 이미 저장된 URL은 건너뛰므로 반환된 행이 신규 기사다.
  const inserted = recent.length
    ? await db
        .insert(articles)
        .values(recent)
        .onConflictDoNothing({ target: articles.url })
        .returning({ id: articles.id })
    : [];

  return {
    newCount: inserted.length,
    failedSources,
    allFailed: failedSources.length === NEWS_SOURCES.length,
  };
}
