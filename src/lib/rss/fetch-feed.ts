import "server-only";
import Parser from "rss-parser";
import { getSnippet } from "rss-parser/lib/utils";
import type { articles } from "@/db/schema";
import type { NewsSource } from "./sources";

const TIMEOUT_MS = 10_000;
// TechCrunch는 rss-parser의 기본 User-Agent('rss-parser')를 403으로 거절한다.
const USER_AGENT = "feed-reader/1.0";

export type FeedArticle = Pick<
  typeof articles.$inferInsert,
  "url" | "source" | "title" | "author" | "excerpt" | "publishedAt"
>;

// RSS는 creator·contentSnippet, Atom은 author·summary에 값이 들어온다.
type FeedItem = { author?: string };

/**
 * 피드 하나를 가져와 articles 형식으로 바꾼다.
 * 링크나 제목이 없는 항목은 버리고, 날짜가 없으면 fetchedAt을 발행 시각으로 쓴다.
 */
export async function fetchFeed(
  source: NewsSource,
  fetchedAt: Date,
): Promise<FeedArticle[]> {
  const parser = new Parser<Record<string, unknown>, FeedItem>({
    timeout: TIMEOUT_MS,
    headers: { "User-Agent": USER_AGENT },
  });
  const feed = await parser.parseURL(source.feedUrl);
  const isAtom = source.format === "atom";

  return feed.items.flatMap((item) => {
    const url = item.link?.trim();
    // Atom의 제목과 summary는 HTML이라 태그와 엔티티를 정리한다.
    const title = (
      isAtom ? getSnippet(item.title ?? "") : (item.title ?? "")
    ).trim();
    if (!url || !title) return [];

    // Atom의 content는 본문 전체라서 발췌로 쓰지 않는다.
    const excerpt = isAtom
      ? getSnippet(item.summary ?? "")
      : item.contentSnippet?.trim();
    const author = (isAtom ? item.author : item.creator)?.trim();

    return {
      url,
      source: source.name,
      title,
      author: author || null,
      excerpt: excerpt || null,
      publishedAt: item.isoDate ? new Date(item.isoDate) : fetchedAt,
    };
  });
}
