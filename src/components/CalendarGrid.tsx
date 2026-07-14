import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '../utils/classnames';
import { BsAdapter, BsDate } from '../types';

export type CellRenderInfo = {
  date: BsDate;
  today: boolean;
  selected: boolean;
  disabled: boolean;
  inCurrentMonth: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  inRange: boolean;
};

const MONTH_NAMES = ['', 'Baishak', 'Jestha', 'Ashar', 'Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangshir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const MONTH_NAMES_NE = ['', 'बैशाख', 'जेठ', 'आषाढ़', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुण', 'चैत्र'];

function cellAriaLabel(date: BsDate, isNepali?: boolean): string {
  const monthName = isNepali ? MONTH_NAMES_NE[date.month] : MONTH_NAMES[date.month];
  return `${date.day} ${monthName}, ${date.year} BS`;
}

export type CalendarGridProps = {
  month: BsDate; // any day in the month; day is ignored
  adapter: BsAdapter;
  firstDayOfWeek?: 0 | 1; // 0 Sunday, 1 Monday
  onSelect?: (date: BsDate) => void;
  onHover?: (date: BsDate | null) => void; // hover for range preview
  selected?: BsDate | null;
  rangeEnd?: BsDate | null; // end of range (range picker); also styled as selected
  inRange?: (date: BsDate) => boolean;
  disabled?: (date: BsDate) => boolean;
  cellRender?: (date: BsDate, info: CellRenderInfo) => React.ReactNode;
  className?: string; // wrapper class
  cellClassName?: string; // cell class
  /** Month list for aria-labels on calendar cells. Pass full array (index 0 empty). @default ['', 'Baishak', ...] */
  monthNames?: string[];
  /** Whether the interface is in Nepali (affects aria-labels). @default false */
  isNepali?: boolean;
  dowLabels?: string[];
  formatDay?: (day: number) => string;
};

function sameDay(a?: BsDate | null, b?: BsDate | null) {
  return !!a && !!b && a.year === b.year && a.month === b.month && a.day === b.day;
}

function daysInMonth(base: BsDate, adapter: BsAdapter): number {
  let count = 1;
  const start = { ...base, day: 1 };
  let next = adapter.addDays(start, 1);
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
  onHover,
  selected,
  rangeEnd,
  inRange,
  disabled,
  cellRender,
  className,
  cellClassName,
  monthNames,
  isNepali = false,
  dowLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  formatDay = (d) => String(d),
}) => {
  const today = adapter.today();
  const firstOfMonth: BsDate = { ...month, day: 1 };
  const totalDays = daysInMonth(firstOfMonth, adapter);
  const leadingEmpty = (weekday(firstOfMonth, adapter) - firstDayOfWeek + 7) % 7;

  const cells = useMemo<Array<{ date?: BsDate; inCurrentMonth: boolean; outOfRange?: boolean }>>(() => {
    const result: Array<{ date?: BsDate; inCurrentMonth: boolean; outOfRange?: boolean }> = [];

    // previous month spill
    let prev: BsDate | undefined;
    try {
      prev = adapter.addDays(firstOfMonth, -1);
    } catch {
      prev = undefined;
    }
    for (let i = 0; i < leadingEmpty; i++) {
      result.unshift({ date: prev, inCurrentMonth: false, outOfRange: !prev });
      if (prev) {
        try {
          prev = adapter.addDays(prev, -1);
        } catch {
          prev = undefined;
        }
      }
    }

    // current month
    for (let d = 1; d <= totalDays; d++) {
      result.push({ date: { ...month, day: d }, inCurrentMonth: true });
    }

    // fill to 42 cells (6 weeks)
    while (result.length < 42) {
      const last = result[result.length - 1].date;
      if (!last) {
        result.push({ inCurrentMonth: false, outOfRange: true });
        continue;
      }
      try {
        const next = adapter.addDays(last, 1);
        result.push({ date: next, inCurrentMonth: false });
      } catch {
        result.push({ inCurrentMonth: false, outOfRange: true });
      }
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.year, month.month, totalDays, leadingEmpty, firstDayOfWeek, adapter]);

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const findFocusable = useCallback((startIdx: number, direction: number): number => {
    let idx = startIdx;
    for (let attempt = 0; attempt < cells.length; attempt++) {
      idx = (idx + direction + cells.length) % cells.length;
      const c = cells[idx];
      if (c.date && !c.outOfRange && !disabled?.(c.date)) return idx;
    }
    return -1;
  }, [cells, disabled]);

  function handleGridKeyDown(e: React.KeyboardEvent) {
    let newIndex = focusedIndex;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = findFocusable(focusedIndex >= 0 ? focusedIndex : 0, -1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = findFocusable(focusedIndex >= 0 ? focusedIndex : -1, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = findFocusable(focusedIndex >= 0 ? focusedIndex : 0, -7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = findFocusable(focusedIndex >= 0 ? focusedIndex : -1, 7);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && cells[focusedIndex]?.date && !isCellDisabled(cells[focusedIndex])) {
          onSelect?.(cells[focusedIndex].date!);
        }
        return;
      default:
        return;
    }
    if (newIndex >= 0 && newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
    }
  }

  function isCellDisabled(c: { date?: BsDate; outOfRange?: boolean }): boolean {
    return c.outOfRange || (c.date ? disabled?.(c.date) : true) || false;
  }

  return (
    <div
      className={cn('np-cal-grid', className)}
      role="grid"
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
      aria-label={isNepali ? `${monthNames?.[month.month] ?? ''} ${month.year}` : `${monthNames?.[month.month] ?? ''} ${month.year}`}
    >
      <div role="row" className="np-cal-grid__row">
        {dowLabels
          .slice(firstDayOfWeek)
          .concat(dowLabels.slice(0, firstDayOfWeek))
          .map((label, i) => (
            <div key={label} role="columnheader" aria-colindex={i + 1} className="np-cal-dow" aria-label={label}>{label}</div>
          ))}
      </div>
      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => (
        <div key={rowIdx} role="row" className="np-cal-grid__row">
          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map(({ date, inCurrentMonth, outOfRange }, colIdx) => {
            const isSelected = sameDay(date, selected);
            const isRangeEnd = sameDay(date, rangeEnd);
            const isDisabled = outOfRange || (date ? disabled?.(date) : true) || false;
            const isInRange = date ? inRange?.(date) ?? false : false;
            const isToday = sameDay(date, today);

            const cellContent = date && cellRender ? cellRender(date, {
              date,
              today: isToday,
              selected: isSelected,
              disabled: isDisabled,
              inCurrentMonth,
              isRangeStart: isSelected && !!rangeEnd,
              isRangeEnd: isRangeEnd && !isSelected,
              inRange: isInRange,
            }) : undefined;

            const cellIdx = rowIdx * 7 + colIdx;
            const isFocused = cellIdx === focusedIndex;

            return (
              <button
                key={date ? `${date.year}-${date.month}-${date.day}` : `empty-${rowIdx}-${colIdx}`}
                type="button"
                role="gridcell"
                aria-colindex={colIdx + 1}
                aria-label={date ? cellAriaLabel(date, isNepali) : undefined}
                aria-selected={isSelected || undefined}
                tabIndex={isFocused ? 0 : -1}
                className={cn(
                  'np-cal-cell',
                  cellClassName,
                  !inCurrentMonth && 'np-cal-cell--muted',
                  isSelected && 'np-cal-cell--selected',
                  isRangeEnd && !isSelected && 'np-cal-cell--selected',
                  isInRange && !isSelected && !isRangeEnd && 'np-cal-cell--range',
                  isToday && !isSelected && !isRangeEnd && 'np-cal-cell--today',
                  isFocused && !isSelected && !isRangeEnd && 'np-cal-cell--focused'
                )}
                onClick={() => !isDisabled && date && onSelect?.(date)}
                onMouseEnter={() => !isDisabled && date && onHover?.(date)}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => { if (cellIdx !== focusedIndex && date && !isDisabled) setFocusedIndex(cellIdx); }}
                disabled={isDisabled}
                aria-disabled={isDisabled || undefined}
              >
                {cellContent ?? <span className="np-cal-day">{date ? formatDay(date.day) : ''}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
