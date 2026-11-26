const base =
  "min-h-9 min-w-9 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const idle = "border-border hover:bg-surface";

// 현재 페이지 앞뒤로 보여줄 번호 수
const SIBLINGS = 2;

/**
 * 첫 페이지, 마지막 페이지, 현재 페이지와 앞뒤 2페이지를 남긴다.
 * 번호가 이어지지 않는 자리는 null(…)이다.
 */
function pageItems(current: number, total: number) {
  const around = Array.from(
    { length: SIBLINGS * 2 + 1 },
    (_, i) => current - SIBLINGS + i,
  ).filter((page) => page > 1 && page < total);
  const pages = total > 1 ? [1, ...around, total] : [1];

  return pages.flatMap((page, i): (number | null)[] =>
    i > 0 && page - pages[i - 1] > 1 ? [null, page] : [page],
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const stepClass = `${base} ${idle} disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <nav aria-label="페이지" className="mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onChange(1)}
            className={stepClass}
          >
            처음
          </button>
        </li>
        <li>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            className={stepClass}
          >
            이전
          </button>
        </li>
        {pageItems(page, totalPages).map((item, i) =>
          item === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`${item}페이지`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onChange(item)}
                className={`${base} ${
                  item === page
                    ? "border-accent bg-accent text-accent-foreground"
                    : idle
                }`}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onChange(page + 1)}
            className={stepClass}
          >
            다음
          </button>
        </li>
        <li>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onChange(totalPages)}
            className={stepClass}
          >
            끝
          </button>
        </li>
      </ul>
    </nav>
  );
}
