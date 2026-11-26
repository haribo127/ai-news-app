"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { reclassifyUncategorized } from "@/lib/ai/reclassify";
import { getAccess } from "@/lib/auth";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  RESERVED_CATEGORY_NAMES,
} from "@/lib/category";

export type CategoryResult =
  | { status: "success" }
  // field가 있으면 해당 입력창 아래에, 없으면 대화상자 아래에 표시한다.
  | { status: "error"; field?: "name" | "description"; message: string };

type CategoryInput = { name: string; description: string };

const DENIED = { status: "error", message: "접근 권한이 없습니다." } as const;

const DUPLICATE_NAME = {
  status: "error",
  field: "name",
  message: "이미 있는 카테고리 이름입니다.",
} as const;

const SAVE_FAILED = {
  status: "error",
  message: "카테고리를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

async function isAllowed() {
  return (await getAccess()).status === "allowed";
}

// Server Action의 인자는 클라이언트가 보내므로 형식부터 확인한다.
function isId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function parseInput(
  input: CategoryInput,
): { values: CategoryInput } | { error: CategoryResult } {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const description =
    typeof input?.description === "string" ? input.description.trim() : "";
  const fail = (field: "name" | "description", message: string) => ({
    error: { status: "error" as const, field, message },
  });

  if (!name) return fail("name", "이름을 입력해 주세요.");
  if (name.length > CATEGORY_NAME_MAX) {
    return fail("name", `이름은 ${CATEGORY_NAME_MAX}자 이하로 입력해 주세요.`);
  }
  if (RESERVED_CATEGORY_NAMES.includes(name)) {
    return fail("name", "사용할 수 없는 이름입니다.");
  }
  if (!description) return fail("description", "설명을 입력해 주세요.");
  if (description.length > CATEGORY_DESCRIPTION_MAX) {
    return fail(
      "description",
      `설명은 ${CATEGORY_DESCRIPTION_MAX}자 이하로 입력해 주세요.`,
    );
  }
  return { values: { name, description } };
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryResult> {
  if (!(await isAllowed())) return DENIED;

  const parsed = parseInput(input);
  if ("error" in parsed) return parsed.error;

  try {
    // 같은 이름이 있으면 저장하지 않고 빈 목록을 돌려받는다.
    const inserted = await db
      .insert(categories)
      .values(parsed.values)
      .onConflictDoNothing({ target: categories.name })
      .returning({ id: categories.id });
    if (inserted.length === 0) return DUPLICATE_NAME;
  } catch (error) {
    console.error("카테고리 저장 실패", error);
    return SAVE_FAILED;
  }

  refresh();
  return { status: "success" };
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<CategoryResult> {
  if (!(await isAllowed())) return DENIED;
  if (!isId(id)) return SAVE_FAILED;

  const parsed = parseInput(input);
  if ("error" in parsed) return parsed.error;

  try {
    // 이름의 unique 제약이 최종 방어선이고, 여기서는 안내 문구를 위해 먼저 확인한다.
    const duplicates = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.name, parsed.values.name), ne(categories.id, id)),
      );
    if (duplicates.length > 0) return DUPLICATE_NAME;

    const updated = await db
      .update(categories)
      .set(parsed.values)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    if (updated.length === 0) {
      return {
        status: "error",
        message: "카테고리를 찾을 수 없습니다. 새로고침해 주세요.",
      };
    }
  } catch (error) {
    console.error("카테고리 수정 실패", error);
    return SAVE_FAILED;
  }

  refresh();
  return { status: "success" };
}

export async function deleteCategory(id: number): Promise<CategoryResult> {
  if (!(await isAllowed())) return DENIED;

  const failed = {
    status: "error",
    message: "카테고리를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  } as const;
  if (!isId(id)) return failed;

  try {
    // 소속 기사의 categoryId는 외래 키(on delete set null)가 비운다.
    await db.delete(categories).where(eq(categories.id, id));
  } catch (error) {
    console.error("카테고리 삭제 실패", error);
    return failed;
  }

  refresh();
  return { status: "success" };
}

export type ReclassifyResult =
  | { status: "success"; classified: number; remaining: number }
  | { status: "error"; message: string };

export async function reclassify(): Promise<ReclassifyResult> {
  if (!(await isAllowed())) return DENIED;

  let result: Awaited<ReturnType<typeof reclassifyUncategorized>>;
  try {
    result = await reclassifyUncategorized();
  } catch (error) {
    console.error("미분류 재분류 실패", error);
    return {
      status: "error",
      message: "다시 분류하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (result.status === "no-categories") {
    return { status: "error", message: "카테고리를 먼저 추가해 주세요." };
  }

  refresh();
  const { classified, remaining } = result;
  return { status: "success", classified, remaining };
}
