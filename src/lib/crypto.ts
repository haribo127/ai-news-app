import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey() {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY는 base64로 인코딩한 32바이트여야 합니다.");
  }
  return key;
}

/**
 * 문자열을 암호화한다. purpose가 다르면 복호화되지 않으므로
 * 한 용도의 암호문을 다른 곳에 옮겨 쓸 수 없다.
 */
export function encrypt(plain: string, purpose: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** 키나 purpose가 다르거나 값이 변조됐으면 예외를 던진다. */
export function decrypt(encrypted: string, purpose: string) {
  const data = Buffer.from(encrypted, "base64url");
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    data.subarray(0, IV_BYTES),
    { authTagLength: TAG_BYTES },
  );
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([
    decipher.update(data.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
}
