// Notion 연결 콜백이 /dashboard?notion=… 로 보낸 결과를 알려준다.
const NOTICES: Record<string, { message: string; failed: boolean }> = {
  connected: {
    message:
      "Notion에 연결했습니다. 저장할 기사의 'Notion 저장' 버튼을 다시 눌러 주세요.",
    failed: false,
  },
  unverified: {
    message:
      "Notion 승인은 받았지만 접속을 확인하지 못했습니다. 잠시 후 'Notion 저장'을 다시 눌러 주세요.",
    failed: true,
  },
  cancelled: { message: "Notion 연결을 취소했습니다.", failed: false },
  error: {
    message:
      "Notion에 연결하지 못했습니다. 'Notion 저장'을 눌러 다시 시도해 주세요.",
    failed: true,
  },
};

export function NotionNotice({ result }: { result: unknown }) {
  if (typeof result !== "string" || !Object.hasOwn(NOTICES, result)) {
    return null;
  }
  const { message, failed } = NOTICES[result];

  return (
    <p
      role={failed ? "alert" : "status"}
      className={`mb-4 text-sm ${failed ? "text-danger" : ""}`}
    >
      {message}
    </p>
  );
}
