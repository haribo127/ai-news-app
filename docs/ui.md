# UI 가이드: AI 뉴스 수집기

화면을 만들 때 따르는 기준이다. 기능 요구사항은 [PRD.md](./PRD.md)가 우선한다.
이 문서는 **목표 디자인**이며, 아직 코드에 반영되지 않은 항목이 있다(§10 참고).

## 1. 디자인 원칙

1. **읽기가 먼저다.** 제목과 요약이 가장 눈에 띄고, 출처·시각 같은 메타 정보는 한 단계 약하게 표시한다.
2. **장식을 줄인다.** 여백과 얇은 테두리로 구분한다. 그라데이션과 큰 그림자는 쓰지 않는다.
3. **강조색은 하나만 쓴다.** 선택 상태, 주요 버튼, 포커스 표시에만 사용한다.
4. **상태를 항상 보여준다.** 불러오기, 비어 있음, 실패, 저장 완료를 화면에 표시한다.

앱 이름은 화면과 메타데이터에서 **AI 뉴스 수집기**로 표기한다.

## 2. 디자인 토큰

Tailwind CSS v4를 사용한다. 설정 파일 없이 `src/app/globals.css`의 `@theme`에 토큰을 정의한다.

### 2.1 색상

컴포넌트에서는 `bg-white`, `text-gray-500` 같은 고정 색 대신 아래 토큰을 쓴다. 라이트·다크 모드는 시스템 설정(`prefers-color-scheme`)을 따르고, 토큰 값만 바뀌므로 `dark:` 클래스는 필요 없다.

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `background` | `#f8fafc` | `#0b0f17` | 페이지 배경 |
| `surface` | `#ffffff` | `#151b26` | 헤더, 카드, 대화상자 |
| `foreground` | `#0f172a` | `#e5e7eb` | 제목, 본문 |
| `body` | `#334155` | `#bcc5d3` | 카드 요약 본문 |
| `muted` | `#475569` | `#9ca3af` | 메타 정보, 보조 설명 |
| `border` | `#e2e8f0` | `#273041` | 테두리, 구분선 |
| `border-strong` | `#94a3b8` | `#4b5a73` | hover·포커스·펼침 상태의 카드 테두리 |
| `accent` | `#2563eb` | `#60a5fa` | 주요 버튼, 링크, 포커스 링 |
| `accent-foreground` | `#ffffff` | `#0b0f17` | `accent` 배경 위의 글자 |
| `accent-soft` | `#eff6ff` | `#172a46` | 카테고리 배지 배경 |
| `danger` | `#b91c1c` | `#f87171` | 삭제, 오류 |
| `success` | `#15803d` | `#4ade80` | 저장 완료 |

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --background: #f8fafc;
  --surface: #ffffff;
  --foreground: #0f172a;
  --body: #334155;
  --muted: #475569;
  --border: #e2e8f0;
  --border-strong: #94a3b8;
  --accent: #2563eb;
  --accent-foreground: #ffffff;
  --accent-soft: #eff6ff;
  --danger: #b91c1c;
  --success: #15803d;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --background: #0b0f17;
    --surface: #151b26;
    --foreground: #e5e7eb;
    --body: #bcc5d3;
    --muted: #9ca3af;
    --border: #273041;
    --border-strong: #4b5a73;
    --accent: #60a5fa;
    --accent-foreground: #0b0f17;
    --accent-soft: #172a46;
    --danger: #f87171;
    --success: #4ade80;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-foreground: var(--foreground);
  --color-body: var(--body);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent-soft: var(--accent-soft);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --font-sans: var(--font-geist-sans), "Apple SD Gothic Neo", "Malgun Gothic",
    "Noto Sans KR", sans-serif;
  --font-mono: var(--font-geist-mono), monospace;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}
```

### 2.2 타이포그래피

영문과 숫자는 Geist, 한글은 시스템 글꼴을 쓴다.

| 요소 | 클래스 |
|---|---|
| 앱 이름 | `text-lg font-semibold tracking-tight` |
| 화면·대화상자 제목 | `text-xl font-semibold` |
| 카드 제목 | `text-lg font-semibold leading-[1.45] tracking-[-0.01em] text-balance` |
| 요약 본문 | `text-[15px] leading-7 text-body` |
| 카드 출처·시각, 원문 제목 | `text-[13px] leading-5` (출처는 `font-semibold`, 시각과 원문 제목은 `text-muted`) |
| 버튼, 카테고리 칩 | `text-sm font-medium` |
| 메타 정보, 배지 | `text-xs` |

- 한글은 단어 중간에서 줄이 바뀌지 않도록 제목과 본문에 `break-keep`을 쓴다. 긴 영문이나 URL이 넘치지 않도록 `wrap-anywhere`를 함께 쓴다.
- 본문 글자는 `text-xs`보다 작게 만들지 않는다.

### 2.3 간격과 모양

| 항목 | 값 |
|---|---|
| 콘텐츠 최대 폭 | `max-w-6xl` |
| 좌우 여백 | `px-4 sm:px-6` |
| 카드 사이 간격 | `gap-4` |
| 카드 안쪽 여백 | `p-5` |
| 카드·대화상자 모서리 | `rounded-xl` |
| 버튼·입력창 모서리 | `rounded-lg` |
| 칩·배지 모서리 | `rounded-full` |
| 그림자 | 기본 없음, 카드 hover에만 `shadow-md` |

## 3. 화면 구조

메인 화면은 뉴스 카드 대시보드다. 위에서부터 **헤더 → 뉴스 개수 배지(§3.3) → 카테고리 바와 검색 → 카드 목록** 순서로 배치한다. 검색은 카테고리 바와 같은 줄의 오른쪽 끝에 둔다.

```
┌──────────────────────────────────────────────────────────────┐
│ AI 뉴스 수집기                      [뉴스 가져오기]   (계정) │  헤더
├──────────────────────────────────────────────────────────────┤
│ (총 20개의 뉴스)                                             │  뉴스 개수 배지
│                                                              │
│ (전체)(모델/연구)(제품/서비스)(투자/비즈니스)  [검색어][검색] │  카테고리 바 · 검색
│ (규제/정책)(기타)(+ 카테고리 추가)(수정)(삭제)               │
│                                                              │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │
│ │ 출처 시각    ✕ │ │ 출처 시각    ✕ │ │ 출처 시각    ✕ │     │  카드 목록
│ │ 제목           │ │ 제목           │ │ 제목           │     │
│ │ 요약 미리보기  │ │ 요약 미리보기  │ │ 요약 미리보기  │     │
│ │ ───────────    │ │ ───────────    │ │ ───────────    │     │
│ │ [배지] 원문저장│ │ [배지] 원문저장│ │ [배지] 원문저장│     │
│ └────────────────┘ └────────────────┘ └────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 헤더

- 왼쪽에 앱 이름, 오른쪽에 `뉴스 가져오기` 버튼과 Clerk `UserButton`을 둔다.
- 클래스: `border-b border-border bg-surface`. 안쪽 콘텐츠는 본문과 같은 최대 폭에 맞춘다.
- 화면이 좁으면 버튼 글자를 `가져오기`로 줄인다. 앱 이름은 줄바꿈하지 않는다(`whitespace-nowrap`).

### 3.2 반응형

| 화면 폭 | 카드 열 수 |
|---|---|
| 768px 미만 | 1열 |
| `md` (768px 이상) | 2열 |
| `lg` (1024px 이상) | 3열 |

```html
<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
  <!-- 뉴스 개수 배지 -->
  <!-- 카테고리 바와 검색 -->
  <ul class="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
    <!-- 카드 -->
  </ul>
</main>
```

- 카드는 발행 시각 최신순으로 왼쪽에서 오른쪽, 위에서 아래로 놓는다.
- `items-start`를 써서 카드 하나를 펼쳐도 같은 줄의 다른 카드가 늘어나지 않게 한다.

### 3.3 뉴스 개수 배지

- 본문 맨 위에 DB에 있는 전체 뉴스 개수를 `총 {n}개의 뉴스`로 보여준다. 천 단위에는 쉼표를 넣는다.
- 카테고리 선택, 검색, 페이지와 상관없이 전체 개수다. 뉴스를 가져오거나 삭제하면 갱신된다. 하나도 없으면 `총 0개의 뉴스`다.
- 가져오기 상태 문구(§7)와 Notion 연결 결과 문구(§5.4)가 있으면 그 아래에 둔다.
- 누를 수 없는 메타 정보라서 선택되지 않은 칩보다 작게(`text-xs`) 하고, 강조색과 hover를 쓰지 않는다.
- 목록을 불러오는 중이거나 조회에 실패하면 표시하지 않는다.

```html
<p class="mb-3">
  <span class="inline-block rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted">
    총 20개의 뉴스
  </span>
</p>
```

## 4. 카테고리 바

카드 목록 위에 두며, 선택한 카테고리의 기사만 보여준다.

### 4.1 구성

순서는 `전체` → 카테고리(생성순) → `미분류` → `+ 카테고리 추가` → `수정` → `삭제`다. `수정`과 `삭제`는 카테고리를 선택했을 때만 보인다.

- `전체`가 기본 선택이며, 한 번에 하나만 선택한다.
- `미분류`는 미분류 기사가 있을 때만 보여준다. `기타` 카테고리와는 다른 항목이다.
- **관리 버튼(`+ 카테고리 추가`, `수정`, `삭제`)은 필터 칩 뒤, 목록의 끝**에 같은 줄로 둔다. 셋 다 점선 테두리로 필터 칩과 구분한다.
- 칩이 한 줄을 넘으면 줄바꿈한다(`flex-wrap`). 가로 스크롤은 관리 버튼이 가려지므로 쓰지 않는다.

```html
<nav aria-label="카테고리">
  <ul class="flex flex-wrap items-center gap-2">
    <!-- 선택된 칩 -->
    <li>
      <button type="button" aria-pressed="true"
        class="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
        전체
      </button>
    </li>
    <!-- 선택되지 않은 칩 -->
    <li>
      <button type="button" aria-pressed="false"
        class="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-foreground">
        모델/연구
      </button>
    </li>
    <!-- 필터 뒤: 관리 버튼. 카테고리를 선택하면 같은 모양의 수정, 삭제가 이어진다 -->
    <li>
      <button type="button"
        class="rounded-full border border-dashed border-muted px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent">
        + 카테고리 추가
      </button>
    </li>
  </ul>
</nav>
```

### 4.2 추가·수정·삭제

- 추가 버튼을 누르면 대화상자(`<dialog>`)를 연다.
- 입력 항목은 **이름**과 **설명**이며 둘 다 필수다. 설명 아래에 "기사를 자동 분류할 때 사용합니다."라고 안내한다.
- 같은 이름이 있으면 입력창 아래에 "이미 있는 카테고리 이름입니다."를 표시하고 입력값은 유지한다.
- 이름은 30자, 설명은 300자까지 입력한다. 고정 필터 이름인 `전체`, `미분류`는 "사용할 수 없는 이름입니다."로 거절한다.
- 대화상자의 클래스는 `m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/50`이다. 배경 가림막은 라이트·다크 모두 `bg-black/50`을 쓴다(§2.1 토큰의 예외).
- 설명은 여러 줄 입력창(`textarea`)을 쓴다. 저장 중에는 확인 버튼을 `추가하는 중…`으로 바꾸고 버튼과 `Esc` 닫기를 막는다.
- 수정·삭제는 카테고리를 선택했을 때 `+ 카테고리 추가` 옆에 나오는 `수정`, `삭제` 버튼으로 하며, 선택한 카테고리에 적용한다. 필터 칩 안에는 버튼을 넣지 않는다. `전체`와 `미분류`를 선택하면 표시하지 않는다.
- 수정은 추가와 같은 대화상자를 사용한다.
- 삭제 전에 확인 대화상자를 띄운다. 문구: "'{이름}' 카테고리를 삭제할까요? 소속 기사는 '미분류'로 이동합니다."
- 선택 중인 카테고리를 삭제하면 `전체`로 돌아간다.
- `미분류`를 선택하면 카테고리 바 아래에 `미분류 다시 분류` 버튼을 보여준다.
- 수정 대화상자의 확인 버튼은 `저장`(저장 중 `저장하는 중…`), 삭제 확인 버튼은 `삭제`(삭제 중 `삭제하는 중…`)다. 삭제하면 `전체` 칩으로 포커스를 옮긴다.
- 다시 분류 중에는 버튼을 `분류하는 중…`으로 바꾸고 비활성화한다. 결과는 버튼 아래에 `role="status"`(실패는 `role="alert"`)로 표시하고, 필터를 바꾸면 지운다. 모두 분류되면 `전체`로 돌아가며 결과 문구는 유지한다.
- 다시 분류는 카테고리만 바꾸고 제목은 번역하지 않는다. 한 번에 최신순 100건까지 처리한다.

## 5. 뉴스 카드

### 5.1 구성

위에서부터 다음 순서로 배치한다.

1. 출처와 발행 시각(왼쪽), 삭제(X) 버튼(오른쪽 상단, §5.7)
2. 제목: `titleKo`, 번역 전이면 원문 `title`
3. 원문 제목: 카드를 펼쳤고 `titleKo`가 있을 때만 (`lang="en"`)
4. 요약
5. 구분선 아래에 카테고리 배지(없으면 `미분류`, 왼쪽), `원문 보기` 링크와 `Notion 저장` 버튼(오른쪽)

- 출처와 시각은 가운뎃점으로 잇지 않고 간격과 굵기로 구분한다.
- 카드 안은 일정한 `gap` 대신 위 여백으로 묶음을 나눈다: 제목 `mt-2`, 원문 제목 `mt-1.5`, 요약 `mt-3`, 하단 줄 `mt-5`.
- 카테고리 이름이 길면 배지 안에서 말줄임한다. 폭이 모자라면 링크와 버튼이 다음 줄 오른쪽으로 내려간다.

hover·포커스 동작:

- 카드: 마우스를 올리거나 안쪽에 포커스가 있으면 테두리를 `border-strong`으로 바꾼다. hover에는 `shadow-md`를 더한다. 펼친 카드는 `border-strong`을 유지한다.
- 카드를 위로 띄우거나 확대하지 않는다. 카드 전체가 클릭 영역이 아니기 때문이다.
- 제목은 hover에 `text-accent`와 밑줄, `원문 보기`는 `bg-accent-soft`로 바꾼다.
- 전환은 200ms 이하로 하고 `motion-reduce:transition-none`을 더한다.

### 5.2 접힘과 펼침

요약은 카드를 열 때 생성한다. 카드는 목록 안에서 바로 펼친다.

| 상태 | 요약 영역 |
|---|---|
| 접힘, 요약 있음 | 2줄 미리보기 (`line-clamp-2`) |
| 접힘, 요약 없음 | "열면 한국어 요약을 만듭니다." |
| 펼침, 생성 중 | 3줄 스켈레톤 |
| 펼침, 완료 | 요약 전체 |
| 펼침, 실패 | "요약을 만들지 못했습니다."와 `다시 시도` 버튼 |

- 제목을 버튼으로 만들어 펼치고 접는다. `aria-expanded`로 상태를 알린다.
- 카드 전체를 클릭 영역으로 만들지 않는다. 링크·버튼과 클릭이 겹치기 때문이다.
- 번역 전의 영문 제목에는 `lang="en"`을 붙인다.

```html
<li class="flex flex-col rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md focus-within:border-border-strong motion-reduce:transition-none">
  <div class="flex items-start justify-between gap-3">
    <p class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 text-[13px] leading-5">
      <span class="font-semibold">TechCrunch</span>
      <time datetime="2026-11-25T09:00:00+09:00" class="text-muted tabular-nums">11월 25일 09:00</time>
    </p>
    <button type="button" aria-label="'카드 제목' 뉴스 삭제" title="삭제"
      class="-mt-2 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-danger">
      <!-- 16px X 아이콘(svg, aria-hidden) -->
    </button>
  </div>

  <h2 class="mt-2 text-lg font-semibold leading-[1.45] tracking-[-0.01em] text-balance break-keep wrap-anywhere">
    <button type="button" aria-expanded="false" class="text-left decoration-2 underline-offset-4 transition-colors hover:text-accent hover:underline motion-reduce:transition-none">
      카드 제목
    </button>
  </h2>

  <p class="mt-3 line-clamp-2 text-[15px] leading-7 text-body break-keep wrap-anywhere">
    요약 미리보기
  </p>

  <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
    <span class="max-w-full truncate rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-foreground">
      모델/연구
    </span>
    <div class="ml-auto flex items-center gap-2">
      <a href="https://example.com" target="_blank" rel="noopener noreferrer"
        class="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium whitespace-nowrap text-accent hover:bg-accent-soft">
        원문 보기 ↗
      </a>
      <button type="button"
        class="min-h-9 rounded-lg border border-border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:border-border-strong hover:bg-background motion-reduce:transition-none">
        Notion 저장
      </button>
    </div>
  </div>
</li>
```

### 5.3 발행 시각

한국 시간(`Asia/Seoul`) 기준의 `11월 25일 09:00` 형식으로 표시하고, 올해가 아니면 연도를 붙인다. `<time datetime>`에는 ISO 형식 값을 넣는다.

### 5.4 Notion 저장 버튼

| 상태 | 표시 | 동작 |
|---|---|---|
| 저장 전 | `Notion 저장` | 클릭 가능 |
| 저장 중 | `저장 중…` | 비활성 |
| 저장 완료 | `✓ 저장됨` (`text-success`) | 비활성 |
| 실패 | `다시 저장` + 카드 안 오류 문구 (`text-danger`) | 클릭 가능 |

Notion이 연결되지 않았으면 `Notion 저장`을 눌렀을 때 연결 절차를 시작한다.

- `✓ 저장됨`은 흐리게 하지 않고(`disabled:opacity-50` 제외) `text-success`로 보여준다. 저장 완료는 숨겨 둔 `role="status"` 영역으로도 알린다.
- 실패 문구는 버튼 줄 아래에 `text-sm text-danger`, `role="alert"`로 표시한다.
- 연결 후 돌아오면 카테고리 바 위에 결과 문구를 표시한다(`mb-4 text-sm`). 실패와 접속 확인 실패는 `text-danger`, `role="alert"`, 나머지는 `role="status"`다.

### 5.5 페이지 나누기

- 한 페이지에 카드를 9개씩 보여준다. 카테고리를 선택했거나 검색했으면 해당 기사만 나눈다.
- 카드 목록 아래 가운데에 `처음` → `이전` → 페이지 번호 → `다음` → `끝`을 둔다. 한 페이지뿐이면 표시하지 않는다.
- 첫 페이지와 마지막 페이지 번호는 항상 보여주고, 현재 페이지는 앞뒤로 2페이지씩 보여준다.
- 첫 페이지나 마지막 페이지가 현재 페이지 주변 번호와 이어지지 않으면 `…`를 표시하고, 이어지면 생략한다. 한 페이지만 빠져도 `…`를 표시한다.
- 예: 100페이지 중 50페이지면 `1 … 48 49 [50] 51 52 … 100`
- 현재 페이지는 배경을 채우고 `aria-current="page"`를 붙인다. 첫 페이지에서는 `처음`·`이전`을, 마지막 페이지에서는 `다음`·`끝`을 비활성화한다.
- 페이지를 옮기면 화면 맨 위로 이동한다. 카테고리나 검색어를 바꾸면 1페이지로 돌아간다.

```html
<nav aria-label="페이지" class="mt-8">
  <ul class="flex flex-wrap items-center justify-center gap-1">
    <!-- 현재 페이지 -->
    <li>
      <button type="button" aria-label="1페이지" aria-current="page"
        class="min-h-9 min-w-9 rounded-lg border border-accent bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
        1
      </button>
    </li>
    <!-- 다른 페이지, 처음, 이전, 다음, 끝 -->
    <li>
      <button type="button" aria-label="2페이지"
        class="min-h-9 min-w-9 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface">
        2
      </button>
    </li>
  </ul>
</nav>
```

### 5.6 키워드 검색

카테고리 바와 같은 줄의 오른쪽 끝에 두며(§3), 제목이나 요약에 검색어가 들어 있는 기사만 보여준다.

- `검색` 버튼을 누르거나 입력창에서 `Enter`를 누를 때 검색한다. 입력하는 동안에는 목록을 바꾸지 않는다.
- 검색 대상은 번역한 제목, 원문 제목, 만들어진 요약이다. 요약은 카드를 열거나 Notion에 저장할 때 만들어지므로, 요약이 없는 기사는 제목으로만 찾는다.
- 대소문자를 구분하지 않는다. 앞뒤 공백을 뺀 검색어 전체가 이어서 들어 있어야 한다.
- 선택한 카테고리 안에서 검색한다. 카테고리를 바꿔도 검색어는 유지한다.
- 빈 검색어로 검색하거나 `초기화`를 누르면 검색을 해제한다. `초기화`는 검색 중에만 보이며, 누르면 입력창으로 포커스를 옮긴다.
- 검색 중에는 이 줄 아래에 "'{검색어}' 검색 결과 {n}건"을 `role="status"`로 표시한다(640px 이상에서는 오른쪽 정렬).
- 1024px 이상에서는 폭 `w-80`으로 첫 줄 오른쪽에 두고, 칩은 남은 폭 안에서 줄바꿈한다. 그보다 좁으면 칩 아래로 내려 640px 이상은 폭 `w-96`의 오른쪽 정렬, 그 미만은 전체 폭으로 놓는다.
- 폼에는 `role="search"`를 붙인다. `<label>`은 화면에서 숨긴다(`sr-only`). 입력창은 §6의 클래스에 `min-w-0 flex-1`을 더하며(`w-full` 대신), 100자까지 입력한다.
- 폼 안 요소 사이 간격은 `gap-2`다. `검색`은 주요 버튼, `초기화`는 보조 버튼이며 페이지 배경 위라서 hover 배경은 `surface`를 쓴다.

### 5.7 삭제 버튼

카드 오른쪽 상단의 X 버튼을 누르면 확인 대화상자 없이 바로 기사를 DB에서 삭제한다.

| 상태 | 표시 | 동작 |
|---|---|---|
| 기본 | X 아이콘 (`text-muted`, hover `text-danger`) | 클릭 가능 |
| 삭제 중 | 흐리게 | 비활성. 같은 카드의 `Notion 저장`도 비활성 |
| Notion 저장 중 | 흐리게 | 비활성 |
| 실패 | 카드를 남기고 카드 안 오류 문구 (`text-sm text-danger`, `role="alert"`) | 클릭 가능 |

- 삭제에 성공하면 카드를 목록에서 없앤다. 숨겨 둔 `role="status"` 영역으로 "뉴스를 삭제했습니다."를 알리고, 포커스는 목록 영역으로 옮긴다. 스크롤은 옮기지 않는다.
- 마지막 페이지의 카드를 모두 지우면 앞 페이지를 보여준다. 목록이 비면 §7의 빈 목록 문구를 보여준다.
- Notion에 저장한 페이지는 삭제하지 않는다.

## 6. 버튼과 입력

| 종류 | 사용처 | 클래스 |
|---|---|---|
| 주요 | 뉴스 가져오기, 검색, 대화상자의 확인 | `rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90` |
| 보조 | Notion 저장, 취소, 다시 시도, 검색 초기화 | `rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background` |
| 위험 | 카테고리 삭제 확인 | `rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger` |
| 입력창 | 카테고리 이름·설명, 검색어 | `w-full rounded-lg border border-muted bg-surface px-3 py-2 text-base` |

- 한 영역에 주요 버튼은 하나만 둔다.
- 비활성 상태에는 `disabled:cursor-not-allowed disabled:opacity-50`을 더한다.
- 입력창에는 항상 `<label>`을 붙인다. 자리표시자로 대신하지 않는다.

## 7. 화면 상태

| 상황 | 표시 |
|---|---|
| 대시보드 접근 권한 확인 중 | 앱 이름이 있는 헤더(버튼·계정은 자리만 표시)와 카드 모양 스켈레톤 6개 |
| 목록 불러오는 중 | 카드 모양 스켈레톤 6개 (`animate-pulse motion-reduce:animate-none`) |
| 뉴스가 하나도 없음 | "아직 수집된 뉴스가 없습니다."와 `뉴스 가져오기` 안내 |
| 선택한 카테고리가 비어 있음 | "이 카테고리에는 뉴스가 없습니다." |
| 검색 결과가 없음 | "검색어와 일치하는 뉴스가 없습니다." (선택한 카테고리 자체가 비어 있으면 위의 문구) |
| 가져오는 중 | 버튼을 `가져오는 중…`으로 바꾸고 비활성화. 기존 목록은 유지 |
| 가져오기 완료 | "새 뉴스 {n}건을 가져왔습니다." 또는 "새 뉴스가 없습니다." |
| 가져오기 실패 | 원인을 알 수 있는 문구와 `다시 시도`. 일부 소스만 실패하면 소스 이름을 표시 |
| 번역·분류 실패 | "저장된 뉴스의 번역·분류에 실패했습니다."와 `다시 시도` |

- 완료·실패 문구는 카테고리 바 위에 표시하고 `role="status"`(실패는 `role="alert"`)를 붙인다.
- 로그인 필요·접근 거부 화면은 가운데 정렬로 앱 이름, 안내 문구, 버튼 하나를 보여준다.

## 8. 접근성

- 모든 버튼·링크·입력창에 포커스 표시를 둔다: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`. §4~§6의 예시에는 길이를 줄이려고 생략했다.
- 선택 상태와 저장 상태는 색만으로 구분하지 않는다. 배경 채움, 글자, 아이콘을 함께 바꾼다.
- 본문 글자와 배경의 명도 대비는 4.5:1 이상을 유지한다. 새 색을 추가하면 라이트·다크 모두 확인한다.
- 터치 대상의 높이는 36px 이상으로 한다.
- 대화상자는 `showModal()`로 열고 `Esc`로 닫을 수 있게 하며, 닫으면 열었던 버튼으로 포커스를 돌린다.
- 키보드만으로 필터 선택, 카드 열기, 저장이 가능해야 한다.

## 9. 문구

- 안내 문장은 `~습니다`체로 쓴다.
- 버튼은 짧은 동작 표현으로 쓴다: `뉴스 가져오기`, `Notion 저장`, `취소`, `삭제`.
- 오류 문구에는 무엇이 실패했는지와 다음에 할 일을 담는다.

## 10. 현재 코드와의 차이

2026-11-27 기준. `/dashboard`에 §2의 토큰, 뉴스 개수 배지, 카테고리 필터, 키워드 검색, 뉴스 카드, 불러오기·빈 목록·조회 실패 화면, `뉴스 가져오기` 버튼과 가져오기 상태 문구, 요약 생성·생성 중·실패 상태, 카테고리 추가·수정·삭제와 미분류 다시 분류, Notion 저장 버튼과 연결 결과 문구를 적용했다. 남은 항목은 다음과 같다.

| 항목 | 현재 |
|---|---|
| 메인 화면 `/` | 빈 목록 문구만 표시 |
