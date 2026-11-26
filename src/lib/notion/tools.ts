import "server-only";
import type { Client } from "@modelcontextprotocol/client";

// 저장 라우트의 실행 시간(60초)을 넘기지 않도록 도구 호출마다 제한한다.
const TOOL_TIMEOUT_MS = 20_000;

export class NotionToolError extends Error {
  constructor(tool: string, detail: string) {
    super(`Notion 도구 호출 실패(${tool}): ${detail}`);
    this.name = "NotionToolError";
  }

  /** 대상이 삭제됐거나 접근할 수 없다. */
  get isNotFound() {
    return this.message.includes("object_not_found");
  }
}

/** Notion MCP 도구를 호출해 응답의 텍스트를 반환한다. */
export async function callNotionTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  const result = await client.callTool(
    { name, arguments: args },
    { timeout: TOOL_TIMEOUT_MS },
  );
  const text = result.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");
  if (result.isError) throw new NotionToolError(name, text);
  return text;
}
