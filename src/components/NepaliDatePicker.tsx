import React, { useCallback, useMemo, useState, useReducer, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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

export type DisableOptions = {
  today?: boolean;
  date?: BsDate;
  dates?: BsDate[];
  before?: BsDate;
  after?: BsDate;
};

export type MenuOptions = {
  showMonth?: boolean;
  showYear?: boolean;
  firstDayOfWeek?: 0 | 1;
  lang?: 'en' | 'ne';
};

const EMPTY_DATES: BsDate[] = [];
const EMPTY_DISABLE: DisableOptions = {};
const EMPTY_MENU: MenuOptions = {};

type PickerUIState = {
  open: boolean;
  monthOpen: boolean;
  yearOpen: boolean;
  viewMonth: BsDate;
};

type PickerUIAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE_OPEN' }
  | { type: 'TOGGLE_MONTH' }
  | { type: 'TOGGLE_YEAR' }
  | { type: 'SELECT_MONTH'; month: number }
  | { type: 'SELECT_YEAR'; year: number }
  | { type: 'SET_VIEW_MONTH'; viewMonth: BsDate };

function pickerUIReducer(state: PickerUIState, action: PickerUIAction): PickerUIState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, open: true };
    case 'CLOSE':
      return { ...state, open: false, monthOpen: false, yearOpen: false };
    case 'TOGGLE_OPEN':
      return { ...state, open: !state.open, monthOpen: false, yearOpen: false };
    case 'TOGGLE_MONTH':
      return { ...state, monthOpen: !state.monthOpen, yearOpen: false };
    case 'TOGGLE_YEAR':
      return { ...state, yearOpen: !state.yearOpen, monthOpen: false };
    case 'SELECT_MONTH':
      return { ...state, viewMonth: { ...state.viewMonth, month: action.month, day: 1 }, monthOpen: false };
    case 'SELECT_YEAR':
      return { ...state, viewMonth: { ...state.viewMonth, year: action.year, day: 1 }, yearOpen: false };
    case 'SET_VIEW_MONTH':
      return { ...state, viewMonth: action.viewMonth };
    default:
      return state;
  }
}

export type NepaliDatePickerProps = {
  label?: string;
  showLabel?: boolean;
  value?: BsDate | null;
  onChange?: (date: BsDate | null) => void;
  adapter?: BsAdapter;
  minDate?: BsDate;
  maxDate?: BsDate;
  disable?: DisableOptions;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /**
   * Pattern attribute for the native input. Set to `false` to remove the pattern/validation entirely.
   */
  inputPattern?: string | false;
  menu?: MenuOptions;
};

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  label = 'Select date',
  showLabel = false,
  value = null,
  onChange,
  adapter = defaultAdapter,
  minDate,
  maxDate,
  disable = EMPTY_DISABLE,
  placeholder,
  className,
  inputClassName,
  inputPattern = '\\d{4}-\\d{2}-\\d{2}',
  menu = EMPTY_MENU,
}) => {
  const {
    today: disableToday = false,
    date: disableDate,
    dates: disableDates = EMPTY_DATES,
    before: disableBefore,
    after: disableAfter,
  } = disable;

  const {
    showMonth = true,
    showYear = true,
    firstDayOfWeek = 0,
    lang = 'en',
  } = menu;
  const [uiState, dispatch] = useReducer(pickerUIReducer, {
    open: false,
    monthOpen: false,
    yearOpen: false,
    viewMonth: { ...(value ?? adapter.today()), day: 1 },
  });
  const { open, monthOpen, yearOpen, viewMonth } = uiState;

  const [input, setInput] = useState(() => formatBs(value));
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);

  const safeDiffDays = useCallback((date1: BsDate, date2: BsDate): number | null => {
    try {
      return adapter.diffDays(date1, date2);
    } catch {
      return null;
    }
  }, [adapter]);

  function shiftMonth(base: BsDate, direction: 1 | -1): BsDate | null {
    try {
      let next = adapter.addDays(base, direction * 32);
      next = { year: next.year, month: next.month, day: 1 };
      const originalMonth = base.month;
      const originalYear = base.year;

      while (next.year === originalYear && next.month === originalMonth) {
        next = adapter.addDays(next, direction);
      }

      return { year: next.year, month: next.month, day: 1 };
    } catch {
      return null;
    }
  }

  const disabled = useMemo(() => {
    return (date: BsDate) => {
      const clampMinDiff = minDate ? safeDiffDays(minDate, date) : null;
      const clampMaxDiff = maxDate ? safeDiffDays(date, maxDate) : null;
      const todayDiff = disableToday ? safeDiffDays(adapter.today(), date) : null;
      const singleDiff = disableDate ? safeDiffDays(disableDate, date) : null;
      const clampMin = clampMinDiff === null ? true : clampMinDiff >= 0;
      const clampMax = clampMaxDiff === null ? true : clampMaxDiff >= 0;
      const isToday = disableToday && todayDiff === 0;
      const isSingle = singleDiff === 0;
      const isList = disableDates.some((d) => safeDiffDays(d, date) === 0);
      const beforeDiff = disableBefore ? safeDiffDays(date, disableBefore) : null;
      const afterDiff = disableAfter ? safeDiffDays(disableAfter, date) : null;
      const isBefore = beforeDiff === null ? false : beforeDiff > 0; // date earlier than threshold
      const isAfter = afterDiff === null ? false : afterDiff > 0; // date later than threshold
      return !clampMin || !clampMax || isToday || isSingle || isList || isBefore || isAfter;
    };
  }, [adapter, safeDiffDays, minDate, maxDate, disableToday, disableDate, disableDates, disableBefore, disableAfter]);

  useEffect(() => {
    const formatted = formatBs(value);
    if (parseBs(input)?.year !== value?.year || parseBs(input)?.month !== value?.month || parseBs(input)?.day !== value?.day) {
      setInput(formatted);
    }
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...(value ?? adapter.today()), day: 1 } });
  }, [value, adapter]);

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
      if (bs.year === parsed.year && bs.month === parsed.month && bs.day === parsed.day && !disabled(parsed)) {
        onChange?.(parsed);
        dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...parsed, day: 1 } });
      }
    } catch (err) {
      // ignore invalid
    }
  }

  function moveMonth(delta: number) {
    let next = { ...viewMonth };
    const step = delta > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(delta); i++) {
      const shifted = shiftMonth(next, step);
      if (!shifted) {
        return;
      }
      next = shifted;
    }
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: next });
  }

  function handleSelect(date: BsDate) {
    if (disabled(date)) return;
    onChange?.(date);
    setInput(formatBs(date));
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...date, day: 1 } });
    dispatch({ type: 'CLOSE' });
  }
  function handleClear() {
    onChange?.(null);
    setInput('');
    dispatch({ type: 'CLOSE' });
  }
  function handleToday() {
    const t = adapter.today();
    handleSelect(t);
  }

  const isNepali = lang === 'ne';
  const monthList = isNepali ? bsMonthNamesNe : bsMonthNames;
  const monthName = monthList[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');
  const placeholderText = placeholder ?? (isNepali ? 'YYYY-MM-DD (BS)' : 'YYYY-MM-DD (BS)');
  const canMovePrev = shiftMonth(viewMonth, -1) !== null;
  const canMoveNext = shiftMonth(viewMonth, 1) !== null;
  const rangeMinYear = adapter.range?.min?.year;
  const rangeMaxYear = adapter.range?.max?.year;
  const yearOptions =
    rangeMinYear !== undefined && rangeMaxYear !== undefined && rangeMaxYear >= rangeMinYear
      ? Array.from({ length: rangeMaxYear - rangeMinYear + 1 }, (_, i) => rangeMinYear + i)
      : rangeMinYear !== undefined && rangeMaxYear === undefined
      ? Array.from({ length: Math.max(1, viewMonth.year - rangeMinYear + 1) }, (_, i) => rangeMinYear + i)
      : rangeMinYear === undefined && rangeMaxYear !== undefined
      ? Array.from({ length: Math.max(1, rangeMaxYear - viewMonth.year + 1) }, (_, i) => viewMonth.year + i)
      : [viewMonth.year];

  function updatePopoverPosition() {
    if (!wrapperRef.current || typeof window === 'undefined') return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.max(0, Math.min(320, viewportWidth - viewportPadding * 2));
    const width = Math.max(0, Math.min(maxWidth, Math.max(rect.width, 280)));

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + width > viewportWidth - viewportPadding) {
      left = viewportWidth - width - viewportPadding;
    }
    left = Math.max(viewportPadding, left);

    const top = openUp ? Math.max(viewportPadding, rect.top - gap) : Math.min(viewportHeight - viewportPadding, rect.bottom + gap);

    setPopoverStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
      zIndex: 9999,
      transform: openUp ? 'translateY(-100%)' : undefined,
    });
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      dispatch({ type: 'CLOSE' });
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        dispatch({ type: 'CLOSE' });
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

  useLayoutEffect(() => {
    if (!open) return;

    updatePopoverPosition();

    function onReposition() {
      updatePopoverPosition();
    }

    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, monthOpen, yearOpen, viewMonth.year, viewMonth.month]);

  function handleToggleMonth() {
    const wasOpen = monthOpen;
    dispatch({ type: 'TOGGLE_MONTH' });
    if (!wasOpen) {
      requestAnimationFrame(() => {
        const active = monthMenuRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
        active?.scrollIntoView?.({ block: 'center' });
      });
    }
  }

  function handleToggleYear() {
    const wasOpen = yearOpen;
    dispatch({ type: 'TOGGLE_YEAR' });
    if (!wasOpen) {
      requestAnimationFrame(() => {
        const active = yearMenuRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
        active?.scrollIntoView?.({ block: 'center' });
      });
    }
  }

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
        onFocus={() => dispatch({ type: 'OPEN' })}
        onToggle={() => dispatch({ type: 'TOGGLE_OPEN' })}
      />

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className="np-popover" style={popoverStyle} role="dialog" aria-label="Nepali date picker" ref={popoverRef}>
              <PickerHeader
                showMonth={showMonth}
                showYear={showYear}
                monthName={monthName}
                monthList={monthList}
                viewYear={viewMonth.year}
                viewMonth={viewMonth.month}
                yearOptions={yearOptions}
                isNepali={isNepali}
                monthOpen={monthOpen}
                yearOpen={yearOpen}
                canMovePrev={canMovePrev}
                canMoveNext={canMoveNext}
                onToggleMonth={handleToggleMonth}
                onToggleYear={handleToggleYear}
                onSelectMonth={(m) => dispatch({ type: 'SELECT_MONTH', month: m })}
                onSelectYear={(y) => dispatch({ type: 'SELECT_YEAR', year: y })}

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
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
