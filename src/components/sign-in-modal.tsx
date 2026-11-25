"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useCallback, useEffect } from "react";

/** 로그인하지 않은 방문자에게 로그인 모달을 바로 띄운다. */
export function SignInModal() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn, closeSignIn } = useClerk();

  const open = useCallback(() => {
    openSignIn({ forceRedirectUrl: "/", signUpForceRedirectUrl: "/" });
  }, [openSignIn]);

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
      className="rounded-full bg-foreground px-6 py-3 font-medium text-background disabled:opacity-50"
    >
      로그인
    </button>
  );
}
