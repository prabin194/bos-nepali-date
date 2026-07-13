import React, { useCallback, useMemo, useState, useReducer, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BsAdapter, BsDate, DateFormat } from '../types';
import { CalendarGrid } from './CalendarGrid';
import { defaultAdapter } from '../adapter/memoryAdapter';
import { bsMonthNames, bsMonthNamesNe } from '../adapter/bsTable';
import { useEffect, useRef } from 'react';
import { cn } from '../utils/classnames';
import { PickerFooter } from './PickerFooter';
import { formatBs, normalizeDigitsToAscii, parseBs, toNepaliDigits, getFormatInfo, generateInputPattern } from './pickerUtils';
import type { CellRenderInfo } from './CalendarGrid';
import type { DisableOptions, MenuOptions, PickerSize, PickerStatus, PickerVariant, PickerPlacement } from './NepaliDatePicker';

// Re-export types shared with single picker
export type { DisableOptions, MenuOptions, PickerSize, PickerStatus, PickerVariant, PickerPlacement };

/** A single preset entry for quick range selection. */
export type Preset = {
  label: string;
  value: [BsDate, BsDate];
};

const EMPTY_DATES: BsDate[] = [];
const EMPTY_DISABLE: DisableOptions = {};
const EMPTY_MENU: MenuOptions = {};
const EMPTY_PRESETS: Preset[] = [];

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

export type NepaliDateRangePickerProps = {
  /** Label for the range picker group. */
  label?: string;
  showLabel?: boolean;
  /** Controlled range value: [start, end]. */
  value?: [BsDate | null, BsDate | null];
  /** Default value for uncontrolled usage. Only used when `value` is not provided. */
  defaultValue?: [BsDate | null, BsDate | null];
  /** Called when the range changes. */
  onChange?: (dates: [BsDate | null, BsDate | null]) => void;
  adapter?: BsAdapter;
  minDate?: BsDate;
  maxDate?: BsDate;
  disable?: DisableOptions;
  placeholder?: string;
  /** Separate placeholder for the end input. Falls back to `placeholder`. */
  endPlaceholder?: string;
  /** Separator displayed between the two inputs. @default '→' */
  separator?: string;
  className?: string;
  menu?: MenuOptions;
  inputPattern?: string | false;
  /** Callback to dynamically disable individual dates. */
  disabledDate?: (date: BsDate) => boolean;
  /** Controlled popover visibility. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: PickerSize;
  status?: PickerStatus;
  allowClear?: boolean;
  disabled?: boolean;
  /** Visual variant. @default 'outlined' */
  variant?: PickerVariant;
  /** Popover placement. @default 'bottomLeft' */
  placement?: PickerPlacement;
  /** Custom DOM container for the popover portal. */
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
  /** Prevents keyboard input. @default false */
  inputReadOnly?: boolean;
  /** Auto-focus the start input on mount. @default false */
  autoFocus?: boolean;
  /** Custom React node rendered at the bottom of the popover. */
  renderExtraFooter?: () => React.ReactNode;
  /** Called when the start input gains focus. */
  onFocus?: () => void;
  /** Called when the start input loses focus. */
  onBlur?: () => void;
  /** Called on keydown on either input. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Called when the calendar panel changes (month/year navigation). */
  onPanelChange?: (date: BsDate) => void;
  /** Custom cell renderer for day cells. */
  cellRender?: (date: BsDate, info: CellRenderInfo) => React.ReactNode;
  /** Native `name` attribute for the start date input. */
  name?: string;
  /** Native `name` attribute for the end date input. */
  nameEnd?: string;
  /** Quick-select preset ranges displayed above the footer. */
  presets?: Preset[];
  /** Semantic class names for sub-elements. Keys: input, popup, header, grid, cell, footer. */
  classNames?: { input?: string; popup?: string; header?: string; grid?: string; cell?: string; footer?: string };
  /** Semantic inline styles for sub-elements. */
  styles?: { input?: React.CSSProperties; popup?: React.CSSProperties; header?: React.CSSProperties; grid?: React.CSSProperties; footer?: React.CSSProperties };
  /** Date display/input format. @default 'YYYY-MM-DD' */
  dateFormat?: DateFormat;
};

export const NepaliDateRangePicker: React.FC<NepaliDateRangePickerProps> = ({
  label = 'Select date range',
  showLabel = false,
  value,
  defaultValue,
  onChange,
  adapter = defaultAdapter,
  minDate,
  maxDate,
  disable = EMPTY_DISABLE,
  placeholder,
  endPlaceholder,
  separator = '→',
  className,
  menu = EMPTY_MENU,
  inputPattern,
  disabledDate,
  open: controlledOpen,
  onOpenChange,
  size = 'middle',
  status,
  allowClear = false,
  disabled: isPickerDisabled = false,
  variant = 'outlined',
  placement = 'bottomLeft',
  getPopupContainer,
  inputReadOnly = false,
  autoFocus = false,
  renderExtraFooter,
  cellRender,
  onFocus: onFocusProp,
  onBlur,
  onKeyDown,
  onPanelChange,
  name,
  nameEnd,
  presets = EMPTY_PRESETS,
  classNames: semanticClassNames,
  styles: semanticStyles,
  dateFormat = 'YYYY-MM-DD',
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
    yearRange,
  } = menu;

  const isControlledValue = value !== undefined;
  const controlledStart = isControlledValue ? (value?.[0] ?? null) : null;
  const controlledEnd = isControlledValue ? (value?.[1] ?? null) : null;

  const defaultValueStart = defaultValue?.[0] ?? null;
  const defaultValueEnd = defaultValue?.[1] ?? null;
  const [internalRangeStart, setInternalRangeStart] = useState<BsDate | null>(defaultValueStart);
  const [internalRangeEnd, setInternalRangeEnd] = useState<BsDate | null>(defaultValueEnd);

  const initialRefDate = isControlledValue ? controlledStart : defaultValueStart;
  const [uiState, dispatch] = useReducer(pickerUIReducer, {
    open: false,
    monthOpen: false,
    yearOpen: false,
    viewMonth: {
      ...(initialRefDate ?? adapter.today()),
      day: 1,
    },
  });
  const { open: internalOpen, monthOpen, yearOpen, viewMonth } = uiState;

  const isControlled = controlledOpen !== undefined;
  const isPickerOpen = isControlled ? controlledOpen : internalOpen;

  const rangeStart = isControlledValue ? controlledStart : internalRangeStart;
  const rangeEnd = isControlledValue ? controlledEnd : internalRangeEnd;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const onPanelChangeRef = useRef(onPanelChange);
  onPanelChangeRef.current = onPanelChange;
  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const [hoverDate, setHoverDate] = useState<BsDate | null>(null);
  const formatInfo = useMemo(() => getFormatInfo(dateFormat), [dateFormat]);
  const resolvedPattern: string | undefined = inputPattern === false ? undefined : (inputPattern ?? generateInputPattern(dateFormat));

  const [startInput, setStartInput] = useState(() => formatBs(rangeStart, dateFormat));
  const [endInput, setEndInput] = useState(() => formatBs(rangeEnd, dateFormat));
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isPickerOpen) {
      requestAnimationFrame(() => {
        const firstFocusable = popoverRef.current?.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled])');
        firstFocusable?.focus();
      });
    }
  }, [isPickerOpen]);

  // Sync inputs when controlled value changes
  useEffect(() => {
    setStartInput(formatBs(rangeStart, dateFormat));
  }, [rangeStart, dateFormat]);

  useEffect(() => {
    setEndInput(formatBs(rangeEnd, dateFormat));
  }, [rangeEnd, dateFormat]);

  useEffect(() => {
    const refDate = rangeStart ?? rangeEnd ?? adapter.today();
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...refDate, day: 1 } });
  }, [rangeStart]);

  useEffect(() => {
    const refDate = rangeStart ?? rangeEnd ?? adapter.today();
    if (rangeEnd && !rangeStart) {
      dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...refDate, day: 1 } });
    }
  }, [rangeEnd, rangeStart, adapter]);

  const safeDiffDays = useCallback((date1: BsDate, date2: BsDate): number | null => {
    try {
      return adapter.diffDays(date1, date2);
    } catch {
      return null;
    }
  }, [adapter]);

  function shiftMonth(base: BsDate, direction: 1 | -1): BsDate | null {
    try {
      // (33 - day) days forward or (day) days back always crosses exactly one month boundary
      const jump = direction === 1 ? 33 - base.day : base.day;
      const next = adapter.addDays(base, direction * jump);
      return { year: next.year, month: next.month, day: 1 };
    } catch {
      return null;
    }
  }

  const isDateDisabled = useMemo(() => {
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
      const isBefore = beforeDiff === null ? false : beforeDiff > 0;
      const isAfter = afterDiff === null ? false : afterDiff > 0;
      const fromCallback = disabledDate?.(date) ?? false;
      return !clampMin || !clampMax || isToday || isSingle || isList || isBefore || isAfter || fromCallback;
    };
  }, [adapter, safeDiffDays, minDate, maxDate, disableToday, disableDate, disableDates, disableBefore, disableAfter, disabledDate]);

  function openPicker() {
    const cb = onOpenChangeRef.current;
    if (cb) cb(true);
    if (!isControlledRef.current) dispatch({ type: 'OPEN' });
  }

  function closePicker() {
    setHoverDate(null);
    const cb = onOpenChangeRef.current;
    if (cb) cb(false);
    if (!isControlledRef.current) dispatch({ type: 'CLOSE' });
  }

  function closePickerAndReturnFocus() {
    closePicker();
    requestAnimationFrame(() => {
      wrapperRef.current?.querySelector<HTMLElement>('input')?.focus();
    });
  }

  function togglePicker() {
    if (onOpenChangeRef.current) onOpenChangeRef.current(!isPickerOpen);
    if (!isControlledRef.current) dispatch({ type: 'TOGGLE_OPEN' });
  }

  function emitRange(start: BsDate | null, end: BsDate | null) {
    if (!isControlledValue) {
      setInternalRangeStart(start);
      setInternalRangeEnd(end);
    }
    setStartInput(formatBs(start, dateFormat));
    setEndInput(formatBs(end, dateFormat));
    onChange?.([start, end]);
  }

  function handleSelect(date: BsDate) {
    if (isDateDisabled(date)) return;

    if (!rangeStart) {
      emitRange(date, null);
      dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...date, day: 1 } });
    } else if (!rangeEnd) {
      const diff = safeDiffDays(rangeStart, date);
      if (diff !== null && diff < 0) {
        emitRange(date, rangeStart);
      } else {
        emitRange(rangeStart, date);
      }
      closePickerAndReturnFocus();
    } else {
      emitRange(date, null);
      dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...date, day: 1 } });
    }
  }

  function handleClear() {
    emitRange(null, null);
    closePickerAndReturnFocus();
  }

  function handleToday() {
    const t = adapter.today();
    if (!rangeStart) {
      emitRange(t, null);
      dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...t, day: 1 } });
    } else if (!rangeEnd) {
      handleSelect(t);
    } else {
      emitRange(t, null);
      dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...t, day: 1 } });
    }
  }

  function handleStartInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const normalized = normalizeDigitsToAscii(e.target.value);
    const maxDigits = formatInfo.tokens.reduce((s, t) => s + (t === 'M' || t === 'D' ? 2 : t === 'YY' ? 2 : 4), 0);
    const digits = normalized.replace(/[^0-9]/g, '').slice(0, maxDigits);
    let next = digits;
    for (let i = formatInfo.insertPositions.length - 1; i >= 0; i--) {
      const pos = formatInfo.insertPositions[i];
      if (next.length > pos) {
        next = next.slice(0, pos) + formatInfo.separator + next.slice(pos);
      }
    }
    setStartInput(next);
    if (next.length < formatInfo.minFullLength) return;
    const parsed = parseBs(next, dateFormat);
    if (!parsed) return;
    try {
      const iso = adapter.toAD(parsed);
      const bs = adapter.toBS(iso);
      if (bs.year === parsed.year && bs.month === parsed.month && bs.day === parsed.day && !isDateDisabled(parsed)) {
        if (!isControlledValue) setInternalRangeStart(parsed);
        if (rangeEnd) {
          onChange?.([parsed, rangeEnd]);
        } else {
          onChange?.([parsed, null]);
        }
        dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...parsed, day: 1 } });
      }
    } catch {
      // ignore
    }
  }

  function handleEndInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const normalized = normalizeDigitsToAscii(e.target.value);
    const maxDigits = formatInfo.tokens.reduce((s, t) => s + (t === 'M' || t === 'D' ? 2 : t === 'YY' ? 2 : 4), 0);
    const digits = normalized.replace(/[^0-9]/g, '').slice(0, maxDigits);
    let next = digits;
    for (let i = formatInfo.insertPositions.length - 1; i >= 0; i--) {
      const pos = formatInfo.insertPositions[i];
      if (next.length > pos) {
        next = next.slice(0, pos) + formatInfo.separator + next.slice(pos);
      }
    }
    setEndInput(next);
    if (next.length < formatInfo.minFullLength) return;
    const parsed = parseBs(next, dateFormat);
    if (!parsed) return;
    try {
      const iso = adapter.toAD(parsed);
      const bs = adapter.toBS(iso);
      if (bs.year === parsed.year && bs.month === parsed.month && bs.day === parsed.day && !isDateDisabled(parsed)) {
        if (!isControlledValue) setInternalRangeEnd(parsed);
        if (rangeStart) {
          onChange?.([rangeStart, parsed]);
        } else {
          onChange?.([null, parsed]);
        }
        if (!rangeStart) {
          dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...parsed, day: 1 } });
        }
      }
    } catch {
      // ignore
    }
  }

  const inRange = useMemo(() => {
    return (date: BsDate) => {
      const start = rangeStart;
      const end = rangeEnd ?? hoverDate;
      if (!start || !end) return false;
      const diff1 = safeDiffDays(start, date);
      const diff2 = safeDiffDays(date, end);
      return diff1 !== null && diff2 !== null && diff1 >= 0 && diff2 >= 0;
    };
  }, [rangeStart, rangeEnd, hoverDate, safeDiffDays]);

  function handleHover(date: BsDate | null) {
    if (rangeStart && !rangeEnd) {
      setHoverDate(date);
    }
  }

  function moveMonth(delta: number) {
    let next = { ...viewMonth };
    const step = delta > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(delta); i++) {
      const shifted = shiftMonth(next, step);
      if (!shifted) return;
      next = shifted;
    }
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: next });
    onPanelChangeRef.current?.(next);
  }

  function handlePreset(p: Preset) {
    emitRange(p.value[0], p.value[1]);
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...p.value[0], day: 1 } });
    closePickerAndReturnFocus();
  }

  const nextViewMonth = shiftMonth(viewMonth, 1) ?? viewMonth;

  const isNepali = lang === 'ne';
  const monthList = isNepali ? bsMonthNamesNe : bsMonthNames;
  const monthName = monthList[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');
  const nextMonthName = monthList[nextViewMonth.month] ?? nextViewMonth.month.toString().padStart(2, '0');
  const placeholderText = placeholder ?? `${dateFormat} (BS)`;
  const endPlaceholderText = endPlaceholder ?? placeholderText;
  const canMovePrev = shiftMonth(viewMonth, -1) !== null;
  const canMoveNext = shiftMonth(nextViewMonth, 1) !== null;
  const rangeMinYear = yearRange?.min ?? adapter.range?.min?.year;
  const rangeMaxYear = yearRange?.max ?? adapter.range?.max?.year;
  const yearOptions =
    rangeMinYear !== undefined && rangeMaxYear !== undefined && rangeMaxYear >= rangeMinYear
      ? Array.from({ length: rangeMaxYear - rangeMinYear + 1 }, (_, i) => rangeMinYear + i)
      : rangeMinYear !== undefined && rangeMaxYear === undefined
      ? Array.from({ length: Math.max(1, viewMonth.year - rangeMinYear + 1) }, (_, i) => rangeMinYear + i)
      : rangeMinYear === undefined && rangeMaxYear !== undefined
      ? Array.from({ length: Math.max(1, rangeMaxYear - viewMonth.year + 1) }, (_, i) => viewMonth.year + i)
      : [viewMonth.year];

  const hasValue = !!(rangeStart || rangeEnd);

  function updatePopoverPosition() {
    if (!wrapperRef.current || typeof window === 'undefined') return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.max(0, Math.min(580, viewportWidth - viewportPadding * 2));
    const width = Math.max(0, Math.min(maxWidth, Math.max(rect.width, 300)));

    const opensUp = placement === 'topLeft' || placement === 'topRight';
    const alignsRight = placement === 'bottomRight' || placement === 'topRight';

    let left: number;
    if (alignsRight) {
      left = rect.right - width;
    } else {
      left = rect.left;
    }

    if (left + width > viewportWidth - viewportPadding) {
      left = viewportWidth - width - viewportPadding;
    }
    left = Math.max(viewportPadding, left);

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const effectiveOpenUp = opensUp || (spaceBelow < 360 && spaceAbove > spaceBelow);

    const top = effectiveOpenUp
      ? Math.max(viewportPadding, rect.top - gap)
      : Math.min(viewportHeight - viewportPadding, rect.bottom + gap);

    setPopoverStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
      zIndex: 9999,
      transform: effectiveOpenUp ? 'translateY(-100%)' : undefined,
    });
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      closePicker();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isPickerOpen) return;
      if (e.key === 'Escape') {
        closePicker();
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
  }, [isPickerOpen]);

  useLayoutEffect(() => {
    if (!isPickerOpen) return;

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
  }, [isPickerOpen, monthOpen, yearOpen, viewMonth.year, viewMonth.month]);

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

  const popoverContainer = getPopupContainer && wrapperRef.current
    ? getPopupContainer(wrapperRef.current)
    : typeof document !== 'undefined'
    ? document.body
    : null;

  const pickerClasses = cn(
    'np-picker',
    'np-range-picker',
    size !== 'middle' && `np-picker--${size}`,
    variant && variant !== 'outlined' && `np-picker--${variant}`,
    status && `np-picker--${status}`,
    isPickerDisabled && 'np-picker--disabled',
    className
  );

  return (
    <div className={pickerClasses} ref={wrapperRef}>
      {showLabel && (
        <label className="np-popover__title" style={{ marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
          {label}
        </label>
      )}

      <div className="np-range-inputs">
        <input
          className={cn('np-input', 'np-range-input', semanticClassNames?.input)}
          name={name}
          placeholder={placeholderText}
          value={startInput}
          onChange={handleStartInputChange}
          onFocus={() => { if (!isPickerDisabled) { onFocusProp?.(); openPicker(); } }}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          inputMode="numeric"
          pattern={resolvedPattern}
          maxLength={formatInfo.fullLength}
          aria-label="Start date"
          disabled={isPickerDisabled}
          readOnly={inputReadOnly}
          autoFocus={autoFocus}
        />
        <span className="np-range-separator" aria-hidden="true">{separator}</span>
        <input
          className={cn('np-input', 'np-range-input', semanticClassNames?.input)}
          name={nameEnd}
          placeholder={endPlaceholderText}
          value={endInput}
          onChange={handleEndInputChange}
          onFocus={() => { if (!isPickerDisabled) { onFocusProp?.(); openPicker(); } }}
          inputMode="numeric"
          pattern={resolvedPattern}
          maxLength={formatInfo.fullLength}
          aria-label="End date"
          disabled={isPickerDisabled}
          readOnly={inputReadOnly}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        {allowClear && hasValue && !isPickerDisabled && (
          <button
            type="button"
            className="np-clear-btn"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            aria-label="Clear range"
          >
            ✕
          </button>
        )}
        {!isPickerDisabled && (
          <button
            type="button"
            className="np-toggle"
            onClick={(e) => { e.stopPropagation(); togglePicker(); }}
            aria-label="Toggle date range picker"
          >
            <svg
              className="np-toggle__icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        )}
      </div>

      {isPickerOpen && !isPickerDisabled && popoverContainer
        ? createPortal(
            <div className={cn('np-popover', 'np-popover--range', semanticClassNames?.popup)} style={{ ...popoverStyle, ...semanticStyles?.popup }} role="dialog" aria-modal="true" aria-label="Nepali date range picker" ref={popoverRef}>
              <div aria-live="polite" aria-atomic="true" ref={announceRef} className="np-sr-only">
                {monthName} {isNepali ? toNepaliDigits(viewMonth.year) : viewMonth.year}
              </div>
              <div className={cn('np-popover__header', 'np-dual-header', semanticClassNames?.header)} style={semanticStyles?.header}>
                <button
                  type="button"
                  className="np-popover__nav-btn"
                  onClick={() => moveMonth(-1)}
                  aria-label="Previous months"
                  disabled={!canMovePrev}
                >
                  ‹
                </button>
                <div className="np-dual-header__months">
                  <div className="np-dual-header__item">
                    {showMonth ? (
                      <div className="np-popover__selector-wrap">
                        <button
                          type="button"
                          className="np-popover__selector"
                          aria-haspopup="listbox"
                          aria-expanded={monthOpen}
                          onClick={handleToggleMonth}
                        >
                          <span>{monthName}</span>
                        </button>
                        {monthOpen && (
                          <div className="np-popover__menu" role="listbox" aria-label="Select month" ref={monthMenuRef}>
                            {monthList.slice(1).map((m, idx) => (
                              <button
                                key={m}
                                type="button"
                                className={cn('np-popover__menu-item', idx + 1 === viewMonth.month && 'np-popover__menu-item--active')}
                                data-active={idx + 1 === viewMonth.month}
                                role="option"
                                aria-selected={idx + 1 === viewMonth.month}
                                onClick={() => {
                                  dispatch({ type: 'SELECT_MONTH', month: idx + 1 });
                                  onPanelChangeRef.current?.({ ...viewMonth, month: idx + 1, day: 1 });
                                }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{monthName}</span>
                    )}
                    {showYear ? (
                      <div className="np-popover__selector-wrap">
                        <button
                          type="button"
                          className="np-popover__selector"
                          aria-haspopup="listbox"
                          aria-expanded={yearOpen}
                          onClick={handleToggleYear}
                        >
                          <span>{isNepali ? toNepaliDigits(viewMonth.year) : viewMonth.year}</span>
                        </button>
                        {yearOpen && (
                          <div className="np-popover__menu np-popover__menu--years" role="listbox" aria-label="Select year" ref={yearMenuRef}>
                            {yearOptions.map((y) => (
                              <button
                                key={y}
                                type="button"
                                className={cn('np-popover__menu-item', y === viewMonth.year && 'np-popover__menu-item--active')}
                                data-active={y === viewMonth.year}
                                role="option"
                                aria-selected={y === viewMonth.year}
                                onClick={() => {
                                  dispatch({ type: 'SELECT_YEAR', year: y });
                                  onPanelChangeRef.current?.({ ...viewMonth, year: y, day: 1 });
                                }}
                              >
                                {isNepali ? toNepaliDigits(y) : y}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{isNepali ? toNepaliDigits(viewMonth.year) : viewMonth.year}</span>
                    )}
                  </div>
                  <span className="np-dual-header__sep">|</span>
                  <div className="np-dual-header__item">
                    <span className="np-popover__selector np-popover__selector--static">{nextMonthName}</span>
                    <span className="np-popover__selector np-popover__selector--static">{isNepali ? toNepaliDigits(nextViewMonth.year) : nextViewMonth.year}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="np-popover__nav-btn"
                  onClick={() => moveMonth(1)}
                  aria-label="Next months"
                  disabled={!canMoveNext}
                >
                  ›
                </button>
              </div>
              <div className="np-dual-month">
                <div className="np-dual-month__col">
                  <CalendarGrid
                    month={viewMonth}
                    adapter={adapter}
                    selected={rangeStart}
                    rangeEnd={rangeEnd}
                    onSelect={handleSelect}
                    onHover={handleHover}
                    firstDayOfWeek={firstDayOfWeek}
                    disabled={isDateDisabled}
                    inRange={inRange}
                    className={semanticClassNames?.grid}
                    cellClassName={semanticClassNames?.cell}
                    cellRender={cellRender}
                    monthNames={isNepali ? bsMonthNamesNe : bsMonthNames}
                    isNepali={isNepali}
                    dowLabels={isNepali ? ['आ','सो','मं','बु','बि','शु','श'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']}
                    formatDay={(d) => (isNepali ? toNepaliDigits(d) : String(d))}
                  />
                </div>
                <div className="np-dual-month__col">
                  <CalendarGrid
                    month={nextViewMonth}
                    adapter={adapter}
                    selected={rangeStart}
                    rangeEnd={rangeEnd}
                    onSelect={handleSelect}
                    onHover={handleHover}
                    firstDayOfWeek={firstDayOfWeek}
                    disabled={isDateDisabled}
                    inRange={inRange}
                    className={semanticClassNames?.grid}
                    cellClassName={semanticClassNames?.cell}
                    cellRender={cellRender}
                    monthNames={isNepali ? bsMonthNamesNe : bsMonthNames}
                    isNepali={isNepali}
                    dowLabels={isNepali ? ['आ','सो','मं','बु','बि','शु','श'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']}
                    formatDay={(d) => (isNepali ? toNepaliDigits(d) : String(d))}
                  />
                </div>
              </div>
              {presets.length > 0 && (
                <div className="np-presets">
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className="np-preset-btn"
                      onClick={() => handlePreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {renderExtraFooter && (
                <div className="np-extra-footer np-footer__extra">
                  {renderExtraFooter()}
                </div>
              )}
              <PickerFooter
                isNepali={isNepali}
                onClear={handleClear}
                onToday={handleToday}
                className={semanticClassNames?.footer}
                style={semanticStyles?.footer}
              />
            </div>,
            popoverContainer
          )
        : null}
    </div>
  );
};
