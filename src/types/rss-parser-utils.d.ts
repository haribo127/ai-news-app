// rss-parser에 타입이 없는 내부 모듈 중 사용하는 함수만 선언한다.
declare module "rss-parser/lib/utils" {
  /** HTML 태그를 지우고 엔티티를 해석한다. */
  export function getSnippet(html: string): string;
}
