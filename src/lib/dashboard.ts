import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, categories } from "@/db/schema";
import { getAccess } from "./auth";

/** 대시보드에 필요한 카테고리(생성순)와 기사(발행 최신순)를 가져온다. */
export async function getDashboardData() {
  const access = await getAccess();
  if (access.status !== "allowed") {
    throw new Error("접근 권한이 없습니다.");
  }

  const [categoryRows, articleRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
      })
      .from(categories)
      .orderBy(asc(categories.createdAt), asc(categories.id)),
    db
      .select({
        id: articles.id,
        url: articles.url,
        source: articles.source,
        title: articles.title,
        titleKo: articles.titleKo,
        summaryKo: articles.summaryKo,
        publishedAt: articles.publishedAt,
        categoryId: articles.categoryId,
        categoryName: categories.name,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .orderBy(desc(articles.publishedAt), desc(articles.id)),
  ]);

  return { categories: categoryRows, articles: articleRows };
}
