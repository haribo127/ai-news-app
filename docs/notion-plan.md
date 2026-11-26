# Notion 저장 구현 계획

작성일 2026-11-26. 요구사항은 `PRD.md` §5.5, 버튼 화면은 `ui.md` §5.4가 기준이다. 0~6단계는 코드를 작성했다. 2026-11-26에 앱에서 Notion 승인, MCP 접속(`2026-07-28` 고정), 기사 2건 저장(속성 5개)을 확인했다. §7의 나머지 항목은 남아 있다.

- 마이그레이션 `0003`, `0004`는 Neon 테스트 브랜치 `test-notion-migration`에서 SQL 적용을 확인한 뒤, 2026-11-26에 production에도 적용했다.
- 연결 전에 카드의 `Notion 저장`을 누르면 `/api/notion/connect`로 이동한다.
- 콜백은 `/dashboard?notion=connected|unverified|cancelled|error`로 보낸다. `unverified`는 토큰은 저장했지만 MCP 접속 확인에 실패한 상태다.

## 1. 결정 사항
| 항목 | 결정 |
|---|---|
| 저장 형태 | Notion 데이터베이스, 기사 1건 = 1행 |
| 버튼 이름 | `Notion 저장` 유지 |
| SDK | `@modelcontextprotocol/client` v2, 프로토콜 `2026-07-28` 고정 |
| 범위 | 로컬(`http://localhost:3000`) 우선. 배포 설정은 제외 |

## 2. 사용 흐름
1. `Notion 저장`을 누른다.
2. 연결 전이면 Notion 승인 화면으로 이동하고, 승인하면 `/dashboard`로 돌아온다. 자동 저장은 하지 않으며 버튼을 다시 누른다.
3. 요약이 없으면 만든 뒤 데이터베이스에 행을 추가한다.
4. 버튼이 `✓ 저장됨`으로 바뀐다. 새로고침해도 유지된다.

## 3. 데이터베이스 구성
| 속성 | 종류 | 값 |
|---|---|---|
| 제목 | 제목(Title) | `titleKo`, 없으면 `title` |
| 요약 | 텍스트 | `summaryKo` |
| 출처 | URL | 원문 링크 `url` |
| 카테고리 | 선택 | 카테고리 이름, 없으면 `미분류` |
| 날짜 | 날짜 | 기사 발행 시각 `publishedAt` |

- Notion 데이터베이스에는 제목 유형 속성이 반드시 하나 있으므로 `제목`을 그 유형으로 둔다.
- 매체 이름(`source`)은 저장하지 않는다. 페이지 본문은 비워 둔다.
- RSS에서 온 제목과 Claude 요약은 Markdown으로 해석되지 않게 처리한다.

**생성 방식(제안):** 첫 저장 때 앱이 `notion-create-database`로 `AI 뉴스` 데이터베이스를 만들고 데이터 소스 ID를 `notion_connections.target_id`에 저장한다. 링크 입력 화면이 필요 없고 속성이 코드와 어긋나지 않는다. 직접 만든 데이터베이스를 쓰려면 대상을 지정하는 수단이 추가로 필요하다.

**현재 저장 대상(2026-11-26):** 사용자가 직접 만든 `AI 뉴스 북마크`다. 속성 5개의 이름과 종류가 위 표와 같다. 처음에는 앱이 `AI 뉴스`를 자동 생성해 저장했으므로, 카테고리 옵션을 추가하고 production의 `target_id`를 직접 바꾼 뒤 저장했던 2건을 옮겼다. 앱에는 대상을 지정하는 화면이 없다. 대상 데이터베이스가 삭제되면(`object_not_found`) 앱은 `AI 뉴스`를 새로 만든다.

## 4. 구현 단계

### 0단계. 준비
- `TOKEN_ENCRYPTION_KEY`: `openssl rand -base64 32`로 만들어 `.env.local`에 넣는다.
- `NOTION_OAUTH_REDIRECT_URI=http://localhost:3000/api/notion/callback`
- `.env.example`에서 `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET`을 지운다(자동 등록 사용).
- `@modelcontextprotocol/client@2`를 설치한다(확인 시점 최신 2.4.0, Node 20 이상). v1 `@modelcontextprotocol/sdk`는 사용처가 없는지 확인하고 제거한다.
- `CLAUDE.md`의 기술 스택을 고친다.
- `AGENTS.md`에 따라 `node_modules/next/dist/docs/`의 Route Handler·쿠키 문서를 먼저 읽는다.

### 1단계. 스키마
| 대상 | 변경 | 이유 |
|---|---|---|
| `notion_oauth_clients` (신규) | `issuer`, `redirect_uri`, `client_id`, `client_secret_encrypted`(nullable), `created_at`. 기본 키 (`issuer`, `redirect_uri`) | 등록한 클라이언트 재사용. 토큰이 생기기 전에 저장해야 함 |
| `notion_connections` | `issuer`, `refresh_locked_until` 추가 | 발급처 확인, 동시 갱신 방지 |
| `notion_connections` | `access_token_encrypted`를 nullable로 | 연결이 만료돼 토큰을 지워도 `target_id` 유지 |
| `saved_to_notion` | `notion_page_id`를 nullable로 | 값이 없으면 '저장 중'. 중복 생성 방지 |

`npm run db:generate` 후 Neon 테스트 브랜치에서 확인하고 production에 적용한다.

### 2단계. OAuth 연결
| 파일 | 역할 |
|---|---|
| `src/lib/crypto.ts` | AES-256-GCM 암호화·복호화 |
| `src/lib/notion/oauth-provider.ts` | v2 `OAuthClientProvider` 구현(클라이언트·토큰은 DB, 검증값은 쿠키) |
| `src/app/api/notion/connect/route.ts` | 연결 시작, 승인 화면으로 이동 |
| `src/app/api/notion/callback/route.ts` | `state` 확인, 토큰 교환·저장 |

- 두 경로 모두 `getAccess()`를 먼저 호출한다.
- `state`, PKCE 검증값, discovery 상태는 암호화한 쿠키에 둔다(`httpOnly`, `SameSite=Lax`, 10분, 사용 후 삭제, 운영에서는 `Secure`).
- SDK는 `state`를 검증하지 않으므로 콜백에서 직접 비교한다. `iss`는 콜백의 `searchParams`를 SDK에 넘겨 검증한다.
- 토큰, 인가 코드는 로그에 남기지 않는다.

**확인:** 승인 후 DB에 암호문이 저장되고, 승인을 취소해도 오류 안내와 함께 대시보드로 돌아온다.

### 3단계. 토큰 갱신과 MCP 연결
`src/lib/notion/token.ts`, `src/lib/notion/client.ts`

- 만료가 가까우면 MCP 연결 전에 갱신한다.
- 갱신은 한 번에 하나만 실행한다. 현재 DB 드라이버(`neon-http`)에서는 대화형 트랜잭션을 쓰지 않고, `refresh_locked_until`을 조건부 `UPDATE ... RETURNING`으로 선점한다. 선점에 실패하면 잠시 후 새 토큰을 다시 읽는다.
- 새 액세스·리프레시 토큰은 한 번의 `UPDATE`로 저장한다.
- v2 transport는 401에서 스스로 갱신할 수 있어 잠금을 우회한다. 요청 처리 중에는 transport에 `OAuthClientProvider` 대신 액세스 토큰만 돌려주는 인증 객체를 넘기고, 갱신은 `token.ts`에서만 한다.
- `invalid_grant`면 토큰을 지우고 재연결을 요청한다. 일시 오류는 토큰을 지우지 않는다.

### 4단계. 도구 확인 (저장 코드를 쓰기 전)
2026-11-26에 Claude Code의 Notion MCP(호스티드)로 테스트 데이터베이스를 만들어 확인했다. **앱의 OAuth 연결로 확인한 것은 아니다.**

| 확인한 것 | 결과 |
|---|---|
| 상위 위치 없이 데이터베이스 생성 | 가능(워크스페이스의 비공개 페이지). 속성은 `CREATE TABLE` 형식으로 정의하고, 응답의 `collection://<ID>`가 데이터 소스 ID다 |
| 행 상위 지정 | `parent: { type: "data_source_id", data_source_id }` |
| `날짜` 값 | `date:날짜:start`와 `date:날짜:is_datetime = 1`. `+09:00`과 UTC 모두 같은 시각으로 저장된다 |
| 없는 선택 옵션 | 자동 추가되지 않고 `validation_error`. `ALTER COLUMN … SET SELECT(…)`로 먼저 추가한다. 목록에 넣은 기존 옵션은 색상을 생략해도 ID와 색상이 유지된다. 빠진 옵션은 삭제된다 |
| 옵션 이름의 따옴표 | `''`로 이스케이프한다 |
| Markdown 해석 | 제목·텍스트 속성 값이 서식으로 해석된다. 서식 기호를 `\`로 이스케이프하면 글자 그대로 남는다 |
| 페이지 ID | `notion-create-pages` 응답 JSON의 `pages[0].id` |
| 없는 데이터 소스 조회 | `object_not_found` 오류 |

확인하지 못한 것:
- 2,000자가 넘는 요약. 요약은 3~5문장이라 별도 처리를 하지 않았다.
- 휴지통에 있는 데이터베이스를 조회·저장할 때의 응답. 존재하지 않는 ID의 오류만 확인했다.
- 쉼표가 든 카테고리 이름은 시험하지 않았고, `·`로 치환해 보낸다.

테스트로 만든 `[테스트] AI 뉴스 저장 형식 확인` 데이터베이스(행 2개)는 지워도 된다.

### 5단계. 저장 API
`src/lib/notion/save-article.ts`, `src/app/api/articles/[id]/notion/route.ts` (`POST`, `maxDuration = 60`, 요약 라우트와 같은 권한·ID 검사)

1. 연결 확인. 없으면 `409 { code: "not_connected" }`.
2. 저장 기록 선점: `saved_to_notion`에 `notion_page_id = null`로 삽입. 완료 기록이 있으면 성공으로 응답하고, 진행 중이면 409로 응답한다.
3. `getSummary()`로 요약을 확보한다. 만들 수 없으면(발췌 없음 등) 저장하지 않는다.
4. 대상 데이터베이스가 없으면 만든다. 동시에 두 개가 생기지 않게 한다.
5. §3의 속성 5개로 행을 만들고 `notion_page_id`를 기록한다.
6. 실패하면 선점 기록을 지워 다시 시도할 수 있게 한다. 2분 넘게 '저장 중'인 기록은 다시 선점할 수 있다.

데이터베이스가 Notion에서 삭제된 경우에는 `target_id`를 지우고 같은 저장에서 다시 만든다. 일시 오류와 구분되는 응답(`object_not_found`)일 때만 적용한다. 동시 생성은 `notion_connections.target_locked_until`(마이그레이션 `0004`)로 막는다.

### 6단계. 화면
- `src/lib/dashboard.ts`: `saved_to_notion`을 join해 저장 여부를 가져온다(`notion_page_id`가 있을 때만 저장됨).
- `news-board.tsx`: 요약 요청처럼 저장 상태를 보관해 페이지·필터를 바꿔도 유지한다. 저장 중에 만들어진 요약도 카드에 반영한다(API가 요약을 함께 반환).
- `news-card.tsx`: `ui.md` §5.4의 네 상태를 적용한다. `not_connected`면 `/api/notion/connect`로 이동한다.
- 연결 성공·실패 안내 문구를 추가하고 `ui.md` §5.4, §7, §10을 갱신한다.

### 7단계. 검증
- `npm run lint`, `npm run build`
- [ ] 비로그인·비허용 계정은 세 API를 쓸 수 없다.
- [ ] 첫 클릭에서 연결 후 대시보드로 돌아온다.
- [ ] 저장하면 속성 5개가 채워진 행이 생긴다.
- [ ] `날짜`가 카드의 발행 시각(한국 시간)과 일치한다.
- [ ] 요약이 없던 기사도 저장되고 카드에 요약이 남는다.
- [ ] 연속 클릭, 두 탭 동시 저장에도 행은 1개다.
- [ ] 새로고침해도 `✓ 저장됨`이 유지된다.
- [ ] 새로 추가한 카테고리의 기사도 저장된다.
- [ ] DB의 `expires_at`을 과거로 바꿔도 갱신 후 저장된다.
- [ ] 저장 토큰을 무효로 만들면 재연결을 안내하고, 재연결 후 기존 데이터베이스를 쓴다.

## 5. 이번 범위에서 제외
- 배포 환경 설정(HTTPS redirect URI 등록)
- 연결 해제 화면, 저장 대상 변경 화면
- Notion에서 삭제한 행의 감지와 재저장
- 저장한 뒤 바뀐 카테고리·요약의 동기화

## 6. 남는 위험
- Notion에 행을 만든 직후 DB 기록에 실패하면, 다시 저장할 때 행이 중복될 수 있다.
- 리프레시 토큰은 최대 180일이며 더 일찍 끝날 수 있어 재연결이 필요하다.
- 워크스페이스 관리자 설정이나 요금제에 따라 일부 도구가 제한될 수 있다(`notion-get-tool-access`로 확인).

## 7. 참고
- https://developers.notion.com/guides/mcp/build-mcp-client
- https://developers.notion.com/guides/mcp/tools-pages-reference
- https://developers.notion.com/guides/mcp/tools-faqs
- https://ts.sdk.modelcontextprotocol.io/v2/
