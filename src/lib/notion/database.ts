import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import type { Client } from "@modelcontextprotocol/client";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { notionConnections } from "@/db/schema";
import { selectType, uniqueOptionNames } from "./format";
import { callNotionTool, NotionToolError } from "./tools";

const DATABASE_TITLE = "AI 뉴스";
export const CATEGORY_PROPERTY = "카테고리";

// 데이터베이스를 만드는 도구 호출의 제한 시간(20초)보다 길어야 한다.
const LOCK_MS = 30 * 1000;
const WAIT_MS = 500;
const MAX_ATTEMPTS = 40;

function schemaStatement(optionNames: string[]) {
  return `CREATE TABLE ("제목" TITLE, "요약" RICH_TEXT, "출처" URL, "${CATEGORY_PROPERTY}" ${selectType(optionNames)}, "날짜" DATE)`;
}

/** 데이터 소스 조회 응답에서 카테고리 옵션 이름을 읽는다. */
function readCategoryOptions(response: string) {
  const { text } = JSON.parse(response) as { text: string };
  const state = /<data-source-state>([\s\S]*?)<\/data-source-state>/.exec(text);
  if (!state) throw new Error("Notion 데이터베이스 구성을 읽지 못했습니다.");

  const { schema } = JSON.parse(state[1]) as {
    schema: Record<string, { type: string; options?: { name: string }[] }>;
  };
  const property = schema[CATEGORY_PROPERTY];
  if (property?.type !== "select") {
    throw new Error(
      `Notion 데이터베이스에 선택 속성 '${CATEGORY_PROPERTY}'가 없습니다.`,
    );
  }
  return (property.options ?? []).map(({ name }) => name);
}

/** 저장된 대상의 카테고리 옵션. 대상이 없어졌으면 null */
async function fetchCategoryOptions(client: Client, dataSourceId: string) {
  try {
    return readCategoryOptions(
      await callNotionTool(client, "notion-fetch", {
        id: `collection://${dataSourceId}`,
      }),
    );
  } catch (error) {
    // 일시 오류에는 대상을 지우지 않는다.
    if (error instanceof NotionToolError && error.isNotFound) return null;
    throw error;
  }
}

async function createDatabase(client: Client, optionNames: string[]) {
  const response = await callNotionTool(client, "notion-create-database", {
    title: DATABASE_TITLE,
    schema: schemaStatement(optionNames),
  });
  const match = /collection:\/\/([0-9a-f-]{36})/i.exec(response);
  if (!match) throw new Error("만든 Notion 데이터베이스의 ID를 읽지 못했습니다.");
  return match[1];
}

/** 잠금을 잡고 데이터베이스를 만든다. 잠금을 잡지 못하면 null */
async function tryCreateTarget(
  client: Client,
  userId: string,
  optionNames: string[],
) {
  const lockedUntil = new Date(Date.now() + LOCK_MS);
  const [locked] = await db
    .update(notionConnections)
    .set({ targetLockedUntil: lockedUntil })
    .where(
      and(
        eq(notionConnections.userId, userId),
        isNull(notionConnections.targetId),
        or(
          isNull(notionConnections.targetLockedUntil),
          lt(notionConnections.targetLockedUntil, new Date()),
        ),
      ),
    )
    .returning({ userId: notionConnections.userId });
  if (!locked) return null;

  const ownLock = and(
    eq(notionConnections.userId, userId),
    eq(notionConnections.targetLockedUntil, lockedUntil),
  );
  try {
    const targetId = await createDatabase(client, optionNames);
    await db
      .update(notionConnections)
      .set({ targetId, targetLockedUntil: null })
      .where(ownLock);
    return targetId;
  } catch (error) {
    await db
      .update(notionConnections)
      .set({ targetLockedUntil: null })
      .where(ownLock);
    throw error;
  }
}

/**
 * 저장 대상 데이터 소스와 그 카테고리 옵션을 반환한다.
 * 대상이 없거나 Notion에서 삭제됐으면 새로 만든다.
 */
async function ensureTarget(
  client: Client,
  userId: string,
  optionNames: string[],
) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const [row] = await db
      .select({ targetId: notionConnections.targetId })
      .from(notionConnections)
      .where(eq(notionConnections.userId, userId));
    if (!row) throw new Error("Notion 연결 정보가 없습니다.");

    if (row.targetId) {
      const options = await fetchCategoryOptions(client, row.targetId);
      if (options) return { dataSourceId: row.targetId, options };
      await db
        .update(notionConnections)
        .set({ targetId: null })
        .where(
          and(
            eq(notionConnections.userId, userId),
            eq(notionConnections.targetId, row.targetId),
          ),
        );
      continue;
    }

    const created = await tryCreateTarget(client, userId, optionNames);
    if (created) return { dataSourceId: created, options: optionNames };
    // 다른 요청이 만드는 중이다.
    await sleep(WAIT_MS);
  }
  throw new Error("Notion 데이터베이스 준비를 기다리다 시간이 초과됐습니다.");
}

/**
 * 저장할 수 있는 데이터 소스를 준비하고, 카테고리에 해당하는 옵션 이름을 반환한다.
 * Notion은 없는 선택 옵션을 자동으로 추가하지 않는다.
 */
export async function prepareTarget(
  client: Client,
  userId: string,
  categoryOption: string,
  allCategoryOptions: string[],
) {
  const wanted = uniqueOptionNames(allCategoryOptions);
  const { dataSourceId, options } = await ensureTarget(client, userId, wanted);

  const find = (names: string[]) =>
    names.find((n) => n.toLowerCase() === categoryOption.toLowerCase());
  const existing = find(options);
  if (existing) return { dataSourceId, option: existing };

  // 목록에서 빠진 옵션은 삭제되므로 기존 옵션을 모두 넣는다. 동시에 저장해도
  // 앱의 카테고리가 빠지지 않도록 전체 카테고리를 함께 추가한다.
  const next = uniqueOptionNames([...options, ...wanted]);
  await callNotionTool(client, "notion-update-data-source", {
    data_source_id: dataSourceId,
    statements: `ALTER COLUMN "${CATEGORY_PROPERTY}" SET ${selectType(next)}`,
  });
  return { dataSourceId, option: find(next) ?? categoryOption };
}
