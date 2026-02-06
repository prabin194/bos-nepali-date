import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { BsAdapter, BsDate } from '../types';
import { CalendarGrid } from './CalendarGrid';
import { defaultAdapter } from '../adapter/memoryAdapter';
import { bsMonthNames } from '../adapter/bsTable';
import { useEffect, useRef } from 'react';

export type NepaliDatePickerProps = {
  label?: string;
  value?: BsDate | null;
  onChange?: (date: BsDate | null) => void;
  adapter?: BsAdapter;
  minDate?: BsDate;
  maxDate?: BsDate;
  placeholder?: string;
  firstDayOfWeek?: 0 | 1;
  className?: string;
};

function formatBs(date?: BsDate | null) {
  if (!date) return '';
  const { year, month, day } = date;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseBs(input: string): BsDate | null {
  const match = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return { year: Number(y), month: Number(m), day: Number(d) };
}

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  label = 'Select date',
  value = null,
  onChange,
  adapter = defaultAdapter,
  minDate,
  maxDate,
  placeholder = 'YYYY-MM-DD (BS)',
  firstDayOfWeek = 0,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(formatBs(value));
  const initialMonth = value ?? adapter.today();
  const [viewMonth, setViewMonth] = useState<BsDate>({ ...initialMonth, day: 1 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const disabled = useMemo(() => {
    return (date: BsDate) => {
      const clampMin = minDate ? adapter.diffDays(minDate, date) > 0 : true;
      const clampMax = maxDate ? adapter.diffDays(date, maxDate) > 0 : true;
      return !clampMin || !clampMax;
    };
  }, [adapter, minDate, maxDate]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setInput(next);
    const parsed = parseBs(next);
    if (!parsed) return;
    try {
      const iso = adapter.toAD(parsed);
      const bs = adapter.toBS(iso); // round-trip validation
      if (bs.year === parsed.year && bs.month === parsed.month && bs.day === parsed.day) {
        onChange?.(parsed);
        setViewMonth({ ...parsed, day: 1 });
      }
    } catch (err) {
      // ignore invalid
    }
  }

  function moveMonth(delta: number) {
    let next = { ...viewMonth };
    const step = delta > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(delta); i++) {
      // move by month
      const currentMonth = next.month;
      // jump 32 days in direction then set day 1
      next = adapter.addDays(next, step * 32);
      next = { year: next.year, month: next.month, day: 1 };
      // if overshoot months, roll back
      if (step === 1) {
        while (next.month === currentMonth) {
          next = adapter.addDays(next, 1);
        }
        next = { ...next, day: 1 };
      } else {
        while (next.month === currentMonth) {
          next = adapter.addDays(next, -1);
        }
        next = { year: next.year, month: next.month, day: 1 };
      }
    }
    setViewMonth(next);
  }

  function handleSelect(date: BsDate) {
    if (disabled(date)) return;
    onChange?.(date);
    setInput(formatBs(date));
    setViewMonth({ ...date, day: 1 });
    setOpen(false);
  }

  const monthName = bsMonthNames[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className={clsx('np-picker', className)} ref={wrapperRef}>
      <label className="np-popover__title" style={{ marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
        {label}
      </label>
      <div className="np-input-wrapper" onClick={() => setOpen(true)}>
        <input
          className="np-input"
          placeholder={placeholder}
          value={input}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
        />
        <button type="button" className="np-toggle" onClick={() => setOpen((v) => !v)}>
          ▾
        </button>
      </div>

      {open && (
        <div className="np-popover" role="dialog" aria-label="Nepali date picker">
          <div className="np-popover__header">
            <button type="button" className="np-popover__nav-btn" onClick={() => moveMonth(-1)} aria-label="Previous month">
              ‹
            </button>
            <div className="np-popover__title">
              {monthName} <span className="np-popover__year">{viewMonth.year}</span>
            </div>
            <button type="button" className="np-popover__nav-btn" onClick={() => moveMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>
          <CalendarGrid
            month={viewMonth}
            adapter={adapter}
            selected={value ?? null}
            onSelect={handleSelect}
            firstDayOfWeek={firstDayOfWeek}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};
