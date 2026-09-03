/**
 * Dates rendered identically by the server and the browser.
 *
 * `toLocaleDateString()` and `toLocaleString()` read the *runtime's* locale and
 * timezone — Node's on the server, the reader's in the browser. A client
 * component that renders a date therefore emits one string during SSR and a
 * different one when it hydrates; React sees the two renders disagree, throws
 * (#425), discards the server's HTML for that subtree and re-renders it on the
 * client. Nothing looks broken afterwards, which is how it went unnoticed until
 * the UI suite's hydration check started asserting it.
 *
 * So: one fixed format, one fixed timezone, said out loud wherever a time is
 * shown. UTC rather than the reader's own zone because the server cannot know
 * theirs at render time, and an unlabelled time in somebody else's timezone is
 * the more misleading half of that trade.
 *
 * Formatted by hand rather than through `Intl.DateTimeFormat` because this
 * needs to be byte-identical in two runtimes, and Intl output depends on the
 * ICU/CLDR version each one ships — en-GB has abbreviated September as both
 * "Sep" and "Sept" across CLDR releases, which would reintroduce exactly this
 * bug for one month of the year.
 */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** e.g. `28 Jul 2026` */
export function formatDate(value: Date | string): string {
  const date = new Date(value);
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** e.g. `28 Jul 2026, 16:24 UTC` */
export function formatDateTime(value: Date | string): string {
  const date = new Date(value);
  return `${formatDate(date)}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}
