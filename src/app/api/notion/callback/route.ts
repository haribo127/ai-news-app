import {
  auth,
  validateAuthorizationResponseIssuer,
} from "@modelcontextprotocol/client";
import { NextResponse, type NextRequest } from "next/server";
import { getAccess } from "@/lib/auth";
import { withNotionClient } from "@/lib/notion/client";
import { fetchWithTimeout, NOTION_MCP_URL } from "@/lib/notion/config";
import {
  OAUTH_COOKIE,
  oauthCookieOptions,
  openPending,
} from "@/lib/notion/oauth-cookie";
import { createConnectProvider } from "@/lib/notion/oauth-provider";

type Result = "connected" | "unverified" | "cancelled" | "error";

/** Notion 승인 후 돌아오는 주소. 토큰을 저장하고 대시보드로 보낸다. */
export async function GET(request: NextRequest) {
  const access = await getAccess();
  if (access.status !== "allowed") {
    return Response.json(
      { error: "접근 권한이 없습니다." },
      { status: access.status === "signed-out" ? 401 : 403 },
    );
  }

  const result = await completeAuthorization(request, access.userId);
  const response = NextResponse.redirect(
    new URL(`/dashboard?notion=${result}`, request.url),
  );
  // 승인 정보는 한 번만 쓴다.
  response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions(), maxAge: 0 });
  return response;
}

async function completeAuthorization(
  request: NextRequest,
  userId: string,
): Promise<Result> {
  const params = request.nextUrl.searchParams;

  try {
    const pending = openPending(
      request.cookies.get(OAUTH_COOKIE)?.value,
      userId,
    );
    // SDK는 state를 검사하지 않는다.
    if (!pending || params.get("state") !== pending.state) {
      console.error("Notion 연결 실패: 승인 정보가 없거나 state가 다릅니다.");
      return "error";
    }

    // 오류 응답도 발급처(iss)를 확인한 뒤에 처리한다.
    const metadata = pending.discoveryState.authorizationServerMetadata;
    validateAuthorizationResponseIssuer({
      iss: params.get("iss") ?? undefined,
      expectedIssuer: metadata?.issuer,
      issParameterSupported:
        metadata !== undefined &&
        "authorization_response_iss_parameter_supported" in metadata &&
        metadata.authorization_response_iss_parameter_supported === true,
    });

    const error = params.get("error");
    if (error) return error === "access_denied" ? "cancelled" : "error";

    const code = params.get("code");
    if (!code) return "error";

    const { provider } = createConnectProvider(userId, pending);
    await auth(provider, {
      serverUrl: NOTION_MCP_URL,
      authorizationCode: code,
      iss: params.get("iss") ?? undefined,
      fetchFn: fetchWithTimeout,
    });
  } catch (error) {
    console.error("Notion 연결 실패", error);
    return "error";
  }

  // 토큰으로 MCP에 실제로 접속되는지 확인한다.
  try {
    const { tools } = await withNotionClient(userId, (client) =>
      client.listTools(),
    );
    console.info(
      `Notion MCP 연결 확인: 도구 ${tools.length}개`,
      tools.map(({ name }) => name).join(", "),
    );
    return "connected";
  } catch (error) {
    console.error("Notion MCP 접속 확인 실패", error);
    return "unverified";
  }
}
