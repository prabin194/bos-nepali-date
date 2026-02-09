import React from 'react';
import clsx from 'clsx';
import { bsRange } from '../adapter/bsTable';
import { toNepaliDigits } from './pickerUtils';

type PickerHeaderProps = {
  showMonth: boolean;
  showYear: boolean;
  monthName: string;
  monthList: string[];
  viewYear: number;
  viewMonth: number;
  isNepali: boolean;
  monthOpen: boolean;
  yearOpen: boolean;
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
  isNepali,
  monthOpen,
  yearOpen,
  onToggleMonth,
  onToggleYear,
  onSelectMonth,
  onSelectYear,
  moveMonth,
  monthMenuRef,
  yearMenuRef,
}) => (
  <div className="np-popover__header">
    <button type="button" className="np-popover__nav-btn" onClick={() => moveMonth(-1)} aria-label="Previous month">
      ‹
    </button>
    {showMonth || showYear ? (
      <div className="np-popover__selectors">
        {showMonth ? (
          <button
            type="button"
            className="np-popover__selector"
            aria-haspopup="listbox"
            aria-expanded={monthOpen}
            aria-pressed={monthOpen}
            onClick={onToggleMonth}
          >
            <span>{monthName}</span>
            {monthOpen && (
              <div className="np-popover__menu" ref={monthMenuRef}>
                {monthList.slice(1).map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    className={clsx('np-popover__menu-item', idx + 1 === viewMonth && 'np-popover__menu-item--active')}
                    data-active={idx + 1 === viewMonth}
                    onClick={() => onSelectMonth(idx + 1)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </button>
        ) : (
          <div className="np-popover__selector np-popover__selector--static">
            <span>{monthName}</span>
          </div>
        )}
        {showYear ? (
          <button
            type="button"
            className="np-popover__selector"
            aria-haspopup="listbox"
            aria-expanded={yearOpen}
            aria-pressed={yearOpen}
            onClick={onToggleYear}
          >
            <span>{isNepali ? toNepaliDigits(viewYear) : viewYear}</span>
            {yearOpen && (
              <div className="np-popover__menu np-popover__menu--years" ref={yearMenuRef}>
                {Array.from({ length: bsRange.maxYear - bsRange.minYear + 1 }, (_, i) => bsRange.minYear + i).map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={clsx('np-popover__menu-item', y === viewYear && 'np-popover__menu-item--active')}
                    data-active={y === viewYear}
                    onClick={() => onSelectYear(y)}
                  >
                    {isNepali ? toNepaliDigits(y) : y}
                  </button>
                ))}
              </div>
            )}
          </button>
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
    <button type="button" className="np-popover__nav-btn" onClick={() => moveMonth(1)} aria-label="Next month">
      ›
    </button>
  </div>
);
