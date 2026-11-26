"use server";

import { refresh } from "next/cache";
import { processNewArticles } from "@/lib/ai/process-articles";
import { getAccess } from "@/lib/auth";
import { collectNews } from "@/lib/rss/collect";

export type FetchNewsResult =
  | {
      status: "success";
      newCount: number;
      failedSources: string[];
      processingFailed: boolean;
    }
  | { status: "error"; message: string };

export async function fetchNews(): Promise<FetchNewsResult> {
  const access = await getAccess();
  if (access.status !== "allowed") {
    return { status: "error", message: "접근 권한이 없습니다." };
  }

  let collected: Awaited<ReturnType<typeof collectNews>>;
  try {
    collected = await collectNews();
  } catch (error) {
    console.error("뉴스 저장 실패", error);
    return {
      status: "error",
      message: "뉴스를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const { newCount, failedSources, allFailed } = collected;
  if (allFailed) {
    return {
      status: "error",
      message: "모든 소스에서 뉴스를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 새 기사가 없어도 이전에 처리하지 못한 기사를 다시 처리한다.
  let processingFailed = false;
  try {
    await processNewArticles();
  } catch (error) {
    console.error("뉴스 번역·분류 실패", error);
    processingFailed = true;
  }

  refresh();
  return { status: "success", newCount, failedSources, processingFailed };
}
