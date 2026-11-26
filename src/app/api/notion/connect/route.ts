import { auth } from "@modelcontextprotocol/client";
import { NextResponse, type NextRequest } from "next/server";
import { getAccess } from "@/lib/auth";
import { fetchWithTimeout, NOTION_MCP_URL } from "@/lib/notion/config";
import {
  OAUTH_COOKIE,
  oauthCookieOptions,
  sealPending,
} from "@/lib/notion/oauth-cookie";
import { createConnectProvider } from "@/lib/notion/oauth-provider";

/** Notion 승인 화면으로 보낸다. */
export async function GET(request: NextRequest) {
  const access = await getAccess();
  if (access.status !== "allowed") {
    return Response.json(
      { error: "접근 권한이 없습니다." },
      { status: access.status === "signed-out" ? 401 : 403 },
    );
  }

  try {
    const { provider, getRedirect } = createConnectProvider(access.userId);
    await auth(provider, {
      serverUrl: NOTION_MCP_URL,
      forceReauthorization: true,
      fetchFn: fetchWithTimeout,
    });
    const { authorizationUrl, pending } = getRedirect();
    authorizationUrl.searchParams.set("prompt", "consent");

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      OAUTH_COOKIE,
      sealPending(access.userId, pending),
      oauthCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("Notion 연결 시작 실패", error);
    return NextResponse.redirect(new URL("/dashboard?notion=error", request.url));
  }
}
