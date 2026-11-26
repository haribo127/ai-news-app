export const NEWS_SOURCES = [
  {
    name: "TechCrunch",
    feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    format: "rss",
  },
  {
    name: "The Verge",
    feedUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    format: "atom",
  },
] as const;

export type NewsSource = (typeof NEWS_SOURCES)[number];
