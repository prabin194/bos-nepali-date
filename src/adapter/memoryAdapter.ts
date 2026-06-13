import { BsAdapter, BsDate } from '../types';
import { epochDayToIso, isoToEpochDay } from '../utils/dateMath';

/** Flat array (readonly number[]) or Record<year, monthLengths[12]>. */
type YearTableInput = readonly number[] | Record<number, readonly number[]>;

export type MemoryAdapterOptions = {
  /** Anchor that maps BS to AD. Example: BS 2000-01-01 corresponds to AD 1943-04-14. */
  anchorBs: BsDate;
  anchorAdIso: string;
  /**
   * Month lengths table.
   * - Flat array: 12 entries per year starting at year 2000. Preferred (smaller bundle).
   * - Record: `{ [year]: [12 month lengths] }`. Accepted for backward compatibility.
   */
  yearTable: YearTableInput;
  range?: {
    min?: BsDate;
    max?: BsDate;
  };
};

/**
 * Lightweight adapter that relies on a provided month-length table.
 * The default export ships with data for BS years 2000-2099.
 */
export class MemoryBsAdapter implements BsAdapter {
  private anchorBs: BsDate;
  private anchorAdDay: number;
  private data: readonly number[];
  private minYear: number;
  private maxYear: number;
  readonly range?: { min?: BsDate; max?: BsDate };

  constructor(options: MemoryAdapterOptions) {
    this.anchorBs = options.anchorBs;
    this.anchorAdDay = isoToEpochDay(options.anchorAdIso);
    this.range = options.range;

    if (Array.isArray(options.yearTable)) {
      // Flat array: 12 entries per year starting at 2000
      this.data = options.yearTable;
      this.minYear = 2000;
      this.maxYear = 2000 + Math.floor(this.data.length / 12) - 1;
    } else {
      // Record format: convert to flat array internally
      const table = options.yearTable as Record<number, readonly number[]>;
      const years = Object.keys(table).map(Number).sort((a, b) => a - b);
      this.minYear = years[0];
      this.maxYear = years[years.length - 1];
      const flat: number[] = [];
      for (const y of years) {
        const months = table[y];
        for (let m = 0; m < 12; m++) flat.push(months[m]);
      }
      this.data = flat;
    }
  }

  today(): BsDate {
    const isoToday = epochDayToIso(Math.floor(Date.now() / (24 * 60 * 60 * 1000)));
    try {
      return this.toBS(isoToday);
    } catch {
      // Clamp to supported range
      const beyond = isoToEpochDay(isoToday) > this.anchorAdDay;
      return beyond
        ? { year: this.maxYear, month: 12, day: this.getMonthLen(this.maxYear, 12) }
        : { year: this.minYear, month: 1, day: 1 };
    }
  }

  toAD(date: BsDate): string {
    this.validate(date);
    const offset = this.bsToOffset(date);
    return epochDayToIso(this.anchorAdDay + offset);
  }

  toBS(adIso: string): BsDate {
    const targetDay = isoToEpochDay(adIso);
    const offset = targetDay - this.anchorAdDay;
    return this.offsetToBs(offset);
  }

  addDays(date: BsDate, days: number): BsDate {
    this.validate(date);
    return this.offsetToBs(this.bsToOffset(date) + days);
  }

  diffDays(date1: BsDate, date2: BsDate): number {
    this.validate(date1);
    this.validate(date2);
    return this.bsToOffset(date2) - this.bsToOffset(date1);
  }

  private validate(date: BsDate) {
    const { year, month, day } = date;
    if (!this.hasYear(year)) {
      throw new Error(`BS year ${year} not supported by adapter.`);
    }
    if (month < 1 || month > 12) {
      throw new Error(`Invalid BS month ${month}.`);
    }
    const maxDays = this.getMonthLen(year, month);
    if (day < 1 || day > maxDays) {
      throw new Error(`Invalid BS day ${day} for year ${year} month ${month}.`);
    }
  }

  private bsToOffset(date: BsDate): number {
    const { year, month, day } = date;
    if (!this.hasYear(year)) {
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

  private getMonthLen(year: number, month: number): number {
    const idx = (year - this.minYear) * 12 + month - 1;
    if (idx < 0 || idx >= this.data.length) {
      throw new Error(`BS year ${year} not supported by adapter.`);
    }
    return this.data[idx];
  }

  private hasYear(year: number): boolean {
    const idx = (year - this.minYear) * 12;
    return idx >= 0 && idx < this.data.length - 11;
  }

  private addOneDay(date: BsDate, direction: 1 | -1): BsDate {
    if (direction === 1) {
      const dim = this.getMonthLen(date.year, date.month);
      if (date.day < dim) return { ...date, day: date.day + 1 };
      // next month
      if (date.month === 12) {
        if (!this.hasYear(date.year + 1)) throw new Error(`BS year ${date.year + 1} not supported by adapter.`);
        return { year: date.year + 1, month: 1, day: 1 };
      }
      return { year: date.year, month: date.month + 1, day: 1 };
    } else {
      // direction -1
      if (date.day > 1) return { ...date, day: date.day - 1 };
      if (date.month === 1) {
        if (!this.hasYear(date.year - 1)) throw new Error(`BS year ${date.year - 1} not supported by adapter.`);
        const prevLen = this.getMonthLen(date.year - 1, 12);
        return { year: date.year - 1, month: 12, day: prevLen };
      }
      const prevLen = this.getMonthLen(date.year, date.month - 1);
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

import { bsMonthData, bsRange } from './bsTable';

/** Default adapter: anchor at BS 2000-01-01 = AD 1943-04-14 (per dataset). */
export const defaultAdapter = new MemoryBsAdapter({
  anchorBs: { year: 2000, month: 1, day: 1 },
  anchorAdIso: '1943-04-14',
  yearTable: bsMonthData,
  range: {
    min: { year: bsRange.minYear, month: 1, day: 1 },
    max: { year: bsRange.maxYear, month: 12, day: bsMonthData[(bsRange.maxYear - 2000) * 12 + 11] },
  },
});
