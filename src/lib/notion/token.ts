import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import {
  discoverOAuthServerInfo,
  OAuthError,
  OAuthErrorCode,
  refreshAuthorization,
} from "@modelcontextprotocol/client";
import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { notionConnections } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { fetchWithTimeout, NOTION_MCP_URL, PURPOSE } from "./config";
import { deleteClient, loadClient, toTokenColumns } from "./store";

/** 연결한 적이 없거나 다시 승인해야 한다. */
export class NotionNotConnectedError extends Error {
  constructor() {
    super("Notion 연결이 필요합니다.");
    this.name = "NotionNotConnectedError";
  }
}

// 만료까지 이 시간보다 적게 남으면 미리 갱신한다.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// 갱신 요청의 제한 시간(10초)보다 길어야 한다.
const LOCK_MS = 30 * 1000;
const WAIT_MS = 500;
const MAX_ATTEMPTS = 30;

type Connection = typeof notionConnections.$inferSelect;

async function loadConnection(userId: string) {
  const [row] = await db
    .select()
    .from(notionConnections)
    .where(eq(notionConnections.userId, userId));
  return row;
}

/** 갱신하지 않고 그대로 쓸 수 있는 액세스 토큰. 없으면 null */
function usableToken(row: Connection, rejectedToken: string | undefined) {
  if (!row.accessTokenEncrypted) throw new NotionNotConnectedError();
  if (
    row.expiresAt &&
    row.expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS
  ) {
    return null;
  }
  const token = decrypt(row.accessTokenEncrypted, PURPOSE.accessToken);
  return token === rejectedToken ? null : token;
}

/**
 * 사용할 수 있는 액세스 토큰을 반환한다. 필요하면 갱신한다.
 * Notion이 거부한 토큰은 rejectedToken으로 넘겨 새로 받는다.
 */
export async function getAccessToken(userId: string, rejectedToken?: string) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const row = await loadConnection(userId);
    if (!row) throw new NotionNotConnectedError();
    const token = usableToken(row, rejectedToken);
    if (token) return token;

    const refreshed = await tryRefresh(userId, rejectedToken);
    if (refreshed) return refreshed;
    // 다른 요청이 갱신하는 중이다. 잠시 후 결과를 다시 읽는다.
    await sleep(WAIT_MS);
  }
  throw new Error("Notion 토큰 갱신을 기다리다 시간이 초과됐습니다.");
}

/**
 * 잠금을 잡고 토큰을 갱신한다. 잠금을 잡지 못하면 null.
 * Notion은 갱신할 때마다 리프레시 토큰을 바꾸고, 이전 토큰을 다시 쓰면
 * 연결 전체를 해제할 수 있으므로 갱신은 한 번에 하나만 실행한다.
 */
async function tryRefresh(userId: string, rejectedToken: string | undefined) {
  // 잠금을 오래 잡지 않도록 서버 정보는 먼저 읽는다.
  const server = await discoverOAuthServerInfo(NOTION_MCP_URL, {
    fetchFn: fetchWithTimeout,
  });

  const lockedUntil = new Date(Date.now() + LOCK_MS);
  const [row] = await db
    .update(notionConnections)
    .set({ refreshLockedUntil: lockedUntil })
    .where(
      and(
        eq(notionConnections.userId, userId),
        isNotNull(notionConnections.accessTokenEncrypted),
        or(
          isNull(notionConnections.refreshLockedUntil),
          lt(notionConnections.refreshLockedUntil, new Date()),
        ),
      ),
    )
    .returning();
  if (!row) return null;

  try {
    // 잠금을 잡기 전에 다른 요청이 갱신을 마쳤을 수 있다.
    const current = usableToken(row, rejectedToken);
    if (current) return current;
    return await refresh(row, server);
  } finally {
    await db
      .update(notionConnections)
      .set({ refreshLockedUntil: null })
      .where(
        and(
          eq(notionConnections.userId, userId),
          eq(notionConnections.refreshLockedUntil, lockedUntil),
        ),
      );
  }
}

async function refresh(
  row: Connection,
  server: Awaited<ReturnType<typeof discoverOAuthServerInfo>>,
) {
  const { refreshTokenEncrypted, issuer } = row;
  const metadata = server.authorizationServerMetadata;
  if (!metadata) throw new Error("Notion 인가 서버 정보를 읽지 못했습니다.");

  // 읽은 뒤에 다시 연결됐다면 새 토큰은 건드리지 않는다.
  const unchanged = and(
    eq(notionConnections.userId, row.userId),
    refreshTokenEncrypted
      ? eq(notionConnections.refreshTokenEncrypted, refreshTokenEncrypted)
      : isNull(notionConnections.refreshTokenEncrypted),
  );
  const disconnect = async () => {
    await db
      .update(notionConnections)
      .set({
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        expiresAt: null,
      })
      .where(unchanged);
    return new NotionNotConnectedError();
  };

  // 발급처가 다른 서버에는 리프레시 토큰을 보내지 않는다.
  const client =
    issuer === metadata.issuer ? await loadClient(metadata.issuer) : undefined;
  if (!refreshTokenEncrypted || !client) throw await disconnect();

  const refreshToken = decrypt(refreshTokenEncrypted, PURPOSE.refreshToken);
  let tokens;
  try {
    tokens = await refreshAuthorization(server.authorizationServerUrl, {
      metadata,
      clientInformation: client,
      refreshToken,
      resource: server.resourceMetadata?.resource,
      fetchFn: fetchWithTimeout,
    });
  } catch (error) {
    // 일시 오류면 토큰을 남겨 두고 다음 요청에서 다시 시도한다.
    if (!(error instanceof OAuthError)) throw error;
    if (error.code === OAuthErrorCode.InvalidClient) {
      await deleteClient(metadata.issuer);
      throw await disconnect();
    }
    if (error.code === OAuthErrorCode.InvalidGrant) throw await disconnect();
    throw error;
  }

  // 새 액세스·리프레시 토큰은 한 번에 저장한다.
  await db
    .update(notionConnections)
    .set(toTokenColumns(tokens))
    .where(unchanged);
  return tokens.access_token;
}
