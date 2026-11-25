import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";

export default function Home() {
  return (
    <Suspense
      fallback={<p className="m-auto text-muted">불러오는 중…</p>}
    >
      <AuthGate>
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
          <p>아직 수집된 뉴스가 없습니다.</p>
        </main>
      </AuthGate>
    </Suspense>
  );
}
