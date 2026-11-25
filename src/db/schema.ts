import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  // 분류 프롬프트에 사용한다.
  description: text("description").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const articles = pgTable(
  "articles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    url: text("url").notNull().unique(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    // 원문 기사 작성자. RSS에 없으면 null
    author: text("author"),
    excerpt: text("excerpt"),
    // RSS에 날짜가 없으면 수집 시각을 넣는다.
    publishedAt: timestamptz("published_at").notNull(),
    // null이면 '미분류'
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    // null이면 번역 전. 화면에는 title을 대신 보여준다.
    titleKo: text("title_ko"),
    summaryKo: text("summary_ko"),
    fetchedAt: timestamptz("fetched_at").notNull().defaultNow(),
  },
  (table) => [
    index("articles_published_at_idx").on(table.publishedAt.desc()),
    index("articles_category_id_idx").on(table.categoryId),
  ],
);

export const notionConnections = pgTable("notion_connections", {
  // Clerk 사용자 ID
  userId: text("user_id").primaryKey(),
  // 토큰은 암호문만 저장한다.
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  expiresAt: timestamptz("expires_at"),
  // Notion 저장 대상 ID
  targetId: text("target_id"),
  updatedAt: timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const savedToNotion = pgTable("saved_to_notion", {
  // 기본 키라서 기사당 저장 기록은 1건이다.
  articleId: integer("article_id")
    .primaryKey()
    .references(() => articles.id, { onDelete: "cascade" }),
  notionPageId: text("notion_page_id").notNull(),
  savedAt: timestamptz("saved_at").notNull().defaultNow(),
});
