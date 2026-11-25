"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";

/** 로그인하지 않은 방문자에게 로그인 모달을 바로 띄운다. */
export function SignInModal() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn, closeSignIn } = useClerk();
  const pathname = usePathname();

  const open = useCallback(() => {
    openSignIn({
      forceRedirectUrl: pathname,
      signUpForceRedirectUrl: pathname,
    });
  }, [openSignIn, pathname]);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    open();
    return () => closeSignIn();
  }, [isLoaded, isSignedIn, open, closeSignIn]);

  // 모달을 닫은 경우 다시 열 수 있는 버튼
  return (
    <button
      type="button"
      onClick={open}
      disabled={!isLoaded}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      로그인
    </button>
  );
}
