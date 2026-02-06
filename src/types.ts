export type BsDate = {
  year: number;
  month: number; // 1-12
  day: number;   // 1-32 depending on month
};

export type AdDateIso = string; // YYYY-MM-DD

export interface BsAdapter {
  /** Convert a BS date to ISO AD string (YYYY-MM-DD). */
  toAD: (date: BsDate) => AdDateIso;
  /** Convert an ISO AD string to BS date. */
  toBS: (date: AdDateIso) => BsDate;
  /** Add days to a BS date and return a new BS date. */
  addDays: (date: BsDate, days: number) => BsDate;
  /** Difference in days: date2 - date1. */
  diffDays: (date1: BsDate, date2: BsDate) => number;
  /** BS date for today. */
  today: () => BsDate;
  /** Optional supported range for validation. */
  range?: {
    min?: BsDate;
    max?: BsDate;
  };
}
