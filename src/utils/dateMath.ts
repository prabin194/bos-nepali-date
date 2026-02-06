const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isoToEpochDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  return Math.floor(utc / MS_PER_DAY);
}

export function epochDayToIso(day: number): string {
  const date = new Date(day * MS_PER_DAY);
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function clamp<T>(value: T, min?: T, max?: T, cmp: (a: T, b: T) => number = (a, b) => (a as number) - (b as number)): T {
  let v = value;
  if (min !== undefined && cmp(v, min) < 0) v = min;
  if (max !== undefined && cmp(v, max) > 0) v = max;
  return v;
}
