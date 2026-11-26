import { SignOutButton, UserButton } from "@clerk/nextjs";
import { getAccess } from "@/lib/auth";
import { SignInModal } from "./sign-in-modal";

/** 허용된 사용자에게만 children과 headerActions를 보여준다. */
export async function AuthGate({
  children,
  headerActions,
}: {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  const access = await getAccess();

  if (access.status === "signed-out") {
    return (
      <Notice message="로그인이 필요합니다.">
        <SignInModal />
      </Notice>
    );
  }

  if (access.status === "forbidden") {
    return (
      <Notice
        message={`접근 권한이 없는 계정입니다.${access.email ? ` (${access.email})` : ""}`}
      >
        <SignOutButton redirectUrl="/">
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            로그아웃
          </button>
        </SignOutButton>
      </Notice>
    );
  }

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
            AI 뉴스 수집기
          </span>
          <div className="flex items-center gap-3">
            {headerActions}
            <UserButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}

function Notice({
  message,
  children,
}: {
  message: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold">AI 뉴스 수집기</h1>
      <p>{message}</p>
      {children}
    </main>
  );
}
