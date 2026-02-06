import { BsAdapter, BsDate } from '../types';
import { epochDayToIso, isoToEpochDay } from '../utils/dateMath';

type YearTable = Record<number, [number, number, number, number, number, number, number, number, number, number, number, number]>;

export type MemoryAdapterOptions = {
  /** Anchor that maps BS to AD. Example: BS 2000-01-01 corresponds to AD 1943-04-14. */
  anchorBs: BsDate;
  anchorAdIso: string;
  /** Month lengths table for every supported BS year. */
  yearTable: YearTable;
};

/**
 * Lightweight adapter that relies on a provided month-length table.
 * The default export ships with a limited demo table (2080-2081) so you can wire UI right away.
 * Replace `yearTable` with a full dataset before production use.
 */
export class MemoryBsAdapter implements BsAdapter {
  private anchorBs: BsDate;
  private anchorAdDay: number;
  private yearTable: YearTable;

  constructor(options: MemoryAdapterOptions) {
    this.anchorBs = options.anchorBs;
    this.anchorAdDay = isoToEpochDay(options.anchorAdIso);
    this.yearTable = options.yearTable;
  }

  today(): BsDate {
    return this.toBS(epochDayToIso(Math.floor(Date.now() / (24 * 60 * 60 * 1000))));
  }

  toAD(date: BsDate): string {
    const offset = this.bsToOffset(date);
    return epochDayToIso(this.anchorAdDay + offset);
  }

  toBS(adIso: string): BsDate {
    const targetDay = isoToEpochDay(adIso);
    const offset = targetDay - this.anchorAdDay;
    return this.offsetToBs(offset);
  }

  addDays(date: BsDate, days: number): BsDate {
    return this.offsetToBs(this.bsToOffset(date) + days);
  }

  diffDays(date1: BsDate, date2: BsDate): number {
    return this.bsToOffset(date2) - this.bsToOffset(date1);
  }

  private bsToOffset(date: BsDate): number {
    const { year, month, day } = date;
    if (!this.yearTable[year]) {
      throw new Error(`BS year ${year} not supported by adapter.`);
    }
    let days = 0;
    if (year > this.anchorBs.year || (year === this.anchorBs.year && (month > this.anchorBs.month || (month === this.anchorBs.month && day >= this.anchorBs.day)))) {
      // forward from anchor
      days += this.daysBetweenBs(this.anchorBs, { year, month, day });
    } else {
      // backward
      days -= this.daysBetweenBs(date, this.anchorBs);
    }
    return days;
  }

  private offsetToBs(offset: number): BsDate {
    let current: BsDate = { ...this.anchorBs };
    if (offset === 0) return current;

    let remaining = offset;
    const step = offset > 0 ? 1 : -1;
    while (remaining !== 0) {
      current = this.addOneDay(current, step);
      remaining -= step;
    }
    return current;
  }

  private daysInMonth(year: number, month: number): number {
    const months = this.yearTable[year];
    if (!months) throw new Error(`BS year ${year} not supported by adapter.`);
    const len = months[month - 1];
    if (!len) throw new Error(`Invalid month ${month} for BS year ${year}.`);
    return len;
  }

  private addOneDay(date: BsDate, direction: 1 | -1): BsDate {
    if (direction === 1) {
      const dim = this.daysInMonth(date.year, date.month);
      if (date.day < dim) return { ...date, day: date.day + 1 };
      // next month
      if (date.month === 12) {
        if (!this.yearTable[date.year + 1]) throw new Error(`BS year ${date.year + 1} not supported by adapter.`);
        return { year: date.year + 1, month: 1, day: 1 };
      }
      return { year: date.year, month: date.month + 1, day: 1 };
    } else {
      // direction -1
      if (date.day > 1) return { ...date, day: date.day - 1 };
      if (date.month === 1) {
        if (!this.yearTable[date.year - 1]) throw new Error(`BS year ${date.year - 1} not supported by adapter.`);
        const prevLen = this.daysInMonth(date.year - 1, 12);
        return { year: date.year - 1, month: 12, day: prevLen };
      }
      const prevLen = this.daysInMonth(date.year, date.month - 1);
      return { year: date.year, month: date.month - 1, day: prevLen };
    }
  }

  private daysBetweenBs(start: BsDate, end: BsDate): number {
    // inclusive start, exclusive end; assumes end >= start
    let days = 0;
    let cursor: BsDate = { ...start };
    while (!(cursor.year === end.year && cursor.month === end.month && cursor.day === end.day)) {
      cursor = this.addOneDay(cursor, 1);
      days += 1;
    }
    return days;
  }
}

// Minimal sample dataset (BS 2080-2081) for quick prototyping; replace with a full table.
const SAMPLE_TABLE: YearTable = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2081: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
};

/** Default adapter: anchor at BS 2080-01-01 = AD 2023-04-14 (approx). */
export const defaultAdapter = new MemoryBsAdapter({
  anchorBs: { year: 2080, month: 1, day: 1 },
  anchorAdIso: '2023-04-14',
  yearTable: SAMPLE_TABLE,
});
