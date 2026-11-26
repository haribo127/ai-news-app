import "server-only";
import type {
  StoredOAuthClientInformation,
  StoredOAuthTokens,
} from "@modelcontextprotocol/client";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notionConnections, notionOauthClients } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { getRedirectUri, PURPOSE } from "./config";

function clientKey(issuer: string) {
  return and(
    eq(notionOauthClients.issuer, issuer),
    eq(notionOauthClients.redirectUri, getRedirectUri()),
  );
}

export async function loadClient(
  issuer: string,
): Promise<StoredOAuthClientInformation | undefined> {
  const [row] = await db
    .select()
    .from(notionOauthClients)
    .where(clientKey(issuer));
  if (!row) return undefined;

  return {
    issuer,
    client_id: row.clientId,
    ...(row.clientSecretEncrypted && {
      client_secret: decrypt(row.clientSecretEncrypted, PURPOSE.clientSecret),
    }),
  };
}

export async function saveClient(
  issuer: string,
  client: StoredOAuthClientInformation,
) {
  const values = {
    clientId: client.client_id,
    clientSecretEncrypted: client.client_secret
      ? encrypt(client.client_secret, PURPOSE.clientSecret)
      : null,
  };
  await db
    .insert(notionOauthClients)
    .values({ issuer, redirectUri: getRedirectUri(), ...values })
    .onConflictDoUpdate({
      target: [notionOauthClients.issuer, notionOauthClients.redirectUri],
      set: values,
    });
}

export async function deleteClient(issuer: string) {
  await db.delete(notionOauthClients).where(clientKey(issuer));
}

/** 토큰 응답을 DB에 넣을 값으로 바꾼다. */
export function toTokenColumns(tokens: StoredOAuthTokens) {
  return {
    accessTokenEncrypted: encrypt(tokens.access_token, PURPOSE.accessToken),
    refreshTokenEncrypted: tokens.refresh_token
      ? encrypt(tokens.refresh_token, PURPOSE.refreshToken)
      : null,
    expiresAt:
      tokens.expires_in === undefined
        ? null
        : new Date(Date.now() + tokens.expires_in * 1000),
  };
}

/** 승인 직후의 토큰을 저장한다. 다시 연결해도 저장 대상(targetId)은 유지한다. */
export async function saveConnection(
  userId: string,
  issuer: string,
  tokens: StoredOAuthTokens,
) {
  const values = {
    ...toTokenColumns(tokens),
    issuer,
    refreshLockedUntil: null,
  };
  await db
    .insert(notionConnections)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: notionConnections.userId,
      set: { ...values, updatedAt: new Date() },
    });
}
