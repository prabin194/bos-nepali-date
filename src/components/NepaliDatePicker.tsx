import React, { useMemo, useState } from 'react';
import { BsAdapter, BsDate } from '../types';
import { CalendarGrid } from './CalendarGrid';
import { defaultAdapter } from '../adapter/memoryAdapter';
import { bsMonthNames, bsMonthNamesNe } from '../adapter/bsTable';
import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { PickerInput } from './PickerInput';
import { PickerHeader } from './PickerHeader';
import { PickerFooter } from './PickerFooter';
import { formatBs, normalizeDigitsToAscii, parseBs, toNepaliDigits } from './pickerUtils';

export type NepaliDatePickerProps = {
  label?: string;
  showLabel?: boolean;
  value?: BsDate | null;
  onChange?: (date: BsDate | null) => void;
  adapter?: BsAdapter;
  minDate?: BsDate;
  maxDate?: BsDate;
  disableToday?: boolean;
  disableDate?: BsDate;
  disableDates?: BsDate[];
  disableBefore?: BsDate;
  disableAfter?: BsDate;
  placeholder?: string;
  firstDayOfWeek?: 0 | 1;
  className?: string;
  inputClassName?: string;
  /**
   * Pattern attribute for the native input. Set to `false` to remove the pattern/validation entirely.
   */
  inputPattern?: string | false;
  showMonth?: boolean;
  showYear?: boolean;
  lang?: 'en' | 'ne';
};

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  label = 'Select date',
  showLabel = false,
  value = null,
  onChange,
  adapter = defaultAdapter,
  minDate,
  maxDate,
  disableToday = false,
  disableDate,
  disableDates = [],
  disableBefore,
  disableAfter,
  placeholder,
  firstDayOfWeek = 0,
  className,
  inputClassName,
  inputPattern = '\\d{4}-\\d{2}-\\d{2}',
  showMonth = true,
  showYear = true,
  lang = 'en',
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(formatBs(value));
  const initialMonth = value ?? adapter.today();
  const [viewMonth, setViewMonth] = useState<BsDate>({ ...initialMonth, day: 1 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);

  const disabled = useMemo(() => {
    return (date: BsDate) => {
      const clampMin = minDate ? adapter.diffDays(minDate, date) >= 0 : true;
      const clampMax = maxDate ? adapter.diffDays(date, maxDate) >= 0 : true;
      const isToday = disableToday && adapter.diffDays(adapter.today(), date) === 0;
      const isSingle = disableDate ? adapter.diffDays(disableDate, date) === 0 : false;
      const isList = disableDates.some((d) => adapter.diffDays(d, date) === 0);
      const isBefore = disableBefore ? adapter.diffDays(date, disableBefore) > 0 : false; // date earlier than threshold
      const isAfter = disableAfter ? adapter.diffDays(disableAfter, date) > 0 : false; // date later than threshold
      return !clampMin || !clampMax || isToday || isSingle || isList || isBefore || isAfter;
    };
  }, [adapter, minDate, maxDate, disableToday, disableDate, disableDates, disableBefore, disableAfter]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const normalized = normalizeDigitsToAscii(e.target.value);
    const digits = normalized.replace(/[^0-9]/g, '').slice(0, 8); // YYYYMMDD max
    const next =
      digits.length <= 4
        ? digits
        : digits.length <= 6
        ? `${digits.slice(0, 4)}-${digits.slice(4)}`
        : `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
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
  function handleClear() {
    onChange?.(null);
    setInput('');
    setOpen(false);
  }
  function handleToday() {
    const t = adapter.today();
    setViewMonth({ year: t.year, month: t.month, day: 1 });
    handleSelect(t);
  }

  const isNepali = lang === 'ne';
  const monthList = isNepali ? bsMonthNamesNe : bsMonthNames;
  const monthName = monthList[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');
  const placeholderText = placeholder ?? (isNepali ? 'YYYY-MM-DD (BS)' : 'YYYY-MM-DD (BS)');

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
      setMonthOpen(false);
      setYearOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        setMonthOpen(false);
        setYearOpen(false);
        return;
      }
      if (e.key === 'Tab' && popoverRef.current) {
        const focusables = Array.from(
          popoverRef.current.querySelectorAll<HTMLElement>('button,input')
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
        let nextIndex = currentIndex;
        if (e.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === -1 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }
        if (nextIndex !== currentIndex) {
          e.preventDefault();
          focusables[nextIndex].focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (monthOpen) {
      const active = monthMenuRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
      active?.scrollIntoView({ block: 'center' });
    }
  }, [monthOpen]);

  useEffect(() => {
    if (yearOpen) {
      const active = yearMenuRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
      active?.scrollIntoView({ block: 'center' });
    }
  }, [yearOpen, viewMonth.year]);

  return (
    <div className={clsx('np-picker', className)} ref={wrapperRef}>
      {showLabel && (
        <label className="np-popover__title" style={{ marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
          {label}
        </label>
      )}
      <PickerInput
        value={input}
        placeholder={placeholderText}
        inputClassName={inputClassName}
        inputPattern={inputPattern}
        label={label}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onToggle={() => setOpen((v) => !v)}
      />

      {open && (
        <div className="np-popover" role="dialog" aria-label="Nepali date picker" ref={popoverRef}>
          <PickerHeader
            showMonth={showMonth}
            showYear={showYear}
            monthName={monthName}
            monthList={monthList}
            viewYear={viewMonth.year}
            viewMonth={viewMonth.month}
            isNepali={isNepali}
            monthOpen={monthOpen}
            yearOpen={yearOpen}
            onToggleMonth={() => { setMonthOpen((v) => !v); setYearOpen(false); }}
            onToggleYear={() => { setYearOpen((v) => !v); setMonthOpen(false); }}
            onSelectMonth={(m) => { setViewMonth({ ...viewMonth, month: m, day: 1 }); setMonthOpen(false); }}
            onSelectYear={(y) => { setViewMonth({ ...viewMonth, year: y, day: 1 }); setYearOpen(false); }}
            moveMonth={moveMonth}
            monthMenuRef={monthMenuRef}
            yearMenuRef={yearMenuRef}
          />
          <CalendarGrid
            month={viewMonth}
            adapter={adapter}
            selected={value ?? null}
            onSelect={handleSelect}
            firstDayOfWeek={firstDayOfWeek}
            disabled={disabled}
            dowLabels={isNepali ? ['आ','सो','मं','बु','बि','शु','श'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']}
            formatDay={(d) => (isNepali ? toNepaliDigits(d) : String(d))}
          />
          <PickerFooter isNepali={isNepali} onClear={handleClear} onToday={handleToday} />
        </div>
      )}
    </div>
  );
};
