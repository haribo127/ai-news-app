"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { getAccess } from "@/lib/auth";

export type DeleteArticleResult =
  | { status: "success" }
  | { status: "error"; message: string };

// articles.id는 Postgres integer다.
const MAX_ID = 2_147_483_647;

export async function deleteArticle(id: number): Promise<DeleteArticleResult> {
  if ((await getAccess()).status !== "allowed") {
    return { status: "error", message: "접근 권한이 없습니다." };
  }

  const failed = {
    status: "error",
    message: "뉴스를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  } as const;
  // Server Action의 인자는 클라이언트가 보내므로 형식부터 확인한다.
  if (!Number.isInteger(id) || id < 1 || id > MAX_ID) return failed;

  try {
    // Notion 저장 기록은 외래 키(on delete cascade)가 지운다. Notion 페이지는 남는다.
    // 이미 없는 기사면 지울 것이 없으므로 성공으로 본다.
    await db.delete(articles).where(eq(articles.id, id));
  } catch (error) {
    console.error("뉴스 삭제 실패", id, error);
    return failed;
  }

  refresh();
  return { status: "success" };
}
