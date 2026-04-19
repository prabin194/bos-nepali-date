import React from 'react';
import clsx from 'clsx';
import { toNepaliDigits } from './pickerUtils';

type PickerHeaderProps = {
  showMonth: boolean;
  showYear: boolean;
  monthName: string;
  monthList: string[];
  viewYear: number;
  viewMonth: number;
  yearOptions: number[];
  isNepali: boolean;
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
};

export const PickerHeader: React.FC<PickerHeaderProps> = ({
  showMonth,
  showYear,
  monthName,
  monthList,
  viewYear,
  viewMonth,
  yearOptions,
  isNepali,
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
}) => (
  <div className="np-popover__header">
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
              <div className="np-popover__menu" role="listbox" aria-label="Select month" ref={monthMenuRef}>
                {monthList.slice(1).map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    className={clsx('np-popover__menu-item', idx + 1 === viewMonth && 'np-popover__menu-item--active')}
                    data-active={idx + 1 === viewMonth}
                    role="option"
                    aria-selected={idx + 1 === viewMonth}
                    onClick={() => onSelectMonth(idx + 1)}
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
              <span>{isNepali ? toNepaliDigits(viewYear) : viewYear}</span>
            </button>
            {yearOpen && (
              <div className="np-popover__menu np-popover__menu--years" role="listbox" aria-label="Select year" ref={yearMenuRef}>
                {yearOptions.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={clsx('np-popover__menu-item', y === viewYear && 'np-popover__menu-item--active')}
                    data-active={y === viewYear}
                    role="option"
                    aria-selected={y === viewYear}
                    onClick={() => onSelectYear(y)}
                  >
                    {isNepali ? toNepaliDigits(y) : y}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="np-popover__selector np-popover__selector--static">
            <span>{isNepali ? toNepaliDigits(viewYear) : viewYear}</span>
          </div>
        )}
      </div>
    ) : (
      <div className="np-popover__title">
        {monthName} {isNepali ? toNepaliDigits(viewYear) : viewYear}
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
