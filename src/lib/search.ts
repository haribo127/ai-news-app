// 대소문자와 한글의 유니코드 조합 방식 차이는 무시한다.
const normalize = (text: string) => text.normalize("NFC").toLowerCase();

/** 제목이나 요약 중 하나에 검색어가 들어 있는지 확인한다. 빈 검색어는 모두 통과한다. */
export function matchesKeyword(
  texts: (string | null | undefined)[],
  keyword: string,
) {
  const needle = normalize(keyword);
  return texts.some((text) => normalize(text ?? "").includes(needle));
}
