# PRD: AI 뉴스 수집기

## 1. 개요
해외 AI 뉴스를 RSS로 수집해 Claude가 한국어로 번역·요약하고, 카테고리별 카드 형태로 보여주는 개인용 웹앱. 마음에 드는 뉴스는 카드의 버튼으로 Notion에 저장한다.

## 2. 목표
- 영문 AI 뉴스를 한국어로 빠르게 훑어볼 수 있다.
- 자동 분류된 카테고리로 관심 주제만 골라 본다.
- 필요한 기사를 Notion에 한 번의 클릭으로 보관한다.

## 3. 사용자
- 개인용(본인 1명). Clerk 가입이 열려 있어도 허용된 이메일 1개만 접근을 허용한다(allowlist).

## 4. 뉴스 소스
| 소스 | RSS |
|---|---|
| TechCrunch AI | https://techcrunch.com/category/artificial-intelligence/feed/ |
| The Verge AI | https://www.theverge.com/rss/ai-artificial-intelligence/index.xml |

## 5. 기능 요구사항
### 5.1 로그인
- 앱 실행 시 Clerk 로그인이 필요하다. 비로그인 및 비허용 계정은 접근할 수 없다.

### 5.2 뉴스 가져오기
- '뉴스 가져오기' 버튼 클릭 시 두 RSS를 병렬로 수집한다.
- 버튼을 누른 시각에서 지난 24시간 안에 발행된 기사만 대상으로 한다. RSS에 날짜가 없으면 수집 시각을 발행 시각으로 본다.
- URL 기준으로 중복을 제거하고 신규 기사만 저장한다.
- 신규 기사는 제목+RSS 발췌를 Claude(경량 모델)에 넘겨 제목 번역과 카테고리 분류를 한 번에 한다.
- 번역·분류에 실패해도 기사는 저장하고, 번역 전인 기사는 다음 가져오기에서 최신순 최대 40건씩 다시 처리한다.
- 소스당 기사 수 상한을 둔다(예: 20건).

### 5.3 뉴스 카드
- 표시: 한국어 제목, 요약, 출처, 발행 시각, 카테고리, 원문 링크, 'Notion 저장' 버튼.
- 요약은 카드를 열 때 생성하고 DB에 캐시한다(재요청 시 Claude 재호출 없음).
- 최신순 정렬.
- 한 페이지에 카드를 9개씩 보여주고 페이지를 나눈다.

### 5.4 카테고리
- 기본 세트: 모델/연구, 제품/서비스, 투자/비즈니스, 규제/정책, 기타.
- 카테고리별 필터링 조회.
- 추가, 이름·설명 수정, 삭제 가능. 설명은 분류 프롬프트에 사용된다.
- 삭제 시 소속 기사는 '미분류'로 이동한다. 미분류 기사 재분류 기능을 제공한다.

### 5.5 Notion 저장
- 최초 1회 Notion OAuth 연결(공식 호스티드 Notion MCP).
- 카드의 'Notion 저장' 클릭 시 MCP 클라이언트로 페이지를 생성한다(제목, 요약, 원문 링크, 카테고리, 출처).
- 요약이 아직 없으면 먼저 생성한 뒤 저장한다.
- 저장 완료 표시, 중복 저장 방지.

## 6. 기술 스택
- 프레임워크: Next.js (App Router)
- 인증: Clerk
- DB: Neon(Postgres) + Drizzle ORM
- 번역/요약/분류: Claude API
- Notion: Notion MCP 서버(호스티드, OAuth)
- RSS 파싱: rss-parser

## 7. 데이터 모델
- `categories`: id, name, description, createdAt
- `articles`: id, url(unique), source, title, author(nullable), excerpt, publishedAt, categoryId(nullable), titleKo, summaryKo(nullable), fetchedAt
- `notion_connections`: OAuth 토큰/refresh 토큰(암호화), 저장 대상 id
- `saved_to_notion`: articleId, notionPageId, savedAt

## 8. 주요 흐름
1. 로그인 → 메인 화면(카드 목록).
2. 뉴스 가져오기 → 수집 → 중복 제거 → 분류 → 저장 → 목록 갱신.
3. 카테고리 선택 → 해당 기사만 표시.
4. 카드 열기 → 번역·요약 생성/캐시 표시.
5. Notion 저장 → (미연결 시 OAuth) → 페이지 생성 → 저장 표시.

## 9. 비기능 요구사항
- 서버리스 타임아웃을 고려해 분류는 배치 1회 호출로 처리한다.
- API 키와 Notion 토큰은 서버에만 두고 토큰은 암호화 저장한다.
- 환경변수: Clerk 키, `DATABASE_URL`, `ANTHROPIC_API_KEY`, Notion OAuth 정보, 토큰 암호화 키, 허용 이메일.

## 10. 구현 단계
1. 스캐폴딩 + Clerk 로그인 + allowlist
2. Neon/Drizzle 스키마·마이그레이션
3. RSS 수집 + 분류 + 카드 목록/필터
4. 지연 번역·요약
5. 카테고리 CRUD
6. Notion MCP 연결 및 저장

## 11. 리스크 / 미결 사항
- Notion 호스티드 MCP의 OAuth 흐름은 구현 시 최신 문서 확인이 필요하다.
- 요약은 RSS 발췌만으로 만든다(원문 본문은 읽지 않는다). 발췌가 짧아 요약 품질이 낮을 수 있으며, 필요하면 원문 본문 fetch를 다시 검토한다.

## 12. 검증 기준
- 비로그인/비허용 계정 접근 차단.
- 가져오기를 연속 2회 실행해도 중복 저장이 없다.
- 카테고리 필터와 추가/수정/삭제가 동작하고, 삭제 후 기사가 '미분류'로 이동한다.
- 카드 열기 시 요약이 1회만 생성되고 이후는 캐시를 사용한다.
- Notion 저장 시 실제 페이지가 생성되고 재클릭해도 중복 생성되지 않는다.
