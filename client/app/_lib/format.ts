export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

const DISPLAY_TIME_ZONE = "Asia/Seoul";

// en-CA gives a YYYY-MM-DD string, which makes same-day/same-year comparisons easy.
function seoulDateParts(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: DISPLAY_TIME_ZONE });
}

export function formatModifiedDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  // Compare using a fixed timezone (not toDateString()/getFullYear(), which
  // read the host's local timezone) so the server and the browser always
  // agree on which format to use.
  const dateKey = seoulDateParts(date);
  const nowKey = seoulDateParts(now);
  const isToday = dateKey === nowKey;

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: DISPLAY_TIME_ZONE,
    });
  }

  const isThisYear = dateKey.slice(0, 4) === nowKey.slice(0, 4);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: isThisYear ? undefined : "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  });
}
