# AI 뉴스 수집기

해외 AI 뉴스를 RSS로 수집해 Claude가 한국어로 번역·요약하고, 카테고리별 카드로 보여주는 개인용 웹앱입니다. 보관하고 싶은 기사는 카드의 `Notion 저장` 버튼으로 Notion 데이터베이스에 저장합니다.

## 주요 기능

- **로그인 제한:** Clerk로 로그인하며, 허용한 이메일 1개만 접근할 수 있습니다.
- **뉴스 가져오기:** 두 RSS에서 최근 24시간 안에 발행된 기사를 소스당 최대 20건 가져옵니다. 같은 URL은 한 번만 저장합니다.
- **번역과 분류:** 가져올 때 제목을 한국어로 번역하고 카테고리를 정합니다. 한 번에 최신순 40건까지 처리합니다.
- **요약:** 카드를 처음 열 때 RSS 발췌로 요약을 만들어 저장합니다. 원문 본문은 읽지 않습니다.
- **카테고리 관리:** 카테고리를 추가·수정·삭제할 수 있습니다. 삭제한 카테고리의 기사는 `미분류`로 이동하며, 다시 분류할 수 있습니다.
- **Notion 저장:** 제목, 요약, 출처(원문 링크), 카테고리, 날짜를 저장합니다. 저장한 카드는 `✓ 저장됨`으로 표시합니다.

## 뉴스 소스

| 소스 | RSS |
|---|---|
| TechCrunch AI | https://techcrunch.com/category/artificial-intelligence/feed/ |
| The Verge AI | https://www.theverge.com/rss/ai-artificial-intelligence/index.xml |

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React, TypeScript, Tailwind CSS v4 |
| 인증 | Clerk |
| DB | Neon (Postgres), Drizzle ORM |
| 번역·요약·분류 | Claude API (`@anthropic-ai/sdk`) |
| Notion | 공식 호스티드 Notion MCP + OAuth (`@modelcontextprotocol/client` v2) |
| RSS | `rss-parser` |

## 시작하기

### 준비물

- Node.js 20.9 이상
- [Clerk](https://clerk.com) 애플리케이션
- [Neon](https://neon.com) 프로젝트
- Claude API를 사용할 수 있는 Anthropic 계정
- Notion 계정 (저장 기능을 사용할 때)

### 1. 설치

```bash
git clone https://github.com/haribo127/ai-news-app.git
cd ai-news-app
npm install
cp .env.example .env.local
```

### 2. 환경변수 설정

`.env.local`에 값을 채웁니다. 이 파일은 커밋하지 않습니다.

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 공개 키 |
| `CLERK_SECRET_KEY` | Clerk 비밀 키 |
| `ALLOWED_EMAIL` | 접근을 허용할 이메일 1개. Clerk의 기본 이메일이며 인증된 상태여야 합니다. |
| `DATABASE_URL` | Neon 연결 문자열 (pooled). 앱 쿼리에 사용합니다. |
| `DATABASE_URL_UNPOOLED` | Neon 연결 문자열 (direct). 마이그레이션에 사용합니다. |
| `ANTHROPIC_API_KEY` | Claude API 키. 로컬에서 `ant auth login` 프로필을 사용하면 비워 둡니다. |
| `NOTION_OAUTH_REDIRECT_URI` | 로컬에서는 `http://localhost:3000/api/notion/callback` |
| `TOKEN_ENCRYPTION_KEY` | Notion 토큰 암호화 키. base64로 인코딩한 32바이트 값입니다. |

암호화 키는 다음 명령으로 만듭니다.

```bash
openssl rand -base64 32
```

키를 잃거나 바꾸면 저장된 Notion 토큰을 읽을 수 없습니다. Notion 클라이언트는 앱이 자동으로 등록하므로 클라이언트 ID와 비밀값은 필요하지 않습니다.

### 3. 데이터베이스 준비

```bash
npm run db:migrate
```

`DATABASE_URL_UNPOOLED`가 가리키는 DB에 테이블을 만들고 기본 카테고리를 넣습니다. 실행하기 전에 대상 DB를 확인하세요.

### 4. 실행

```bash
npm run dev
```

http://localhost:3000/dashboard 를 열고 로그인한 뒤 `뉴스 가져오기`를 누릅니다.

## Notion 저장 사용법

1. 카드의 `Notion 저장`을 누릅니다.
2. 처음이라면 Notion 승인 화면으로 이동합니다. 승인하면 대시보드로 돌아옵니다.
3. 버튼을 다시 누르면 저장합니다. 요약이 없으면 먼저 만듭니다.

저장 대상이 없으면 첫 저장 때 `AI 뉴스` 데이터베이스를 워크스페이스의 비공개 페이지로 만듭니다.

| 속성 | 종류 | 내용 |
|---|---|---|
| 제목 | 제목 | 한국어 제목 (없으면 원문 제목) |
| 요약 | 텍스트 | 한국어 요약 |
| 출처 | URL | 원문 링크 |
| 카테고리 | 선택 | 카테고리 이름 (없으면 `미분류`) |
| 날짜 | 날짜 | 기사 발행 시각 |

현재 제한 사항:

- 기존 데이터베이스를 저장 대상으로 고르는 화면과 연결 해제 화면은 없습니다.
- Notion에서 행을 삭제해도 앱의 `✓ 저장됨` 표시는 유지됩니다.
- 저장한 뒤 바뀐 카테고리와 요약은 Notion에 반영하지 않습니다.
- 로컬 실행을 기준으로 만들었으며, 배포 설정은 다루지 않습니다.

## 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드한 앱 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run db:generate` | `src/db/schema.ts`의 변경분으로 마이그레이션 생성 |
| `npm run db:migrate` | `DATABASE_URL_UNPOOLED` 대상에 마이그레이션 적용 |

새 마이그레이션은 Neon 테스트 브랜치에서 먼저 확인한 뒤 production에 적용합니다.

## 프로젝트 구조

```
src/
├── app/                # 페이지, Server Action, API 라우트
├── components/         # 화면 컴포넌트
├── db/                 # Drizzle 스키마와 DB 연결
└── lib/
    ├── ai/             # 번역·분류·요약
    ├── article/        # 요약 생성과 캐시
    ├── notion/         # OAuth, 토큰 갱신, Notion 저장
    └── rss/            # RSS 수집
drizzle/                # 마이그레이션
docs/                   # 프로젝트 문서
```

## 보안

- 페이지의 데이터, API, Server Action은 로그인과 허용 이메일을 검사합니다.
- API 키와 Notion 토큰은 서버에서만 사용합니다.
- Notion 토큰은 AES-256-GCM으로 암호화해 저장합니다.

## 문서

- [요구사항 (PRD)](docs/PRD.md)
- [UI 가이드](docs/ui.md)
- [Notion 저장 구현 계획과 확인 내역](docs/notion-plan.md)

## 사용한 플러그인

- Frontend Design: UI 디자인 품질 향상
- commit-commands: 깃 워크플로 자동화
