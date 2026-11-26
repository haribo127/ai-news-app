import "server-only";
import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from "@modelcontextprotocol/client";
import { CLIENT_NAME, NOTION_MCP_URL } from "./config";
import { getAccessToken } from "./token";

// Notion 가이드가 권장하는 버전으로 고정한다.
const PROTOCOL_VERSION = "2026-07-28";

async function connect(accessToken: string) {
  const client = new Client(
    { name: CLIENT_NAME, version: "0.1.0" },
    { versionNegotiation: { mode: { pin: PROTOCOL_VERSION } } },
  );
  // OAuthClientProvider를 넘기면 SDK가 잠금 없이 갱신하므로 토큰만 전달한다.
  const transport = new StreamableHTTPClientTransport(new URL(NOTION_MCP_URL), {
    authProvider: { token: async () => accessToken },
  });
  try {
    await client.connect(transport);
  } catch (error) {
    await client.close();
    throw error;
  }
  return client;
}

/**
 * Notion MCP에 연결해 작업을 실행하고 연결을 닫는다.
 * 호출하는 쪽에서 접근 권한을 먼저 검사해야 한다.
 * 연결이 필요하면 NotionNotConnectedError를 던진다.
 */
export async function withNotionClient<T>(
  userId: string,
  run: (client: Client) => Promise<T>,
) {
  const accessToken = await getAccessToken(userId);
  let client: Client;
  try {
    client = await connect(accessToken);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    // 만료 전에 무효가 된 토큰은 한 번만 새로 받아 다시 연결한다.
    // 중복 쓰기를 막기 위해 작업(run)은 다시 실행하지 않는다.
    client = await connect(await getAccessToken(userId, accessToken));
  }

  try {
    return await run(client);
  } finally {
    await client.close();
  }
}
