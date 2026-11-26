import { getSummary } from "@/lib/article/get-summary";
import { getAccess } from "@/lib/auth";

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
    const summary = await getSummary(articleId);
    if (summary === null) {
      return Response.json({ error: "기사를 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json({ summary });
  } catch (error) {
    console.error("요약 생성 실패", articleId, error);
    return Response.json({ error: "요약을 만들지 못했습니다." }, { status: 502 });
  }
}
