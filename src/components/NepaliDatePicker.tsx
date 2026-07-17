import React, { useCallback, useMemo, useState, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { BsAdapter, BsDate, DateFormat } from '../types';
import { CalendarGrid, CellRenderInfo } from './CalendarGrid';
import { defaultAdapter } from '../adapter/memoryAdapter';
import { useEffect, useRef } from 'react';
import { cn } from '../utils/classnames';
import { PickerInput } from './PickerInput';
import { PickerHeader } from './PickerHeader';
import { PickerFooter } from './PickerFooter';
import { formatBs, normalizeDigitsToAscii, parseBs, getFormatInfo, generateInputPattern } from './pickerUtils';
import { pickerUIReducer } from './pickerReducer';
import { createDisabledDatePredicate, getYearOptions, maskDateInput, shiftMonth as shiftPickerMonth } from './pickerCore';
import { usePickerPopover } from './usePickerPopover';
import { resolvePickerLocale } from './pickerLocales';
import { usePickerDisclosure } from './usePickerDisclosure';
import type {
  DisableOptions,
  MenuOptions,
  PickerClassNames,
  PickerPlacement,
  PickerSize,
  PickerStatus,
  PickerStyles,
  PickerVariant,
} from './pickerTypes';
export type { DisableOptions, MenuOptions, PickerPlacement, PickerSize, PickerStatus, PickerVariant } from './pickerTypes';

const EMPTY_DATES: BsDate[] = [];
const EMPTY_DISABLE: DisableOptions = {};
const EMPTY_MENU: MenuOptions = {};
const EMPTY_STYLES = {} as PickerStyles;
const EMPTY_CLASSNAMES = {} as PickerClassNames;

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
    locale: localeOverride,
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

  const onPanelChangeRef = useRef(onPanelChange);
  onPanelChangeRef.current = onPanelChange;
  const { isOpen: isPickerOpen, open: openPicker, close: closePicker, toggle: togglePicker } = usePickerDisclosure({
    controlledOpen,
    internalOpen,
    dispatch,
    onOpenChange,
  });

  const formatInfo = useMemo(() => getFormatInfo(dateFormat), [dateFormat]);

  const resolvedInputPattern = inputPattern ?? generateInputPattern(dateFormat);

  const [input, setInput] = useState(() => formatBs(resolvedValue, dateFormat));
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const yearMenuRef = useRef<HTMLDivElement | null>(null);
  const announceRef = useRef<HTMLDivElement | null>(null);
  const uniqueId = useRef(`np-date-input-${Math.random().toString(36).slice(2, 9)}`).current;
  const { wrapperRef, popoverRef, popoverStyle, popoverContainer, openSource, returnFocus } = usePickerPopover({
    isOpen: isPickerOpen,
    placement,
    preferredWidth: 320,
    minimumWidth: 280,
    flipThreshold: 320,
    repositionToken: `${monthOpen}:${yearOpen}:${viewMonth.year}:${viewMonth.month}`,
    getPopupContainer,
    onRequestClose: closePicker,
  });

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
    const next = maskDateInput(normalized, formatInfo);
    setInput(next);
    if (next.length < formatInfo.minFullLength) return;
    const parsed = parseBs(next, dateFormat);
    if (!parsed) return;
    try {
      const iso = adapter.toAD(parsed);
      const bs = adapter.toBS(iso);
      if (bs.year === parsed.year && bs.month === parsed.month && bs.day === parsed.day && !isDateDisabled(parsed)) {
        onChange?.(parsed);
        if (!isValueControlled) setInternalValue(parsed);
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

  const locale = resolvePickerLocale(lang, localeOverride);
  const monthList = locale.monthNames;
  const monthName = monthList[viewMonth.month] ?? viewMonth.month.toString().padStart(2, '0');
  const placeholderText = placeholder ?? `${dateFormat} (BS)`;
  const canMovePrev = shiftMonth(viewMonth, -1) !== null;
  const canMoveNext = shiftMonth(viewMonth, 1) !== null;
  const rangeMinYear = yearRange?.min ?? adapter.range?.min?.year;
  const rangeMaxYear = yearRange?.max ?? adapter.range?.max?.year;
  const yearOptions = getYearOptions(viewMonth.year, rangeMinYear, rangeMaxYear);


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
    if (!isPickerDisabled) {
      openSource.current = 'input';
      openPicker();
    }
  }

  function handleInputToggle() {
    if (!isPickerDisabled) {
      openSource.current = 'toggle';
      togglePicker();
    }
  }

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
                  {monthName} {locale.formatNumber(viewMonth.year)}
                </div>
                <PickerHeader
                  showMonth={showMonth}
                  showYear={showYear}
                  monthName={monthName}
                  monthList={monthList}
                  viewYear={viewMonth.year}
                  viewMonth={viewMonth.month}
                  yearOptions={yearOptions}
                  formatNumber={locale.formatNumber}
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
                  monthNames={locale.monthNames}
                  dowLabels={locale.weekdays}
                  formatDay={locale.formatNumber}
                  formatYear={locale.formatNumber}
                />
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
