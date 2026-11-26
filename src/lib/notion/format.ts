// Notion MCP에 넘기는 값의 형식. 2026-11-26에 실제 호출로 확인했다(docs/notion-plan.md).

/**
 * 속성 값은 Notion Markdown으로 해석되므로 서식 기호를 이스케이프한다.
 * RSS 제목과 Claude 요약을 글자 그대로 저장하기 위한 것이다.
 */
export function escapeMarkdown(text: string) {
  return text.replace(/[\\*_~`$[\]<>{}|^]/g, "\\$&");
}

/** Notion 선택 옵션 이름에는 쉼표를 쓸 수 없다. */
export function toOptionName(categoryName: string) {
  return categoryName.replaceAll(",", "·").trim();
}

/** 선택 속성 정의. 예: SELECT('A', 'B') */
export function selectType(optionNames: string[]) {
  const options = optionNames.map((name) => `'${name.replaceAll("'", "''")}'`);
  return `SELECT(${options.join(", ")})`;
}

/** Notion은 옵션 이름의 대소문자를 구분하지 않는다. */
export function uniqueOptionNames(names: string[]) {
  const unique = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (!unique.has(key)) unique.set(key, name);
  }
  return [...unique.values()];
}
