import type { BsAdapter, BsDate } from '../types';
import type { FormatInfo } from './pickerUtils';

export function safeDiffDays(adapter: BsAdapter, date1: BsDate, date2: BsDate): number | null {
  try {
    return adapter.diffDays(date1, date2);
  } catch {
    return null;
  }
}

export function shiftMonth(adapter: BsAdapter, base: BsDate, direction: 1 | -1): BsDate | null {
  try {
    const jump = direction === 1 ? 33 - base.day : base.day;
    const next = adapter.addDays(base, direction * jump);
    return { year: next.year, month: next.month, day: 1 };
  } catch {
    return null;
  }
}

export type DisabledDatePolicy = {
  adapter: BsAdapter;
  minDate?: BsDate;
  maxDate?: BsDate;
  disableToday?: boolean;
  disableDate?: BsDate;
  disableDates: BsDate[];
  disableBefore?: BsDate;
  disableAfter?: BsDate;
  disabledDate?: (date: BsDate) => boolean;
};

export function createDisabledDatePredicate(policy: DisabledDatePolicy): (date: BsDate) => boolean {
  const {
    adapter,
    minDate,
    maxDate,
    disableToday,
    disableDate,
    disableDates,
    disableBefore,
    disableAfter,
    disabledDate,
  } = policy;

  return (date) => {
    const clampMinDiff = minDate ? safeDiffDays(adapter, minDate, date) : null;
    const clampMaxDiff = maxDate ? safeDiffDays(adapter, date, maxDate) : null;
    const todayDiff = disableToday ? safeDiffDays(adapter, adapter.today(), date) : null;
    const singleDiff = disableDate ? safeDiffDays(adapter, disableDate, date) : null;
    const clampMin = clampMinDiff === null ? true : clampMinDiff >= 0;
    const clampMax = clampMaxDiff === null ? true : clampMaxDiff >= 0;
    const isToday = disableToday && todayDiff === 0;
    const isSingle = singleDiff === 0;
    const isList = disableDates.some((disabled) => safeDiffDays(adapter, disabled, date) === 0);
    const beforeDiff = disableBefore ? safeDiffDays(adapter, date, disableBefore) : null;
    const afterDiff = disableAfter ? safeDiffDays(adapter, disableAfter, date) : null;
    const isBefore = beforeDiff === null ? false : beforeDiff > 0;
    const isAfter = afterDiff === null ? false : afterDiff > 0;
    return !clampMin || !clampMax || isToday || isSingle || isList || isBefore || isAfter || (disabledDate?.(date) ?? false);
  };
}

export function getYearOptions(viewYear: number, minYear?: number, maxYear?: number): number[] {
  if (minYear !== undefined && maxYear !== undefined && maxYear >= minYear) {
    return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  }
  if (minYear !== undefined && maxYear === undefined) {
    return Array.from({ length: Math.max(1, viewYear - minYear + 1) }, (_, index) => minYear + index);
  }
  if (minYear === undefined && maxYear !== undefined) {
    return Array.from({ length: Math.max(1, maxYear - viewYear + 1) }, (_, index) => viewYear + index);
  }
  return [viewYear];
}

export function maskDateInput(rawValue: string, formatInfo: FormatInfo): string {
  const maxDigits = formatInfo.tokens.reduce(
    (sum, token) => sum + (token === 'M' || token === 'D' || token === 'YY' ? 2 : 4),
    0
  );
  const digits = rawValue.replace(/[^0-9]/g, '').slice(0, maxDigits);
  let masked = digits;
  for (let index = formatInfo.insertPositions.length - 1; index >= 0; index--) {
    const position = formatInfo.insertPositions[index];
    if (masked.length > position) {
      masked = masked.slice(0, position) + formatInfo.separator + masked.slice(position);
    }
  }
  return masked;
}
