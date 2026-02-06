import React from 'react';
import clsx from 'clsx';
import { BsAdapter, BsDate } from '../types';

export type CalendarGridProps = {
  month: BsDate; // any day in the month; day is ignored
  adapter: BsAdapter;
  firstDayOfWeek?: 0 | 1; // 0 Sunday, 1 Monday
  onSelect?: (date: BsDate) => void;
  selected?: BsDate | null;
  inRange?: (date: BsDate) => boolean;
  disabled?: (date: BsDate) => boolean;
  dowLabels?: string[];
  formatDay?: (day: number) => string;
};

function sameDay(a?: BsDate | null, b?: BsDate | null) {
  return !!a && !!b && a.year === b.year && a.month === b.month && a.day === b.day;
}

function daysInMonth(base: BsDate, adapter: BsAdapter): number {
  let count = 1;
  let cur = { ...base, day: 1 };
  let next = adapter.addDays(cur, 1);
  while (next.month === base.month && next.year === base.year) {
    count += 1;
    next = adapter.addDays(next, 1);
  }
  return count;
}

function weekday(bs: BsDate, adapter: BsAdapter): number {
  const iso = adapter.toAD(bs);
  const d = new Date(`${iso}T00:00:00Z`);
  return d.getUTCDay(); // 0 Sunday
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  month,
  adapter,
  firstDayOfWeek = 0,
  onSelect,
  selected,
  inRange,
  disabled,
  dowLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  formatDay = (d) => String(d),
}) => {
  const today = adapter.today();
  const firstOfMonth: BsDate = { ...month, day: 1 };
  const totalDays = daysInMonth(firstOfMonth, adapter);
  const leadingEmpty = (weekday(firstOfMonth, adapter) - firstDayOfWeek + 7) % 7;
  const cells: Array<{ date: BsDate; inCurrentMonth: boolean }> = [];

  // previous month spill
  let prev = adapter.addDays(firstOfMonth, -1);
  for (let i = 0; i < leadingEmpty; i++) {
    cells.unshift({ date: prev, inCurrentMonth: false });
    prev = adapter.addDays(prev, -1);
  }

  // current month
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ date: { ...month, day: d }, inCurrentMonth: true });
  }

  // fill to 42 cells (6 weeks)
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: adapter.addDays(last, 1), inCurrentMonth: false });
  }

  return (
    <div className="np-cal-grid">
      {dowLabels
        .slice(firstDayOfWeek)
        .concat(dowLabels.slice(0, firstDayOfWeek))
        .map((label) => (
          <div key={label} className="np-cal-dow">{label}</div>
        ))}
      {cells.map(({ date, inCurrentMonth }) => {
        const isSelected = sameDay(date, selected);
        const isDisabled = disabled?.(date) ?? false;
        const isRange = inRange?.(date) ?? false;
        const isToday = sameDay(date, today);
        return (
          <button
            key={`${date.year}-${date.month}-${date.day}`}
            type="button"
            className={clsx(
              'np-cal-cell',
              !inCurrentMonth && 'np-cal-cell--muted',
              isSelected && 'np-cal-cell--selected',
              isRange && !isSelected && 'np-cal-cell--range',
              isToday && !isSelected && 'np-cal-cell--today'
            )}
            onClick={() => !isDisabled && onSelect?.(date)}
            disabled={isDisabled}
          >
            <span className="np-cal-day">{formatDay(date.day)}</span>
          </button>
        );
      })}
    </div>
  );
};
