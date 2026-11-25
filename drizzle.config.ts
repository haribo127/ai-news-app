import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit은 Next.js 밖에서 실행되므로 .env.local을 직접 불러온다.
loadEnvConfig(process.cwd());

// 마이그레이션은 pooled가 아닌 직접 연결을 사용한다.
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  throw new Error(
    "DATABASE_URL_UNPOOLED가 설정되지 않았습니다. `neon env pull`을 실행하세요.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
