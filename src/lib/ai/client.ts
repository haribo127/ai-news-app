import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const CLASSIFY_MODEL = "claude-haiku-5-5";
export const SUMMARY_MODEL = "claude-haiku-5-5";

// 키를 넘기지 않으면 SDK가 ANTHROPIC_API_KEY, 없으면 `ant auth login` 프로필을 쓴다.
// 서버리스 실행 시간을 넘기지 않도록 재시도하지 않는다.
export const anthropic = new Anthropic({ timeout: 40_000, maxRetries: 0 });

/** 응답의 text 블록을 합친다. 거절이나 잘림처럼 정상 종료가 아니면 던진다. */
export function readText(
  message: Pick<Anthropic.Message, "stop_reason" | "content">,
) {
  if (message.stop_reason !== "end_turn") {
    throw new Error(`Claude 응답이 완료되지 않았습니다: ${message.stop_reason}`);
  }
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}
