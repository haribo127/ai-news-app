import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.");
}

// 앱 쿼리는 pooled 연결(DATABASE_URL)과 HTTP 드라이버를 사용한다.
// 마이그레이션에는 DATABASE_URL_UNPOOLED(직접 연결)를 사용한다.
export const db = drizzle({ client: neon(databaseUrl), schema });
