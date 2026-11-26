import "server-only";
import { randomBytes } from "node:crypto";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/client";
import { CLIENT_NAME, getRedirectUri } from "./config";
import { deleteClient, loadClient, saveClient, saveConnection } from "./store";

/** 승인 화면에 다녀오는 동안 보관해야 하는 값 */
export type PendingAuthorization = {
  state: string;
  codeVerifier: string;
  discoveryState: OAuthDiscoveryState;
};

/**
 * 연결(승인) 흐름에서만 쓰는 OAuth 제공자.
 * 저장된 토큰은 SDK에 넘기지 않는다. 갱신은 token.ts에서만 한다.
 */
export function createConnectProvider(
  userId: string,
  pending: Partial<PendingAuthorization> = {},
) {
  let authorizationUrl: URL | undefined;
  let issuer = pending.discoveryState?.authorizationServerMetadata?.issuer;

  const provider: OAuthClientProvider = {
    get redirectUrl() {
      return getRedirectUri();
    },
    get clientMetadata() {
      return {
        client_name: CLIENT_NAME,
        redirect_uris: [getRedirectUri()],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },
    state() {
      pending.state = randomBytes(32).toString("base64url");
      return pending.state;
    },
    clientInformation(ctx) {
      if (!ctx) return undefined;
      issuer = ctx.issuer;
      return loadClient(ctx.issuer);
    },
    async saveClientInformation(client, ctx) {
      const clientIssuer = ctx?.issuer ?? client.issuer;
      if (!clientIssuer) throw new Error("클라이언트의 발급처를 알 수 없습니다.");
      await saveClient(clientIssuer, client);
    },
    tokens() {
      return undefined;
    },
    async saveTokens(tokens, ctx) {
      const tokenIssuer = ctx?.issuer ?? tokens.issuer;
      if (!tokenIssuer) throw new Error("토큰의 발급처를 알 수 없습니다.");
      await saveConnection(userId, tokenIssuer, tokens);
    },
    redirectToAuthorization(url) {
      authorizationUrl = url;
    },
    saveCodeVerifier(codeVerifier) {
      pending.codeVerifier = codeVerifier;
    },
    codeVerifier() {
      if (!pending.codeVerifier) throw new Error("PKCE 검증값이 없습니다.");
      return pending.codeVerifier;
    },
    saveDiscoveryState(discoveryState) {
      pending.discoveryState = discoveryState;
    },
    discoveryState() {
      return pending.discoveryState;
    },
    async invalidateCredentials(scope) {
      // Notion이 등록한 클라이언트를 거부하면 지워서 다음 연결 때 다시 등록한다.
      if ((scope === "client" || scope === "all") && issuer) {
        await deleteClient(issuer);
      }
    },
  };

  return {
    provider,
    /** auth()가 'REDIRECT'를 반환한 뒤에 호출한다. */
    getRedirect() {
      const { state, codeVerifier, discoveryState } = pending;
      if (!authorizationUrl || !state || !codeVerifier || !discoveryState) {
        throw new Error("Notion 승인 정보를 만들지 못했습니다.");
      }
      return {
        authorizationUrl,
        pending: { state, codeVerifier, discoveryState },
      };
    },
  };
}
