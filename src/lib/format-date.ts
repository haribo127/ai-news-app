const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toParts(date: Date) {
  return Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
}

/** 한국 시간 기준 '11월 25일 09:00'. 올해가 아니면 연도를 붙인다. */
export function formatPublishedAt(date: Date, now: Date) {
  const { year, month, day, hour, minute } = toParts(date);
  const text = `${month}월 ${day}일 ${hour}:${minute}`;
  return year === toParts(now).year ? text : `${year}년 ${text}`;
}
