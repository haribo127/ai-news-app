// docs/ui.md §6의 버튼과 대화상자 클래스.
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const disabled = "disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 ${disabled} ${focusRing}`;

export const secondaryButton = `rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background ${disabled} ${focusRing}`;

export const dangerButton = `rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger ${disabled} ${focusRing}`;

export const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/50";
