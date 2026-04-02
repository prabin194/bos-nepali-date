import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('popover overlay behavior', () => {
  it('renders the dialog in document.body with viewport-based fixed positioning', async () => {
    const rect = {
      x: 40,
      y: 120,
      width: 260,
      height: 48,
      top: 120,
      right: 300,
      bottom: 168,
      left: 40,
      toJSON: () => ({}),
    };

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if ((this as HTMLElement).classList.contains('np-picker')) {
        return rect as DOMRect;
      }
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });

    render(
      <div style={{ overflow: 'hidden' }}>
        <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
      </div>
    );

    openPicker();

    const dialog = await screen.findByRole('dialog', { name: 'Nepali date picker' });

    expect(dialog.parentElement).toBe(document.body);
    await waitFor(() => {
      expect(dialog).toHaveStyle({
        position: 'fixed',
        left: '40px',
        top: '176px',
        width: '280px',
      });
    });
  });

  it('keeps the portaled dialog open for internal clicks and closes on outside clicks', async () => {
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />);

    openPicker();

    const dialog = await screen.findByRole('dialog', { name: 'Nepali date picker' });
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole('dialog', { name: 'Nepali date picker' })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Nepali date picker' })).not.toBeInTheDocument();
    });
  });
});

describe('month/year selector behavior', () => {
  it('closes the year selector after choosing a new year', async () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );

    openPicker();

    const yearTrigger = screen.getByRole('button', { name: '2000' });
    fireEvent.click(yearTrigger);

    expect(screen.getByRole('listbox', { name: 'Select year' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: '2001' }));

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Select year' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '2001' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the month selector after choosing a new month', async () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );

    openPicker();

    const monthTrigger = screen.getByRole('button', { name: 'Baishak' });
    fireEvent.click(monthTrigger);

    expect(screen.getByRole('listbox', { name: 'Select month' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Jestha' }));

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Select month' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Jestha' })).toHaveAttribute('aria-expanded', 'false');
  });
});
