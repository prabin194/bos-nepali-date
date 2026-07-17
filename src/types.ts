export type BsDate = {
  year: number;
  month: number; // 1-12
  day: number;   // 1-32 depending on month
};

/**
 * Date display/input format string.
 *
 * Supports tokens:
 * - `YYYY` — 4-digit year
 * - `YY`   — 2-digit year (will be prefixed with current century)
 * - `MM`   — 2-digit month (01-12)
 * - `M`    — 1-2 digit month (1-12)
 * - `DD`   — 2-digit day (01-31)
 * - `D`    — 1-2 digit day (1-31)
 *
 * The first non-token character between date parts becomes the separator.
 * Examples: `'YYYY-MM-DD'`, `'DD/MM/YYYY'`, `'M/D/YYYY'`, `'YYYY.MM.DD'`
 *
 * @default 'YYYY-MM-DD'
 */
export type DateFormat = string;

export type AdDateIso = string; // YYYY-MM-DD

/** Minimal calendar operations needed to render and navigate a BS calendar. */
export interface BsCalendarAdapter {
  /** Convert a BS date to ISO AD string (YYYY-MM-DD). */
  toAD: (date: BsDate) => AdDateIso;
  /** Add days to a BS date and return a new BS date. */
  addDays: (date: BsDate, days: number) => BsDate;
  /** BS date for today. */
  today: () => BsDate;
}

/** Full conversion contract used by date-picker orchestration. */
export interface BsAdapter extends BsCalendarAdapter {
  /** Convert an ISO AD string to BS date. */
  toBS: (date: AdDateIso) => BsDate;
  /** Difference in days: date2 - date1. */
  diffDays: (date1: BsDate, date2: BsDate) => number;
  /** Optional supported range for validation. */
  range?: {
    min?: BsDate;
    max?: BsDate;
  };
}
