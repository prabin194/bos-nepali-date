import React, { useCallback, useRef } from 'react';
import { cn } from '../utils/classnames';

type PickerHeaderProps = {
  showMonth: boolean;
  showYear: boolean;
  monthName: string;
  monthList: readonly string[];
  viewYear: number;
  viewMonth: number;
  yearOptions: number[];
  formatNumber: (value: number) => string;
  monthOpen: boolean;
  yearOpen: boolean;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onToggleMonth: () => void;
  onToggleYear: () => void;
  onSelectMonth: (month: number) => void;
  onSelectYear: (year: number) => void;
  moveMonth: (delta: number) => void;
  monthMenuRef: React.RefObject<HTMLDivElement>;
  yearMenuRef: React.RefObject<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
};

function focusMenuItem(container: HTMLDivElement, delta: number) {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role="option"]'),
  );
  if (!items.length) return;
  const activeIdx = items.findIndex(
    (el) => el.getAttribute('aria-selected') === 'true',
  );
  const nextIdx =
    activeIdx === -1
      ? delta > 0
        ? 0
        : items.length - 1
      : (activeIdx + delta + items.length) % items.length;
  items[nextIdx].focus();
}

function focusFirstItem(container: HTMLDivElement) {
  const items = container.querySelectorAll<HTMLElement>('[role="option"]');
  items[0]?.focus();
}

function focusLastItem(container: HTMLDivElement) {
  const items = container.querySelectorAll<HTMLElement>('[role="option"]');
  items[items.length - 1]?.focus();
}

export const PickerHeader: React.FC<PickerHeaderProps> = ({
  showMonth,
  showYear,
  monthName,
  monthList,
  viewYear,
  viewMonth,
  yearOptions,
  formatNumber,
  monthOpen,
  yearOpen,
  canMovePrev,
  canMoveNext,
  onToggleMonth,
  onToggleYear,
  onSelectMonth,
  onSelectYear,
  moveMonth,
  monthMenuRef,
  yearMenuRef,
  className,
  style,
}) => {
  const monthActiveId = useRef(`np-month-${1}`);
  const yearActiveId = useRef(`np-year-${1}`);

  const handleMonthKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!monthMenuRef.current) return;
      const items = Array.from(
        monthMenuRef.current.querySelectorAll<HTMLElement>('[role="option"]'),
      );
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          focusMenuItem(monthMenuRef.current, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          focusMenuItem(monthMenuRef.current, -1);
          break;
        case 'Home':
          e.preventDefault();
          focusFirstItem(monthMenuRef.current);
          break;
        case 'End':
          e.preventDefault();
          focusLastItem(monthMenuRef.current);
          break;
        case 'Escape':
          e.preventDefault();
          onToggleMonth();
          return;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const focused = items.find(
            (el) => el === monthMenuRef.current?.querySelector(':focus'),
          );
          if (focused) {
            const idx = items.indexOf(focused);
            onSelectMonth(idx + 1);
          }
          return;
        }
      }
      const focused = monthMenuRef.current.querySelector<HTMLElement>(':focus');
      if (focused?.id) monthActiveId.current = focused.id;
    },
    [monthMenuRef, onToggleMonth, onSelectMonth],
  );

  const handleYearKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!yearMenuRef.current) return;
      const items = Array.from(
        yearMenuRef.current.querySelectorAll<HTMLElement>('[role="option"]'),
      );
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          focusMenuItem(yearMenuRef.current, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          focusMenuItem(yearMenuRef.current, -1);
          break;
        case 'Home':
          e.preventDefault();
          focusFirstItem(yearMenuRef.current);
          break;
        case 'End':
          e.preventDefault();
          focusLastItem(yearMenuRef.current);
          break;
        case 'Escape':
          e.preventDefault();
          onToggleYear();
          return;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const focused = items.find(
            (el) => el === yearMenuRef.current?.querySelector(':focus'),
          );
          if (focused) {
            const idx = items.indexOf(focused);
            onSelectYear(yearOptions[idx]);
          }
          return;
        }
      }
      const focused = yearMenuRef.current.querySelector<HTMLElement>(':focus');
      if (focused?.id) yearActiveId.current = focused.id;
    },
    [yearMenuRef, onToggleYear, onSelectYear, yearOptions],
  );

  return (
    <div className={cn('np-popover__header', className)} style={style}>
      <button
        type="button"
        className="np-popover__nav-btn"
        onClick={() => moveMonth(-1)}
        aria-label="Previous month"
        disabled={!canMovePrev}
      >
        ‹
      </button>
      {showMonth || showYear ? (
        <div className="np-popover__selectors">
          {showMonth ? (
            <div className="np-popover__selector-wrap">
              <button
                type="button"
                className="np-popover__selector"
                aria-haspopup="listbox"
                aria-expanded={monthOpen}
                aria-pressed={monthOpen}
                onClick={onToggleMonth}
              >
                <span>{monthName}</span>
              </button>
              {monthOpen && (
                <div
                  className="np-popover__menu"
                  role="listbox"
                  aria-label="Select month"
                  ref={monthMenuRef}
                  tabIndex={0}
                  aria-activedescendant={monthActiveId.current}
                  onKeyDown={handleMonthKeyDown}
                >
                  {monthList.slice(1).map((m, idx) => (
                    <button
                      key={m}
                      id={`np-month-${idx + 1}`}
                      type="button"
                      className={cn(
                        'np-popover__menu-item',
                        idx + 1 === viewMonth &&
                          'np-popover__menu-item--active',
                      )}
                      data-active={idx + 1 === viewMonth}
                      role="option"
                      aria-selected={idx + 1 === viewMonth}
                      onClick={() => onSelectMonth(idx + 1)}
                      onFocus={() => {
                        monthActiveId.current = `np-month-${idx + 1}`;
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="np-popover__selector np-popover__selector--static">
              <span>{monthName}</span>
            </div>
          )}
          {showYear ? (
            <div className="np-popover__selector-wrap">
              <button
                type="button"
                className="np-popover__selector"
                aria-haspopup="listbox"
                aria-expanded={yearOpen}
                aria-pressed={yearOpen}
                onClick={onToggleYear}
              >
                <span>
                  {formatNumber(viewYear)}
                </span>
              </button>
              {yearOpen && (
                <div
                  className="np-popover__menu np-popover__menu--years"
                  role="listbox"
                  aria-label="Select year"
                  ref={yearMenuRef}
                  tabIndex={0}
                  aria-activedescendant={yearActiveId.current}
                  onKeyDown={handleYearKeyDown}
                >
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      id={`np-year-${y}`}
                      type="button"
                      className={cn(
                        'np-popover__menu-item',
                        y === viewYear && 'np-popover__menu-item--active',
                      )}
                      data-active={y === viewYear}
                      role="option"
                      aria-selected={y === viewYear}
                      onClick={() => onSelectYear(y)}
                      onFocus={() => {
                        yearActiveId.current = `np-year-${y}`;
                      }}
                    >
                      {formatNumber(y)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="np-popover__selector np-popover__selector--static">
              <span>
                {formatNumber(viewYear)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="np-popover__title">
          {monthName} {formatNumber(viewYear)}
        </div>
      )}
      <button
        type="button"
        className="np-popover__nav-btn"
        onClick={() => moveMonth(1)}
        aria-label="Next month"
        disabled={!canMoveNext}
      >
        ›
      </button>
    </div>
  );
};
