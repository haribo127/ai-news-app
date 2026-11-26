import "server-only";

export const NOTION_MCP_URL = "https://mcp.notion.com/mcp";

// Notion 승인 화면에 표시되는 이름
export const CLIENT_NAME = "AI 뉴스 수집기";

// 암호문의 용도 구분(src/lib/crypto.ts)
export const PURPOSE = {
  accessToken: "notion:access-token",
  refreshToken: "notion:refresh-token",
  clientSecret: "notion:client-secret",
  oauthCookie: "notion:oauth-cookie",
} as const;

export function getRedirectUri() {
  const uri = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  if (!uri) throw new Error("NOTION_OAUTH_REDIRECT_URI가 설정되지 않았습니다.");
  return uri;
}

/** OAuth·토큰 요청이 응답 없이 오래 걸리지 않게 제한 시간을 둔다. */
export function fetchWithTimeout(input: string | URL, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(10_000) });
}
