import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { summarize } from "@/lib/ai/summarize";

/**
 * 저장된 요약을 반환하고, 없으면 만들어 저장한다. 기사가 없으면 null.
 * 호출하는 쪽에서 접근 권한을 먼저 검사해야 한다.
 */
export async function getSummary(articleId: number) {
  const [article] = await db
    .select({
      title: articles.title,
      excerpt: articles.excerpt,
      summaryKo: articles.summaryKo,
    })
    .from(articles)
    .where(eq(articles.id, articleId));
  if (!article) return null;
  if (article.summaryKo) return article.summaryKo;

  // 원문 본문은 읽지 않고 RSS 발췌만 요약 재료로 쓴다.
  if (!article.excerpt) throw new Error("요약할 내용이 없습니다.");
  const summary = await summarize({
    title: article.title,
    content: article.excerpt,
  });

  // 동시에 요청돼도 먼저 저장된 값을 유지한다.
  const [saved] = await db
    .update(articles)
    .set({ summaryKo: summary })
    .where(and(eq(articles.id, articleId), isNull(articles.summaryKo)))
    .returning({ summaryKo: articles.summaryKo });
  if (saved) return summary;

  const [existing] = await db
    .select({ summaryKo: articles.summaryKo })
    .from(articles)
    .where(eq(articles.id, articleId));
  return existing?.summaryKo ?? null;
}
