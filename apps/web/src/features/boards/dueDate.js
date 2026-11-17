/**
 * @fileoverview Board due dates: calendar days ("YYYY-MM-DD", no time or
 * zone) compared with the viewer's local today, and the board-list order.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Due within this many days (and not overdue) counts as "soon". */
const SOON_DAYS = 7;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** How the board list can be ordered; the first is the default. */
export const BOARD_SORTS = [
  {value: 'recent', label: 'Newest'},
  {value: 'due', label: 'Nearest due date'},
];

/**
 * @param {!Date=} now
 * @return {string} The viewer's local calendar day as YYYY-MM-DD.
 */
export function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** @param {string} iso YYYY-MM-DD, read as a UTC midnight. */
const utcDay = (iso) => Date.parse(`${iso}T00:00:00Z`);

/**
 * @param {string} dueDate YYYY-MM-DD
 * @param {string} today YYYY-MM-DD
 * @return {number} Days from today to the due date (negative when past).
 */
export function daysUntil(dueDate, today) {
  return Math.round((utcDay(dueDate) - utcDay(today)) / DAY_MS);
}

/**
 * @param {string} dueDate YYYY-MM-DD
 * @param {string=} today YYYY-MM-DD; defaults to the local today.
 * @return {{date: string, relative: string,
 *     tone: ('overdue'|'soon'|'later')}} e.g. "1 Dec 2026", "in 3 days".
 */
export function describeDueDate(dueDate, today = todayIso()) {
  const days = daysUntil(dueDate, today);
  const date = DATE_FORMAT.format(new Date(utcDay(dueDate)));
  if (days < 0) {
    const late = -days;
    return {
      date,
      relative: `${late} ${late === 1 ? 'day' : 'days'} overdue`,
      tone: 'overdue',
    };
  }
  const relative =
    days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return {date, relative, tone: days <= SOON_DAYS ? 'soon' : 'later'};
}

/**
 * @param {!Array<!Object>} boards In server order (newest first).
 * @param {string} sort A BOARD_SORTS value.
 * @return {!Array<!Object>} A new array. "due" puts the earliest due date
 *     first (so overdue boards lead), then boards without one, each group
 *     otherwise in server order.
 */
export function sortBoards(boards, sort) {
  if (sort !== 'due') {
    return [...boards];
  }
  return [...boards].sort((a, b) => {
    if (a.dueDate == null || b.dueDate == null) {
      return (a.dueDate == null) - (b.dueDate == null);
    }
    return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
  });
}
