"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  deleteCategory,
  reclassify,
  type CategoryResult,
  type ReclassifyResult,
} from "@/app/dashboard/category-actions";
import { CategoryForm, type Category } from "./category-form";
import {
  dangerButton,
  dialogClass,
  secondaryButton,
} from "./styles";

/** 선택한 카테고리의 '수정', '삭제'. 카테고리 바의 목록 항목으로 그린다. */
export function CategoryActions({
  category,
  className,
  onDeleted,
}: {
  category: Category;
  className: string;
  onDeleted: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const messageId = useId();

  function remove() {
    setError("");
    startTransition(async () => {
      let result: CategoryResult;
      try {
        result = await deleteCategory(category.id);
      } catch (caught) {
        console.error(caught);
        result = {
          status: "error",
          message:
            "카테고리를 삭제하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
        };
      }
      // await 뒤의 갱신은 다시 감싸야 목록과 함께 반영된다.
      startTransition(() => {
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        dialogRef.current?.close();
        onDeleted();
      });
    });
  }

  return (
    <>
      <li>
        <CategoryForm category={category} className={className}>
          수정
        </CategoryForm>
      </li>
      <li>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            setError("");
            dialogRef.current?.showModal();
          }}
          className={className}
        >
          삭제
        </button>

        <dialog
          ref={dialogRef}
          aria-labelledby={messageId}
          onClose={() => triggerRef.current?.focus()}
          // 삭제 중에는 Esc로 닫지 않는다.
          onCancel={(event) => {
            if (pending) event.preventDefault();
          }}
          className={dialogClass}
        >
          <div className="flex flex-col gap-4">
            <p id={messageId} className="break-keep wrap-anywhere">
              &#39;{category.name}&#39; 카테고리를 삭제할까요? 소속 기사는
              &#39;미분류&#39;로 이동합니다.
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                disabled={pending}
                className={secondaryButton}
              >
                취소
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className={dangerButton}
              >
                {pending ? "삭제하는 중…" : "삭제"}
              </button>
            </div>
          </div>
        </dialog>
      </li>
    </>
  );
}

function reclassifyMessage({
  classified,
  remaining,
}: Extract<ReclassifyResult, { status: "success" }>) {
  if (classified === 0) {
    return remaining === 0
      ? "다시 분류할 뉴스가 없습니다."
      : "알맞은 카테고리를 찾지 못해 미분류로 두었습니다.";
  }
  return remaining === 0
    ? `${classified}건을 분류했습니다.`
    : `${classified}건을 분류했습니다. 미분류 ${remaining}건이 남았습니다.`;
}

/**
 * '미분류 다시 분류'의 실행 상태. 모두 분류되면 버튼이 사라지므로
 * 결과 문구를 보여줄 수 있게 상태는 목록 쪽에서 가진다.
 */
export function useReclassify() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ReclassifyResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      let next: ReclassifyResult;
      try {
        next = await reclassify();
      } catch (error) {
        console.error(error);
        next = {
          status: "error",
          message: "다시 분류하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
        };
      }
      startTransition(() => setResult(next));
    });
  }

  return {
    pending,
    message: result?.status === "success" ? reclassifyMessage(result) : "",
    error: result?.status === "error" ? result.message : "",
    run,
    clear: () => setResult(null),
  };
}
