@AGENTS.md

# AI 뉴스 수집기

해외 AI 뉴스를 RSS로 수집해 Claude가 한국어로 번역·요약하고, 카테고리별 카드로 보여주는 개인용 웹앱. 카드의 버튼으로 Notion에 저장한다. 상세 요구사항은 `docs/PRD.md`가 기준이다. 프로젝트 문서는 `docs/`에 둔다.

## UI 가이드
- 화면이나 컴포넌트를 만들거나 수정하기 전에 `docs/ui.md`를 먼저 읽고 따른다.
- 색상·타이포그래피·간격은 가이드의 토큰과 클래스를 사용한다. 가이드에 없는 스타일이 필요하면 `docs/ui.md`도 함께 갱신한다.

## 기술 스택
- Next.js (App Router, `src/` 구조, alias `@/*`), TypeScript, Tailwind
- 인증: Clerk (허용 이메일 1개만 접근 가능, allowlist)
- DB: Neon(Postgres) + Drizzle ORM (`@neondatabase/serverless`, `drizzle-kit`)
- 번역/요약/분류: Claude API (`@anthropic-ai/sdk`), 분류는 경량 모델
- Notion: 공식 호스티드 Notion MCP + OAuth (`@modelcontextprotocol/sdk`)
- RSS: `rss-parser`

## 명령어
- `npm run dev` / `npm run build` / `npm run lint`
- `npm run db:generate`(`src/db/schema.ts` 변경분으로 마이그레이션 생성) / `npm run db:migrate`(`DATABASE_URL_UNPOOLED` 대상에 적용). 새 마이그레이션은 Neon 테스트 브랜치에서 먼저 확인한 뒤 production에 적용한다.
- 환경변수는 `.env.example` 참고, 실제 값은 `.env.local`에 둔다(커밋 금지).

## 뉴스 소스
- TechCrunch AI: https://techcrunch.com/category/artificial-intelligence/feed/
- The Verge AI: https://www.theverge.com/rss/ai-artificial-intelligence/index.xml

## 데이터 모델
- `categories`: id, name, description, createdAt
- `articles`: id, url(unique), source, title, author(nullable), excerpt, publishedAt, categoryId(nullable), titleKo, summaryKo(nullable), fetchedAt
- `notion_connections`: OAuth 토큰/refresh 토큰(암호화), 저장 대상 id
- `saved_to_notion`: articleId, notionPageId, savedAt

## 핵심 규칙
- 모든 페이지·API는 로그인 + 허용 이메일 검사를 통과해야 한다. 비로그인/비허용 계정은 차단.
- 가져오기: 두 RSS 병렬 수집, 지난 24시간 발행분만 대상, URL 기준 중복 제거 후 신규만 저장, 소스당 상한 20건. 일부 소스가 실패해도 나머지는 저장한다.
- 분류: 신규 기사 전체를 배치 1회 Claude 호출로 처리(서버리스 타임아웃 고려). 카테고리 `description`을 프롬프트에 사용.
- 번역·요약: 카드를 열 때 생성하고 `summaryKo`에 캐시. 캐시가 있으면 Claude를 재호출하지 않는다.
- 카테고리: 기본 세트(모델/연구, 제품/서비스, 투자/비즈니스, 규제/정책, 기타). 추가·수정·삭제 가능, 삭제 시 소속 기사는 '미분류'(categoryId null)로 이동, 미분류 재분류 기능 제공.
- Notion 저장: 요약이 없으면 먼저 생성 후 저장, `saved_to_notion`으로 중복 저장 방지.
- 목록은 발행 시각 최신순, 한 페이지에 카드 9개.

## 보안
- API 키와 Notion 토큰은 서버에서만 사용한다(클라이언트 번들 노출 금지). 토큰은 암호화 저장.
- 환경변수: Clerk 키, `DATABASE_URL`, `ANTHROPIC_API_KEY`, Notion OAuth 정보, 토큰 암호화 키, 허용 이메일.

## 구현 단계 (docs/PRD.md §10)
1. 스캐폴딩 + Clerk 로그인 + allowlist
2. Neon/Drizzle 스키마·마이그레이션
3. RSS 수집 + 분류 + 카드 목록/필터
4. 지연 번역·요약
5. 카테고리 CRUD
6. Notion MCP 연결 및 저장

현재 진행: 1~2단계 완료(Clerk 로그인·allowlist, DB 스키마·마이그레이션을 production에 적용). 3~4단계는 코드 작성 완료(RSS 수집, 카드 목록/필터, 가져올 때 제목 번역·분류, 카드를 열 때 요약). 남은 것은 앱에서의 전체 흐름 확인이다. 요약은 RSS 발췌만으로 만든다. 5단계는 코드 작성 완료(카테고리 추가·수정·삭제, 미분류 재분류).

## 미결 사항
- Notion 호스티드 MCP의 OAuth 흐름은 구현 시 최신 문서를 확인한다.
- 지금은 RSS 발췌만으로 요약한다. 품질이 낮으면 원문 본문 fetch를 다시 검토한다. 도입할 때는 발췌로 만든 `summaryKo` 캐시를 다시 만들지 정한다.
