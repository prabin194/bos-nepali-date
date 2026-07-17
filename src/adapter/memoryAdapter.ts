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
  private anchorOrdinal: number;
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
      if (options.yearTable.length === 0 || options.yearTable.length % 12 !== 0) {
        throw new Error('Flat BS year table must contain exactly 12 month lengths per year.');
      }
      this.data = options.yearTable;
      this.minYear = 2000;
      this.maxYear = 2000 + Math.floor(this.data.length / 12) - 1;
    } else {
      // Record format: convert to flat array internally
      const table = options.yearTable as Record<number, readonly number[]>;
      const years = Object.keys(table).map(Number).sort((a, b) => a - b);
      if (years.length === 0) {
        throw new Error('BS year table must contain at least one year.');
      }
      for (let i = 1; i < years.length; i++) {
        if (years[i] !== years[i - 1] + 1) {
          throw new Error('BS year table years must be contiguous.');
        }
      }
      this.minYear = years[0];
      this.maxYear = years[years.length - 1];
      const flat: number[] = [];
      for (const y of years) {
        const months = table[y];
        if (months.length !== 12) {
          throw new Error(`BS year ${y} must contain exactly 12 month lengths.`);
        }
        for (let m = 0; m < 12; m++) flat.push(months[m]);
      }
      this.data = flat;
    }

    if (this.data.some((days) => !Number.isInteger(days) || days < 1 || days > 32)) {
      throw new Error('BS month lengths must be integers between 1 and 32.');
    }
    if (!this.hasYear(this.anchorBs.year)) {
      throw new Error(`Anchor BS year ${this.anchorBs.year} is not present in the year table.`);
    }
    this.validate(this.anchorBs);
    this.anchorOrdinal = this.bsToOrdinal(this.anchorBs);
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
    if (!Number.isInteger(days)) {
      throw new Error('Days to add must be an integer.');
    }
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
    return this.bsToOrdinal(date) - this.anchorOrdinal;
  }

  private offsetToBs(offset: number): BsDate {
    let remaining = this.anchorOrdinal + offset;
    if (remaining < 0) {
      throw new Error(`BS year ${this.minYear - 1} not supported by adapter.`);
    }

    for (let year = this.minYear; year <= this.maxYear; year++) {
      const yearLength = this.yearDays(year);
      if (remaining >= yearLength) {
        remaining -= yearLength;
        continue;
      }
      for (let month = 1; month <= 12; month++) {
        const monthLength = this.getMonthLen(year, month);
        if (remaining >= monthLength) {
          remaining -= monthLength;
          continue;
        }
        return { year, month, day: remaining + 1 };
      }
    }

    throw new Error(`BS year ${this.maxYear + 1} not supported by adapter.`);
  }

  private bsToOrdinal(date: BsDate): number {
    let ordinal = 0;
    for (let year = this.minYear; year < date.year; year++) {
      ordinal += this.yearDays(year);
    }
    for (let month = 1; month < date.month; month++) {
      ordinal += this.getMonthLen(date.year, month);
    }
    return ordinal + date.day - 1;
  }

  private yearDays(year: number): number {
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      total += this.getMonthLen(year, m);
    }
    return total;
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
