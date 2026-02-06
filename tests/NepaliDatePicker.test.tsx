import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NepaliDatePicker } from '../src/components/NepaliDatePicker';
import { defaultAdapter } from '../src/adapter/memoryAdapter';
import { BsDate } from '../src/types';

const adapter = defaultAdapter;

function openPicker() {
  const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
  fireEvent.focus(input);
  fireEvent.click(input);
}

function getDayButton(day: number | string): HTMLButtonElement {
  const candidates = screen
    .getAllByText(String(day))
    .map((el) => el.closest('button') as HTMLButtonElement | null)
    .filter(Boolean) as HTMLButtonElement[];
  const current = candidates.find((btn) => !btn.className.includes('np-cal-cell--muted'));
  return current ?? candidates[0];
}

function typeIntoInput(val: string) {
  const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
  fireEvent.change(input, { target: { value: val } });
  return input.value;
}

describe('disable rules', () => {
  it('disables today when disableToday is true', () => {
    const today = adapter.today();
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} disableToday />);
    openPicker();
    const todayBtn = getDayButton(today.day);
    expect(todayBtn).toBeDisabled();
  });

  it('disables a single date', () => {
    const disableDate: BsDate = { year: 2000, month: 1, day: 1 };
    render(
      <NepaliDatePicker
        value={disableDate}
        onChange={() => {}}
        adapter={adapter}
        disableDate={disableDate}
      />
    );
    openPicker();
    const btn = getDayButton(1);
    expect(btn).toBeDisabled();
  });

  it('disables multiple dates', () => {
    const dates: BsDate[] = [
      { year: 2000, month: 1, day: 2 },
      { year: 2000, month: 1, day: 3 },
    ];
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 5 }}
        onChange={() => {}}
        adapter={adapter}
        disableDates={dates}
      />
    );
    openPicker();
    expect(getDayButton(2)).toBeDisabled();
    expect(getDayButton(3)).toBeDisabled();
    expect(getDayButton(5)).not.toBeDisabled();
  });

  it('disables before/after bounds', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 10 }}
        onChange={() => {}}
        adapter={adapter}
        disableBefore={{ year: 2000, month: 1, day: 5 }}
        disableAfter={{ year: 2000, month: 1, day: 20 }}
      />
    );
    openPicker();
    expect(getDayButton(3)).toBeDisabled(); // before bound
    expect(getDayButton(22)).toBeDisabled(); // after bound
    expect(getDayButton(10)).not.toBeDisabled();
  });
});

describe('locale rendering', () => {
  it('renders Nepali month and digits when lang="ne"', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        lang="ne"
      />
    );
    openPicker();
    expect(screen.getByText('बैशाख')).toBeInTheDocument();
    expect(screen.getByText('२०००')).toBeInTheDocument();
    // days rendered in Nepali digits
    expect(screen.getAllByText('१')[0]).toBeInTheDocument();
  });
});

describe('input mask', () => {
  it('normalizes non-ASCII digits to ASCII', () => {
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />);
    const masked = typeIntoInput('२०२४०१०२');
    expect(masked).toBe('2024-01-02');
  });

  it('blocks non-digit characters', () => {
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />);
    const masked = typeIntoInput('2024-01-02abc');
    expect(masked).toBe('2024-01-02');
  });
});

describe('showMonth/showYear', () => {
  it('shows static month/year when selectors hidden', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        showMonth={false}
        showYear={false}
      />
    );
    openPicker();
    expect(screen.getByText('Baishak 2000')).toBeInTheDocument();
  });
});

describe('onChange not called for disabled date', () => {
  it('prevents selection of disabled date', () => {
    const spy = vi.fn();
    const disableDate: BsDate = { year: 2000, month: 1, day: 1 };
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 2 }}
        onChange={spy}
        adapter={adapter}
        disableDate={disableDate}
      />
    );
    openPicker();
    const btn = getDayButton(1);
    fireEvent.click(btn);
    expect(spy).not.toHaveBeenCalled();
  });
});
