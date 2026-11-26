"use client";

import { useId, useRef, useState, useTransition } from "react";
import {
  createCategory,
  updateCategory,
  type CategoryResult,
} from "@/app/dashboard/category-actions";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
} from "@/lib/category";
import { dialogClass, focusRing, primaryButton, secondaryButton } from "./styles";

export type Category = { id: number; name: string; description: string };

type FormError = Extract<CategoryResult, { status: "error" }>;

const input = `w-full rounded-lg border border-muted bg-surface px-3 py-2 text-base ${focusRing}`;

/**
 * 대화상자를 여는 버튼과 카테고리 입력 대화상자.
 * category가 있으면 수정하고, 없으면 추가한다.
 */
export function CategoryForm({
  category,
  className,
  children,
}: {
  category?: Category;
  className: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();
  const titleId = `${id}-title`;
  const nameId = `${id}-name`;
  const nameErrorId = `${id}-name-error`;
  const descriptionId = `${id}-description`;
  const hintId = `${id}-hint`;
  const descriptionErrorId = `${id}-description-error`;

  // 열 때마다 저장된 값(추가면 빈 값)에서 시작한다.
  function open() {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setError(null);
    dialogRef.current?.showModal();
  }

  // 닫으면 열었던 버튼으로 포커스를 돌린다.
  function handleClose() {
    triggerRef.current?.focus();
  }

  // form의 action은 제출 뒤 입력값을 지우므로 onSubmit을 쓴다.
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      let result: CategoryResult;
      try {
        const values = { name, description };
        result = category
          ? await updateCategory(category.id, values)
          : await createCategory(values);
      } catch (caught) {
        console.error(caught);
        result = {
          status: "error",
          message:
            "카테고리를 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
        };
      }
      // await 뒤의 갱신은 다시 감싸야 목록과 함께 반영된다.
      startTransition(() => {
        if (result.status === "success") dialogRef.current?.close();
        else setError(result);
      });
    });
  }

  const nameError = error?.field === "name" ? error.message : null;
  const descriptionError =
    error?.field === "description" ? error.message : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        className={className}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={handleClose}
        // 저장 중에는 Esc로 닫지 않는다.
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className={dialogClass}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            {category ? "카테고리 수정" : "카테고리 추가"}
          </h2>

          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="text-sm font-medium">
              이름
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={CATEGORY_NAME_MAX}
              autoComplete="off"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? nameErrorId : undefined}
              className={input}
            />
            {nameError && (
              <p id={nameErrorId} role="alert" className="text-sm text-danger">
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={descriptionId} className="text-sm font-medium">
              설명
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              maxLength={CATEGORY_DESCRIPTION_MAX}
              rows={3}
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={
                descriptionError ? `${hintId} ${descriptionErrorId}` : hintId
              }
              className={`${input} resize-y`}
            />
            <p id={hintId} className="text-xs text-muted">
              기사를 자동 분류할 때 사용합니다.
            </p>
            {descriptionError && (
              <p
                id={descriptionErrorId}
                role="alert"
                className="text-sm text-danger"
              >
                {descriptionError}
              </p>
            )}
          </div>

          {error && !error.field && (
            <p role="alert" className="text-sm text-danger">
              {error.message}
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
              type="submit"
              disabled={pending}
              className={primaryButton}
            >
              {category
                ? pending
                  ? "저장하는 중…"
                  : "저장"
                : pending
                  ? "추가하는 중…"
                  : "추가"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
