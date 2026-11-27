import { AppHeader } from "@/components/app-header";
import { NewsSkeleton } from "./news-skeleton";
import { dashboardMain } from "./styles";

/** 접근 권한을 확인하는 동안 보여준다. 헤더 버튼과 계정은 자리만 잡는다. */
export function DashboardSkeleton() {
  return (
    <>
      <AppHeader>
        <div
          aria-hidden="true"
          className="flex animate-pulse items-center gap-3 motion-reduce:animate-none"
        >
          <div className="h-9 w-20 rounded-lg bg-border sm:w-28" />
          <div className="size-7 rounded-full bg-border" />
        </div>
      </AppHeader>
      <main className={dashboardMain}>
        <NewsSkeleton />
      </main>
    </>
  );
}
