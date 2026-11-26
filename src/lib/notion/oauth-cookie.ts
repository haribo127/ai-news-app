import "server-only";
import { decrypt, encrypt } from "@/lib/crypto";
import { getRedirectUri, PURPOSE } from "./config";
import type { PendingAuthorization } from "./oauth-provider";

export const OAUTH_COOKIE = "notion_oauth";
const MAX_AGE_SECONDS = 10 * 60;

type CookiePayload = PendingAuthorization & {
  userId: string;
  expiresAt: number;
};

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    // Notion에서 돌아오는 최상위 이동에는 Lax 쿠키가 실린다.
    sameSite: "lax" as const,
    secure: getRedirectUri().startsWith("https:"),
    path: "/api/notion",
    maxAge: MAX_AGE_SECONDS,
  };
}

export function sealPending(userId: string, pending: PendingAuthorization) {
  const payload: CookiePayload = {
    ...pending,
    userId,
    expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  return encrypt(JSON.stringify(payload), PURPOSE.oauthCookie);
}

/** 값이 없거나 변조·만료됐거나 다른 사용자의 것이면 null */
export function openPending(value: string | undefined, userId: string) {
  if (!value) return null;
  try {
    const payload = JSON.parse(
      decrypt(value, PURPOSE.oauthCookie),
    ) as CookiePayload;
    if (payload.userId !== userId || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
