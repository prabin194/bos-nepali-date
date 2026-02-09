import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isoToEpochDay, epochDayToIso, clamp } from '../src/utils/dateMath';
import { MemoryBsAdapter, defaultAdapter } from '../src/adapter/memoryAdapter';
import { bsMonthData, bsRange } from '../src/adapter/bsTable';

describe('dateMath helpers', () => {
  it('converts ISO to epoch day and back (round trip)', () => {
    const iso = '2024-01-02';
    const day = isoToEpochDay(iso);
    expect(epochDayToIso(day)).toBe(iso);
  });

  it('treats 1970-01-01 as epoch day 0', () => {
    expect(isoToEpochDay('1970-01-01')).toBe(0);
    expect(epochDayToIso(0)).toBe('1970-01-01');
    expect(epochDayToIso(1)).toBe('1970-01-02');
  });

  it('clamps values using default comparator', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(11, 1, 10)).toBe(10);
  });

  it('clamps complex values using a custom comparator', () => {
    type Point = { x: number };
    const cmp = (a: Point, b: Point) => a.x - b.x;
    expect(clamp({ x: 5 }, { x: 2 }, { x: 6 }, cmp)).toEqual({ x: 5 });
    expect(clamp({ x: 1 }, { x: 2 }, { x: 6 }, cmp)).toEqual({ x: 2 });
    expect(clamp({ x: 9 }, { x: 2 }, { x: 6 }, cmp)).toEqual({ x: 6 });
  });
});

describe('MemoryBsAdapter', () => {
  const adapter = defaultAdapter;

  it('round-trips BS -> AD -> BS', () => {
    const bs = { year: 2000, month: 1, day: 1 } as const;
    const iso = adapter.toAD(bs);
    expect(iso).toBe('1943-04-14');
    expect(adapter.toBS(iso)).toEqual(bs);
  });

  it('adds days across month and year boundaries (forward only within dataset)', () => {
    const start = { year: 2000, month: 1, day: 30 } as const; // month 1 length = 30
    expect(adapter.addDays(start, 1)).toEqual({ year: 2000, month: 2, day: 1 });
    expect(adapter.addDays(start, 5)).toEqual({ year: 2000, month: 2, day: 5 });

    const endOfYear = { year: 2000, month: 12, day: bsMonthData[2000][11] } as const;
    expect(adapter.addDays(endOfYear, 1)).toEqual({ year: 2001, month: 1, day: 1 });
  });

  it('computes day differences symmetrically', () => {
    const a = { year: 2000, month: 1, day: 1 } as const;
    const b = { year: 2000, month: 1, day: 10 } as const;
    expect(adapter.diffDays(a, b)).toBe(9);
    expect(adapter.diffDays(b, a)).toBe(-9);
  });

  describe('today() clamping', () => {
    const realDateNow = Date.now;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('clamps to max supported date when system date is beyond dataset', () => {
      // Push system clock far beyond supported range
      vi.setSystemTime(new Date('2200-01-01T00:00:00Z'));
      expect(adapter.today()).toEqual({
        year: bsRange.maxYear,
        month: 12,
        day: bsMonthData[bsRange.maxYear][11],
      });
    });

    it('clamps to min supported date when system date is before dataset', () => {
      vi.setSystemTime(new Date('1900-01-01T00:00:00Z'));
      expect(adapter.today()).toEqual({ year: bsRange.minYear, month: 1, day: 1 });
    });
  });

  it('throws for unsupported BS year', () => {
    const adapterLimited = new MemoryBsAdapter({
      anchorBs: { year: 2080, month: 1, day: 1 },
      anchorAdIso: '2023-04-14',
      yearTable: { 2080: bsMonthData[2080] },
    });
    expect(() => adapterLimited.toAD({ year: 2079, month: 12, day: 30 })).toThrow(/not supported/);
    expect(() => adapterLimited.addDays({ year: 2080, month: 1, day: 1 }, -1)).toThrow(/not supported/);
  });
});
