import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk 세션을 요청에 연결한다. 접근 차단은 각 페이지·API에서
// src/lib/auth.ts의 getAccess()로 검사한다.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Next.js 내부 경로와 정적 파일은 제외
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk 프런트엔드 API 경로
    "/__clerk/(.*)",
  ],
};
