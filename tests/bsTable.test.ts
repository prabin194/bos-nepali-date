import { describe, it, expect } from 'vitest';
import { bsMonthData, bsRange } from '../src/adapter/bsTable';
import { defaultAdapter } from '../src/adapter/memoryAdapter';
import { isoToEpochDay } from '../src/utils/dateMath';

describe('bsMonthData shape and continuity', () => {
  const totalYears = bsMonthData.length / 12;
  const minYear = bsRange.minYear;
  const maxYear = bsRange.maxYear;

  it('covers a contiguous range matching bsRange', () => {
    expect(totalYears).toBe(100);
    expect(minYear).toBe(2000);
    expect(maxYear).toBe(2099);
  });

  it('has 12 months with plausible lengths for every year', () => {
    for (let y = 0; y < totalYears; y++) {
      const start = y * 12;
      const months = bsMonthData.slice(start, start + 12);
      expect(months.length).toBe(12);
      months.forEach((len) => {
        expect(len).toBeGreaterThanOrEqual(28);
        expect(len).toBeLessThanOrEqual(32);
      });
      const total = months.reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(354);
      expect(total).toBeLessThanOrEqual(367);
    }
  });
});

describe('defaultAdapter coverage', () => {
  const samples: { year: number; month: number; day: number }[] = [];

  // sample first day of each year plus mid-year dates to keep runtime light
  for (let y = bsRange.minYear; y <= bsRange.maxYear; y++) {
    samples.push({ year: y, month: 1, day: 1 });
    samples.push({ year: y, month: 6, day: 15 });
    samples.push({ year: y, month: 12, day: bsMonthData[(y - 2000) * 12 + 11] });
  }

  it('round-trips sampled BS -> AD -> BS', () => {
    samples.forEach((bs) => {
      const iso = defaultAdapter.toAD(bs);
      expect(defaultAdapter.toBS(iso)).toEqual(bs);
    });
  });

  it('produces increasing AD days for increasing sampled BS', () => {
    let prev = isoToEpochDay(defaultAdapter.toAD(samples[0]));
    for (let i = 1; i < samples.length; i++) {
      const day = isoToEpochDay(defaultAdapter.toAD(samples[i]));
      expect(day).toBeGreaterThan(prev);
      prev = day;
    }
  });
});
