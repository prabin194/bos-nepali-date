import React, { useCallback, useMemo, useState, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { BsAdapter, BsDate, DateFormat } from '../types';
import { CalendarGrid } from './CalendarGrid';
import { defaultAdapter } from '../adapter/memoryAdapter';
import { useEffect, useRef } from 'react';
import { cn } from '../utils/classnames';
import { PickerFooter } from './PickerFooter';
import { formatBs, normalizeDigitsToAscii, parseBs, getFormatInfo, generateInputPattern } from './pickerUtils';
import type { CellRenderInfo } from './CalendarGrid';
import type { DisableOptions, MenuOptions, PickerClassNames, PickerSize, PickerStatus, PickerStyles, PickerVariant, PickerPlacement } from './pickerTypes';
import { pickerUIReducer } from './pickerReducer';
import { createDisabledDatePredicate, getYearOptions, maskDateInput, safeDiffDays as compareDays, shiftMonth as shiftPickerMonth } from './pickerCore';
import { usePickerPopover } from './usePickerPopover';
import { resolvePickerLocale } from './pickerLocales';
import { usePickerDisclosure } from './usePickerDisclosure';

// Re-export types shared with single picker
export type { DisableOptions, MenuOptions, PickerSize, PickerStatus, PickerVariant, PickerPlacement } from './pickerTypes';

/** A single preset entry for quick range selection. */
export type Preset = {
  label: string;
  value: [BsDate, BsDate];
};

/** How presets are displayed in the popover. */
export type PresetLayout = 'bottom' | 'sidebar';

const EMPTY_DATES: BsDate[] = [];
const EMPTY_DISABLE: DisableOptions = {};
const EMPTY_MENU: MenuOptions = {};
const EMPTY_PRESETS: Preset[] = [];

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
  /** Where to render presets: 'bottom' (above footer) or 'sidebar' (left panel). @default 'bottom' */
  presetLayout?: PresetLayout;
  /** Header action bar shown above the calendar. Set `true` to display Clear filters / Cancel / Apply buttons. */
  showHeaderActions?: boolean;
  /** Called when the Apply button is clicked (header action bar). */
  onApply?: () => void;
  /** Called when the Cancel button is clicked (header action bar). */
  onCancel?: () => void;
  /** Label for the clear-filters link in the header action bar. @default 'Clear filters' */
  clearFiltersLabel?: string;
  /** Custom header action bar rendered to the left of Clear / Cancel / Apply. */
  renderHeaderActions?: () => React.ReactNode;
  /** Label for the "Customised" heading in sidebar mode. Falls back to 'Customised' (en) or 'अनुकूलित' (ne). */
  customisedLabel?: string;
  /** Semantic class names for sub-elements. Keys: input, popup, header, grid, cell, footer. */
  classNames?: PickerClassNames;
  /** Semantic inline styles for sub-elements. */
  styles?: PickerStyles;
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
  presetLayout = 'bottom',
  showHeaderActions = false,
  onApply: onApplyProp,
  onCancel: onCancelProp,
  clearFiltersLabel = 'Clear filters',
  renderHeaderActions,
  customisedLabel: customisedLabelProp,
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
    locale: localeOverride,
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

  const rangeStart = isControlledValue ? controlledStart : internalRangeStart;
  const rangeEnd = isControlledValue ? controlledEnd : internalRangeEnd;

  const onPanelChangeRef = useRef(onPanelChange);
  onPanelChangeRef.current = onPanelChange;

  const [hoverDate, setHoverDate] = useState<BsDate | null>(null);
  const { isOpen: isPickerOpen, open: openPicker, close: closePicker, toggle: togglePicker } = usePickerDisclosure({
    controlledOpen,
    internalOpen,
    dispatch,
    onOpenChange,
    onClose: () => setHoverDate(null),
  });
  const formatInfo = useMemo(() => getFormatInfo(dateFormat), [dateFormat]);
  const resolvedPattern: string | undefined = inputPattern === false ? undefined : (inputPattern ?? generateInputPattern(dateFormat));

  const [startInput, setStartInput] = useState(() => formatBs(rangeStart, dateFormat));
  const [endInput, setEndInput] = useState(() => formatBs(rangeEnd, dateFormat));
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const announceRef = useRef<HTMLDivElement | null>(null);
  const isSidebar = presetLayout === 'sidebar' && presets.length > 0;
  const popoverWidth = isSidebar ? 680 : 580;
  const { wrapperRef, popoverRef, popoverStyle, popoverContainer, openSource, returnFocus } = usePickerPopover({
    isOpen: isPickerOpen,
    placement,
    preferredWidth: popoverWidth,
    minimumWidth: popoverWidth,
    flipThreshold: 360,
    repositionToken: `${monthOpen}:${yearOpen}:${viewMonth.year}:${viewMonth.month}:${popoverWidth}`,
    getPopupContainer,
    onRequestClose: closePicker,
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart]);

  useEffect(() => {
    const refDate = rangeStart ?? rangeEnd ?? adapter.today();
    if (rangeEnd && !rangeStart) {
      dispatch({ type: 'SET_VIEW_MONTH', viewMonth: { ...refDate, day: 1 } });
    }
  }, [rangeEnd, rangeStart, adapter]);

  const safeDiffDays = useCallback(
    (date1: BsDate, date2: BsDate) => compareDays(adapter, date1, date2),
    [adapter]
  );
  const shiftMonth = useCallback(
    (base: BsDate, direction: 1 | -1) => shiftPickerMonth(adapter, base, direction),
    [adapter]
  );

  const isDateDisabled = useMemo(() => {
    return createDisabledDatePredicate({ adapter, minDate, maxDate, disableToday, disableDate, disableDates, disableBefore, disableAfter, disabledDate });
  }, [adapter, minDate, maxDate, disableToday, disableDate, disableDates, disableBefore, disableAfter, disabledDate]);

  function closePickerAndReturnFocus() {
    closePicker();
    returnFocus();
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
    const next = maskDateInput(normalized, formatInfo);
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
    const next = maskDateInput(normalized, formatInfo);
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
    if (presetLayout === 'bottom') closePickerAndReturnFocus();
  }

  function handleApply() {
    onApplyProp?.();
    closePickerAndReturnFocus();
  }

  function handleCancel() {
    onCancelProp?.();
    closePickerAndReturnFocus();
  }

  function handleClearFilters() {
    emitRange(null, null);
  }

  const nextViewMonth = shiftMonth(viewMonth, 1) ?? viewMonth;

  const locale = resolvePickerLocale(lang, localeOverride);
  const monthList = locale.monthNames;
  const monthName = monthList[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');
  const nextMonthName = monthList[nextViewMonth.month] ?? nextViewMonth.month.toString().padStart(2, '0');
  const placeholderText = placeholder ?? `${dateFormat} (BS)`;
  const endPlaceholderText = endPlaceholder ?? placeholderText;
  const canMovePrev = shiftMonth(viewMonth, -1) !== null;
  const canMoveNext = shiftMonth(nextViewMonth, 1) !== null;
  const rangeMinYear = yearRange?.min ?? adapter.range?.min?.year;
  const rangeMaxYear = yearRange?.max ?? adapter.range?.max?.year;
  const yearOptions = getYearOptions(viewMonth.year, rangeMinYear, rangeMaxYear);

  const hasValue = !!(rangeStart || rangeEnd);


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
          onFocus={() => { if (!isPickerDisabled) { openSource.current = 'input'; onFocusProp?.(); openPicker(); } }}
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
          onFocus={() => { if (!isPickerDisabled) { openSource.current = 'input'; onFocusProp?.(); openPicker(); } }}
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
            onClick={(e) => { e.stopPropagation(); openSource.current = 'toggle'; togglePicker(); }}
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
            <div className={cn('np-popover', 'np-popover--range', isSidebar && 'np-popover--sidebar', semanticClassNames?.popup)} style={{ ...popoverStyle, ...semanticStyles?.popup }} role="dialog" aria-modal="true" aria-label="Nepali date range picker" ref={popoverRef}>
              <div aria-live="polite" aria-atomic="true" ref={announceRef} className="np-sr-only">
                {monthName} {locale.formatNumber(viewMonth.year)}
              </div>

              {showHeaderActions && (
                <div className="np-popover__header-actions">
                  {renderHeaderActions ? renderHeaderActions() : (
                    <button type="button" className="np-header-action__link" onClick={handleClearFilters}>
                      {clearFiltersLabel}
                    </button>
                  )}
                  <div className="np-header-action__buttons">
                    <button type="button" className="np-footer__btn" onClick={handleCancel}>
                      {locale.labels.cancel}
                    </button>
                    <button type="button" className="np-footer__btn np-footer__btn--primary" onClick={handleApply}>
                      {locale.labels.apply}
                    </button>
                  </div>
                </div>
              )}

              <div className="np-popover__body">
                {isSidebar && (
                  <div className="np-sidebar" role="listbox" aria-label="Preset date ranges">
                    <div className="np-sidebar__customised" role="heading" aria-level={3}>
                      <span>{customisedLabelProp ?? locale.labels.customised}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                    {presets.map((p, i) => {
                      const isActive = rangeStart !== null && rangeEnd !== null &&
                        safeDiffDays(rangeStart, p.value[0]) === 0 && safeDiffDays(rangeEnd, p.value[1]) === 0;
                      return (
                        <button
                          key={i}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={cn('np-sidebar__item', isActive && 'np-sidebar__item--active')}
                          onClick={() => handlePreset(p)}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="np-popover__main">
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
                              <span>{locale.formatNumber(viewMonth.year)}</span>
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
                                    {locale.formatNumber(y)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span>{locale.formatNumber(viewMonth.year)}</span>
                        )}
                      </div>
                      <span className="np-dual-header__sep">|</span>
                      <div className="np-dual-header__item">
                        <span className="np-popover__selector np-popover__selector--static">{nextMonthName}</span>
                        <span className="np-popover__selector np-popover__selector--static">{locale.formatNumber(nextViewMonth.year)}</span>
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
                        monthNames={locale.monthNames}
                        dowLabels={locale.weekdays}
                        formatDay={locale.formatNumber}
                        formatYear={locale.formatNumber}
                        disableOutsideMonth
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
                        monthNames={locale.monthNames}
                        dowLabels={locale.weekdays}
                        formatDay={locale.formatNumber}
                        formatYear={locale.formatNumber}
                        disableOutsideMonth
                      />
                    </div>
                  </div>

                  {!isSidebar && presets.length > 0 && (
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
                </div>
              </div>

              {renderExtraFooter && (
                <div className="np-extra-footer np-footer__extra">
                  {renderExtraFooter()}
                </div>
              )}
              <PickerFooter
                locale={locale}
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
