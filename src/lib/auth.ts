import "server-only";
import { currentUser } from "@clerk/nextjs/server";

export type Access =
  | { status: "signed-out" }
  | { status: "forbidden"; email: string | null }
  | { status: "allowed"; userId: string };

/**
 * 로그인 여부와 허용 이메일(ALLOWED_EMAIL)을 검사한다.
 * 모든 페이지·API·Server Action은 데이터를 다루기 전에 호출해야 한다.
 */
export async function getAccess(): Promise<Access> {
  const user = await currentUser();
  if (!user) return { status: "signed-out" };

  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  const primary = user.primaryEmailAddress;
  const email = primary?.emailAddress ?? null;

  // ALLOWED_EMAIL이 없거나 이메일이 미인증이면 차단한다.
  if (
    !allowed ||
    primary?.verification?.status !== "verified" ||
    email?.toLowerCase() !== allowed
  ) {
    return { status: "forbidden", email };
  }

  return { status: "allowed", userId: user.id };
}
