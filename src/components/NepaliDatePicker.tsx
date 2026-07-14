import React, { useCallback, useMemo, useState, useReducer, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BsAdapter, BsDate, DateFormat } from '../types';
import { CalendarGrid, CellRenderInfo } from './CalendarGrid';
import { defaultAdapter } from '../adapter/memoryAdapter';
import { bsMonthNames, bsMonthNamesNe } from '../adapter/bsTable';
import { useEffect, useRef } from 'react';
import { cn } from '../utils/classnames';
import { PickerInput } from './PickerInput';
import { PickerHeader } from './PickerHeader';
import { PickerFooter } from './PickerFooter';
import { formatBs, normalizeDigitsToAscii, parseBs, toNepaliDigits, getFormatInfo, generateInputPattern } from './pickerUtils';
import { pickerUIReducer } from './pickerReducer';

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
  /** Constrain the year dropdown to a custom range. */
  yearRange?: { min?: number; max?: number };
};

export type PickerSize = 'small' | 'middle' | 'large';
export type PickerStatus = 'error' | 'warning';
export type PickerVariant = 'outlined' | 'filled' | 'borderless' | 'underlined';
export type PickerPlacement = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

const EMPTY_DATES: BsDate[] = [];
const EMPTY_DISABLE: DisableOptions = {};
const EMPTY_MENU: MenuOptions = {};
const EMPTY_STYLES = {} as PickerStyles;
const EMPTY_CLASSNAMES = {} as PickerClassNames;

type PickerClassNames = {
  input?: string;
  popup?: string;
  header?: string;
  grid?: string;
  cell?: string;
  footer?: string;
};

type PickerStyles = {
  input?: React.CSSProperties;
  popup?: React.CSSProperties;
  header?: React.CSSProperties;
  grid?: React.CSSProperties;
  footer?: React.CSSProperties;
};

export type NepaliDatePickerProps = {
  label?: string;
  showLabel?: boolean;
  value?: BsDate | null;
  /** Default value for uncontrolled usage. Only used when `value` is not provided. */
  defaultValue?: BsDate | null;
  onChange?: (date: BsDate | null) => void;
  adapter?: BsAdapter;
  minDate?: BsDate;
  maxDate?: BsDate;
  disable?: DisableOptions;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  inputPattern?: string | false;
  menu?: MenuOptions;
  disabledDate?: (date: BsDate) => boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: PickerSize;
  status?: PickerStatus;
  allowClear?: boolean;
  disabled?: boolean;
  /** Visual variant. @default 'outlined' */
  variant?: PickerVariant;
  /** Popover placement relative to the input. @default 'bottomLeft' */
  placement?: PickerPlacement;
  /** Custom DOM container for the popover portal. Defaults to document.body. */
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement;
  /** Called when the input gains focus. */
  onFocus?: () => void;
  /** Called when the input loses focus. */
  onBlur?: () => void;
  /** Called on keydown on the input. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Called when the calendar panel changes (month/year navigation). */
  onPanelChange?: (date: BsDate) => void;
  /** Prevents keyboard input (calendar selection only). @default false */
  inputReadOnly?: boolean;
  /** Auto-focus the input on mount. @default false */
  autoFocus?: boolean;
  /** Native input `name` attribute for the input element. */
  name?: string;
  /** Custom React node rendered at the bottom of the popover, above the footer. */
  renderExtraFooter?: () => React.ReactNode;
  /** Custom cell renderer for day cells. */
  cellRender?: (date: BsDate, info: CellRenderInfo) => React.ReactNode;
  /** Semantic class names for sub-elements. Keys: input, popup, header, grid, footer. */
  classNames?: PickerClassNames;
  /** Semantic inline styles for sub-elements. Keys: input, popup, header, grid, footer. */
  styles?: PickerStyles;
  /** Date display/input format. @default 'YYYY-MM-DD' */
  dateFormat?: DateFormat;
};

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  label = 'Select date',
  showLabel = false,
  value,
  defaultValue,
  onChange,
  adapter = defaultAdapter,
  minDate,
  maxDate,
  disable = EMPTY_DISABLE,
  placeholder,
  className,
  inputClassName,
  inputPattern,
  menu = EMPTY_MENU,
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
  onFocus: onFocusProp,
  onBlur,
  onKeyDown,
  onPanelChange,
  inputReadOnly = false,
  autoFocus = false,
  name,
  renderExtraFooter,
  cellRender,
  classNames: semanticClassNames = EMPTY_CLASSNAMES,
  styles: semanticStyles = EMPTY_STYLES,
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

  const isValueControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<BsDate | null>(defaultValue ?? null);
  const resolvedValue = isValueControlled ? value : internalValue;

  const [uiState, dispatch] = useReducer(pickerUIReducer, {
    open: false,
    monthOpen: false,
    yearOpen: false,
    viewMonth: { ...(resolvedValue ?? adapter.today()), day: 1 },
  });
  const { open: internalOpen, monthOpen, yearOpen, viewMonth } = uiState;

  const isControlled = controlledOpen !== undefined;
  const isPickerOpen = isControlled ? controlledOpen : internalOpen;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const onPanelChangeRef = useRef(onPanelChange);
  onPanelChangeRef.current = onPanelChange;
  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const formatInfo = useMemo(() => getFormatInfo(dateFormat), [dateFormat]);

  const resolvedInputPattern = inputPattern ?? generateInputPattern(dateFormat);

  const [input, setInput] = useState(() => formatBs(resolvedValue, dateFormat));
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const announceRef = useRef<HTMLDivElement | null>(null);
  const uniqueId = useRef(`np-date-input-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    if (isPickerOpen) {
      requestAnimationFrame(() => {
        const firstFocusable = popoverRef.current?.querySelector<HTMLElement>('button:not([disabled]),input:not([disabled])');
        firstFocusable?.focus();
      });
    }
  }, [isPickerOpen]);

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
    const cb = onOpenChangeRef.current;
    if (cb) cb(!isPickerOpen);
    if (!isControlledRef.current) dispatch({ type: 'TOGGLE_OPEN' });
  }

  useEffect(() => {
    if (!isValueControlled) return;
    const formatted = formatBs(value, dateFormat);
    const parsed = parseBs(input, dateFormat);
    if (parsed?.year !== value?.year || parsed?.month !== value?.month || parsed?.day !== value?.day) {
      setInput(formatted);
    }
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...(value ?? adapter.today()), day: 1 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, adapter, isValueControlled, dateFormat]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setInput(next);
    if (next.length < formatInfo.minFullLength) return;
    const parsed = parseBs(next, dateFormat);
    if (!parsed) return;
    try {
      const iso = adapter.toAD(parsed);
      const bs = adapter.toBS(iso);
      if (bs.year === parsed.year && bs.month === parsed.month && bs.day === parsed.day && !isDateDisabled(parsed)) {
        onChange?.(parsed);
        dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...parsed, day: 1 } });
      }
    } catch {
      // ignore
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
    onPanelChangeRef.current?.(next);
  }

  function handleSelect(date: BsDate) {
    if (isDateDisabled(date)) return;
    onChange?.(date);
    if (!isValueControlled) setInternalValue(date);
    setInput(formatBs(date, dateFormat));
    dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...date, day: 1 } });
    closePickerAndReturnFocus();
  }

  function handleClear() {
    onChange?.(null);
    if (!isValueControlled) setInternalValue(null);
    setInput('');
    closePickerAndReturnFocus();
  }

  function handleToday() {
    const t = adapter.today();
    handleSelect(t);
  }

  const isNepali = lang === 'ne';
  const monthList = isNepali ? bsMonthNamesNe : bsMonthNames;
  const monthName = monthList[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');
  const placeholderText = placeholder ?? `${dateFormat} (BS)`;
  const canMovePrev = shiftMonth(viewMonth, -1) !== null;
  const canMoveNext = shiftMonth(viewMonth, 1) !== null;
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

  function updatePopoverPosition() {
    if (!wrapperRef.current || typeof window === 'undefined') return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.max(0, Math.min(320, viewportWidth - viewportPadding * 2));
    const width = Math.max(0, Math.min(maxWidth, Math.max(rect.width, 280)));

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
    const effectiveOpenUp = opensUp || (spaceBelow < 320 && spaceAbove > spaceBelow);

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

    let rafId = 0;
    function onReposition() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updatePopoverPosition();
      });
    }

    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function handleInputFocus() {
    onFocusProp?.();
    if (!isPickerDisabled) openPicker();
  }

  function handleInputToggle() {
    if (!isPickerDisabled) togglePicker();
  }

  const popoverContainer = getPopupContainer && wrapperRef.current
    ? getPopupContainer(wrapperRef.current)
    : typeof document !== 'undefined'
    ? document.body
    : null;

  const pickerClasses = cn(
    'np-picker',
    size !== 'middle' && `np-picker--${size}`,
    variant && variant !== 'outlined' && `np-picker--${variant}`,
    status && `np-picker--${status}`,
    isPickerDisabled && 'np-picker--disabled',
    className
  );

  return (
    <div className={pickerClasses} ref={wrapperRef}>
      {showLabel && (
        <label htmlFor={uniqueId} className="np-popover__title" style={{ marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
          {label}
        </label>
      )}
      <PickerInput
        value={input}
        placeholder={placeholderText}
        inputClassName={cn(inputClassName, semanticClassNames?.input)}
        inputPattern={resolvedInputPattern}
        label={label}
        htmlId={uniqueId}
        allowClear={allowClear}
        disabled={isPickerDisabled}
        inputReadOnly={inputReadOnly}
        autoFocus={autoFocus}
        name={name}
        onChange={handleInputChange}
        onClear={handleClear}
        onFocus={handleInputFocus}
        onBlur={onBlur}
        onToggle={handleInputToggle}
        onKeyDown={onKeyDown}
        maxLength={formatInfo.fullLength}
      />

      {isPickerOpen && !isPickerDisabled && popoverContainer
        ? createPortal(
            <div
              className={cn('np-popover', semanticClassNames?.popup)}
              style={{ ...popoverStyle, ...semanticStyles?.popup }}
              role="dialog"
              aria-modal="true"
              aria-label="Nepali date picker"
              ref={popoverRef}
            >
                <div aria-live="polite" aria-atomic="true" ref={announceRef} className="np-sr-only">
                  {monthName} {isNepali ? toNepaliDigits(viewMonth.year) : viewMonth.year}
                </div>
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
                  onSelectMonth={(m) => {
                    dispatch({ type: 'SELECT_MONTH', month: m });
                    onPanelChangeRef.current?.({ ...viewMonth, month: m, day: 1 });
                  }}
                  onSelectYear={(y) => {
                    dispatch({ type: 'SELECT_YEAR', year: y });
                    onPanelChangeRef.current?.({ ...viewMonth, year: y, day: 1 });
                  }}
                  moveMonth={moveMonth}
                  monthMenuRef={monthMenuRef}
                  yearMenuRef={yearMenuRef}
                  className={semanticClassNames?.header}
                  style={semanticStyles?.header}
                />
                <CalendarGrid
                  month={viewMonth}
                  adapter={adapter}
                  selected={resolvedValue ?? null}
                  onSelect={handleSelect}
                  firstDayOfWeek={firstDayOfWeek}
                  disabled={isDateDisabled}
                  className={semanticClassNames?.grid}
                  cellClassName={semanticClassNames?.cell}
                  cellRender={cellRender}
                  monthNames={isNepali ? bsMonthNamesNe : bsMonthNames}
                  isNepali={isNepali}
                  dowLabels={isNepali ? ['आ','सो','मं','बु','बि','शु','श'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']}
                  formatDay={(d) => (isNepali ? toNepaliDigits(d) : String(d))}
                />
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
