/** 앱 이름과 오른쪽 영역으로 된 헤더 틀. 실제 화면과 로딩 화면이 함께 쓴다. */
export function AppHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
          AI 뉴스 수집기
        </span>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
