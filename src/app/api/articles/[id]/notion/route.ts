import { getAccess } from "@/lib/auth";
import { saveArticleToNotion } from "@/lib/notion/save-article";
import { NotionNotConnectedError } from "@/lib/notion/token";

export const maxDuration = 60;

// articles.id는 Postgres integer다.
const MAX_ID = 2_147_483_647;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getAccess();
  if (access.status !== "allowed") {
    return Response.json(
      { error: "접근 권한이 없습니다." },
      { status: access.status === "signed-out" ? 401 : 403 },
    );
  }

  const { id } = await params;
  const articleId = /^\d+$/.test(id) ? Number(id) : 0;
  if (articleId < 1 || articleId > MAX_ID) {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const result = await saveArticleToNotion(access.userId, articleId);
    if (result.status === "not-found") {
      return Response.json({ error: "기사를 찾을 수 없습니다." }, { status: 404 });
    }
    if (result.status === "in-progress") {
      return Response.json({ code: "in_progress" }, { status: 409 });
    }
    return Response.json({ summary: result.summary });
  } catch (error) {
    if (error instanceof NotionNotConnectedError) {
      return Response.json({ code: "not_connected" }, { status: 409 });
    }
    console.error("Notion 저장 실패", articleId, error);
    return Response.json({ error: "Notion에 저장하지 못했습니다." }, { status: 502 });
  }
}
