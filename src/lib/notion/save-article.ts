import "server-only";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { articles, categories, savedToNotion } from "@/db/schema";
import { getSummary } from "@/lib/article/get-summary";
import { withNotionClient } from "./client";
import { CATEGORY_PROPERTY, prepareTarget } from "./database";
import { escapeMarkdown, toOptionName } from "./format";
import { getAccessToken } from "./token";
import { callNotionTool } from "./tools";

const UNCATEGORIZED = "미분류";
// 이 시간이 지난 '저장 중' 기록은 중단된 것으로 본다. 라우트 실행 시간(60초)보다 길다.
const STALE_CLAIM_MS = 2 * 60 * 1000;

export type SaveResult =
  | { status: "saved"; summary: string | null }
  | { status: "in-progress" }
  | { status: "not-found" };

async function loadArticle(articleId: number) {
  const [article] = await db
    .select({
      url: articles.url,
      title: articles.title,
      titleKo: articles.titleKo,
      summaryKo: articles.summaryKo,
      publishedAt: articles.publishedAt,
      categoryName: categories.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.id, articleId));
  return article;
}

async function isSaved(articleId: number) {
  const [row] = await db
    .select({ notionPageId: savedToNotion.notionPageId })
    .from(savedToNotion)
    .where(eq(savedToNotion.articleId, articleId));
  return Boolean(row?.notionPageId);
}

/** 저장 기록을 선점한다. 완료됐거나 다른 요청이 저장 중이면 false */
async function claim(articleId: number, claimedAt: Date) {
  const [row] = await db
    .insert(savedToNotion)
    .values({ articleId, notionPageId: null, savedAt: claimedAt })
    .onConflictDoUpdate({
      target: savedToNotion.articleId,
      set: { savedAt: claimedAt },
      setWhere: and(
        isNull(savedToNotion.notionPageId),
        lt(savedToNotion.savedAt, new Date(Date.now() - STALE_CLAIM_MS)),
      ),
    })
    .returning({ articleId: savedToNotion.articleId });
  return Boolean(row);
}

/** 다시 시도할 수 있도록 이 요청이 선점한 기록만 지운다. */
async function release(articleId: number, claimedAt: Date) {
  await db
    .delete(savedToNotion)
    .where(
      and(
        eq(savedToNotion.articleId, articleId),
        eq(savedToNotion.savedAt, claimedAt),
        isNull(savedToNotion.notionPageId),
      ),
    );
}

/**
 * 기사를 Notion 데이터베이스에 한 행으로 저장한다.
 * 호출하는 쪽에서 접근 권한을 먼저 검사해야 한다.
 * 연결이 필요하면 NotionNotConnectedError를 던진다.
 */
export async function saveArticleToNotion(
  userId: string,
  articleId: number,
): Promise<SaveResult> {
  const article = await loadArticle(articleId);
  if (!article) return { status: "not-found" };
  const done = (summary: string | null) => ({
    status: "saved" as const,
    summary,
  });
  if (await isSaved(articleId)) return done(article.summaryKo);

  // 연결이 없으면 요약을 만들기 전에 알린다.
  await getAccessToken(userId);

  const claimedAt = new Date();
  if (!(await claim(articleId, claimedAt))) {
    return (await isSaved(articleId))
      ? done(article.summaryKo)
      : { status: "in-progress" };
  }

  try {
    const summary = await getSummary(articleId);
    if (summary === null) throw new Error("기사를 찾을 수 없습니다.");

    const categoryRows = await db
      .select({ name: categories.name })
      .from(categories);
    const categoryOption = toOptionName(article.categoryName ?? UNCATEGORIZED);

    const pageId = await withNotionClient(userId, async (client) => {
      const { dataSourceId, option } = await prepareTarget(
        client,
        userId,
        categoryOption,
        [...categoryRows.map(({ name }) => name), UNCATEGORIZED].map(
          toOptionName,
        ),
      );
      const response = await callNotionTool(client, "notion-create-pages", {
        parent: { type: "data_source_id", data_source_id: dataSourceId },
        pages: [
          {
            properties: {
              제목: escapeMarkdown(article.titleKo ?? article.title),
              요약: escapeMarkdown(summary),
              출처: article.url,
              [CATEGORY_PROPERTY]: option,
              "date:날짜:start": article.publishedAt.toISOString(),
              "date:날짜:is_datetime": 1,
            },
          },
        ],
      });
      const { pages } = JSON.parse(response) as { pages?: { id?: string }[] };
      const id = pages?.[0]?.id;
      if (!id) throw new Error("만든 Notion 페이지의 ID를 읽지 못했습니다.");
      return id;
    });

    await db
      .update(savedToNotion)
      .set({ notionPageId: pageId, savedAt: new Date() })
      .where(eq(savedToNotion.articleId, articleId));
    return done(summary);
  } catch (error) {
    await release(articleId, claimedAt);
    throw error;
  }
}
