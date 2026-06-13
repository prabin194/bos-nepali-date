import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NepaliDatePicker } from '../src/components/NepaliDatePicker';
import { bsMonthData } from '../src/adapter/bsTable';
import { MemoryBsAdapter } from '../src/adapter/memoryAdapter';
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

const baseCss = readFileSync(resolve(__dirname, '../src/styles/base.css'), 'utf8');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('disable rules', () => {
  it('disables today when disableToday is true', () => {
    const today = adapter.today();
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} disable={{ today: true }} />);
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
        disable={{ date: disableDate }}
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
        disable={{ dates }}
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
        disable={{
          before: { year: 2000, month: 1, day: 5 },
          after: { year: 2000, month: 1, day: 20 },
        }}
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
        menu={{ lang: 'ne' }}
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

  it('does not emit typed dates that are disabled by constraints', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={null}
        onChange={spy}
        adapter={adapter}
        minDate={{ year: 2000, month: 1, day: 10 }}
      />
    );

    const masked = typeIntoInput('20000105');
    expect(masked).toBe('2000-01-05');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('controlled value behavior', () => {
  it('syncs the input and visible month when the controlled value prop changes', async () => {
    const { rerender } = render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );

    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.value).toBe('2000-01-01');

    rerender(
      <NepaliDatePicker
        value={{ year: 2000, month: 2, day: 5 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );

    await waitFor(() => {
      expect(input.value).toBe('2000-02-05');
    });

    openPicker();
    expect(screen.getByRole('button', { name: 'Jestha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2000' })).toBeInTheDocument();
  });
});

describe('showMonth/showYear', () => {
  it('shows static month/year when selectors hidden', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        menu={{ showMonth: false, showYear: false }}
      />
    );
    openPicker();
    // The text appears in both the visible title and the aria-live region
    const els = screen.getAllByText('Baishak 2000');
    expect(els.length).toBeGreaterThanOrEqual(1);
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
        disable={{ date: disableDate }}
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

describe('responsive sizing', () => {
  it('does not enforce a root minimum width in constrained side-by-side layouts', () => {
    render(
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 180px))', gap: '12px', width: 372 }}>
        <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
        <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
      </div>
    );

    const pickers = document.querySelectorAll('.np-picker');

    expect(pickers).toHaveLength(2);
    expect(baseCss).toContain('.np-picker');
    expect(baseCss).toContain('min-width: 0;');
    expect(baseCss).not.toContain('min-width: 200px;');
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

describe('adapter boundary behavior', () => {
  const narrowAdapter = new MemoryBsAdapter({
    anchorBs: { year: 2080, month: 1, day: 1 },
    anchorAdIso: '2023-04-14',
    yearTable: {
      2080: bsMonthData.slice(960, 972),
      2081: bsMonthData.slice(972, 984),
    },
    range: {
      min: { year: 2080, month: 1, day: 1 },
      max: { year: 2081, month: 12, day: bsMonthData[983] },
    },
  });

  const minOnlyRangeAdapter = new MemoryBsAdapter({
    anchorBs: { year: 2080, month: 1, day: 1 },
    anchorAdIso: '2023-04-14',
    yearTable: {
      2080: bsMonthData.slice(960, 972),
      2081: bsMonthData.slice(972, 984),
    },
    range: {
      min: { year: 2080, month: 1, day: 1 },
    },
  });

  it('disables previous-month navigation at the minimum supported month', async () => {
    render(
      <NepaliDatePicker
        value={{ year: 2080, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={narrowAdapter}
      />
    );

    openPicker();

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).not.toBeDisabled();
  });

  it('uses the adapter range for year options', async () => {
    render(
      <NepaliDatePicker
        value={{ year: 2080, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={narrowAdapter}
      />
    );

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '2080' }));

    expect(screen.getByRole('option', { name: '2080' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2081' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '2000' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '2099' })).not.toBeInTheDocument();
  });

  it('keeps reachable years visible when only a minimum adapter year is provided', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2081, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={minOnlyRangeAdapter}
      />
    );

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '2081' }));

    expect(screen.getByRole('option', { name: '2080' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2081' })).toBeInTheDocument();
  });

  it('ignores out-of-range constraint props instead of crashing', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2080, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={narrowAdapter}
        minDate={{ year: 2000, month: 1, day: 1 }}
        disableDates={[{ year: 2000, month: 1, day: 2 }]}
        disableBefore={{ year: 2000, month: 1, day: 3 }}
      />
    );

    expect(() => openPicker()).not.toThrow();
    expect(screen.getByRole('dialog', { name: 'Nepali date picker' })).toBeInTheDocument();
  });
});

describe('disabledDate callback', () => {
  it('disables dates returned as true from callback', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 10 }}
        onChange={() => {}}
        adapter={adapter}
        disabledDate={(date) => date.day === 5 || date.day === 15}
      />
    );
    openPicker();
    expect(getDayButton(5)).toBeDisabled();
    expect(getDayButton(15)).toBeDisabled();
    expect(getDayButton(10)).not.toBeDisabled();
  });

  it('combines with static disable rules', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 10 }}
        onChange={() => {}}
        adapter={adapter}
        disable={{ before: { year: 2000, month: 1, day: 5 } }}
        disabledDate={(date) => date.day === 10}
      />
    );
    openPicker();
    expect(getDayButton(3)).toBeDisabled(); // static before rule
    expect(getDayButton(10)).toBeDisabled(); // callback rule
    expect(getDayButton(15)).not.toBeDisabled();
  });

  it('prevents selection via calendar click', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 10 }}
        onChange={spy}
        adapter={adapter}
        disabledDate={(date) => date.day === 5}
      />
    );
    openPicker();
    fireEvent.click(getDayButton(5));
    expect(spy).not.toHaveBeenCalled();
  });

  it('blocks typed dates that match the callback', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={null}
        onChange={spy}
        adapter={adapter}
        disabledDate={(date) => date.day === 5}
      />
    );
    typeIntoInput('20000105');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('controlled open/onOpenChange', () => {
  it('shows popover when open={true}', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Nepali date picker' })).toBeInTheDocument();
  });

  it('hides popover when open={false}', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        open={false}
        onOpenChange={() => {}}
      />
    );
    expect(screen.queryByRole('dialog', { name: 'Nepali date picker' })).not.toBeInTheDocument();
  });

  it('calls onOpenChange(true) when popover opens in controlled mode', () => {
    const onOpenSpy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        open={false}
        onOpenChange={onOpenSpy}
      />
    );

    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
    fireEvent.focus(input);
    expect(onOpenSpy).toHaveBeenCalledWith(true);
  });

  it('calls onOpenChange(false) on Escape in controlled mode', () => {
    const onOpenSpy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={onOpenSpy}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenSpy).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) on outside click in controlled mode', async () => {
    const onOpenSpy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={onOpenSpy}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(onOpenSpy).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) on date selection in controlled mode', () => {
    const onOpenSpy = vi.fn();
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={onOpenSpy}
      />
    );

    // Click the 15th - a non-disabled date
    fireEvent.click(getDayButton(15));
    expect(onOpenSpy).toHaveBeenCalledWith(false);
  });
});

describe('size prop', () => {
  it('renders with np-picker--small class when size="small"', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        size="small"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--small');
  });

  it('renders with np-picker--large class when size="large"', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        size="large"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--large');
  });

  it('renders without a size class when size="middle" (default)', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        size="middle"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).not.toHaveClass('np-picker--small');
    expect(picker).not.toHaveClass('np-picker--large');
  });

  it('defaults to middle (no size class) when size is not provided', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).not.toHaveClass('np-picker--small');
    expect(picker).not.toHaveClass('np-picker--large');
  });
});

describe('status prop', () => {
  it('renders with np-picker--error class when status="error"', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        status="error"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--error');
  });

  it('renders with np-picker--warning class when status="warning"', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        status="warning"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--warning');
  });

  it('renders without status class when no status is provided', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).not.toHaveClass('np-picker--error');
    expect(picker).not.toHaveClass('np-picker--warning');
  });
});

describe('allowClear prop', () => {
  it('renders clear button when allowClear is true and value is selected', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        allowClear={true}
      />
    );
    expect(screen.getByLabelText('Clear date')).toBeInTheDocument();
  });

  it('does not render clear button when allowClear is false (default)', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    expect(screen.queryByLabelText('Clear date')).not.toBeInTheDocument();
  });

  it('does not render clear button when allowClear is true but no value', () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        allowClear={true}
      />
    );
    expect(screen.queryByLabelText('Clear date')).not.toBeInTheDocument();
  });

  it('calls onChange(null) when clear button is clicked', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={spy}
        adapter={adapter}
        allowClear={true}
      />
    );
    fireEvent.click(screen.getByLabelText('Clear date'));
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('clears the input value when clear button is clicked', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        allowClear={true}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.value).toBe('2000-01-01');
    fireEvent.click(screen.getByLabelText('Clear date'));
    expect(input.value).toBe('');
  });

  it('clearing via allowClear button does not leave the popover open', async () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        allowClear={true}
      />
    );
    // Open the picker first
    openPicker();
    expect(screen.getByRole('dialog', { name: 'Nepali date picker' })).toBeInTheDocument();
    // Click clear
    fireEvent.click(screen.getByLabelText('Clear date'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Nepali date picker' })).not.toBeInTheDocument();
    });
  });
});

describe('disabled prop', () => {
  it('disabled the input when disabled={true}', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        disabled={true}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('adds np-picker--disabled CSS class', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        disabled={true}
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--disabled');
  });

  it('does not render the toggle button when disabled', () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        disabled={true}
      />
    );
    expect(screen.queryByLabelText('Toggle date picker')).not.toBeInTheDocument();
  });

  it('does not open popover when input is focused while disabled', () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        disabled={true}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
    fireEvent.focus(input);
    fireEvent.click(input);
    expect(screen.queryByRole('dialog', { name: 'Nepali date picker' })).not.toBeInTheDocument();
  });

  it('does not add np-picker--disabled class when disabled is false', () => {
    const { container } = render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        disabled={false}
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).not.toHaveClass('np-picker--disabled');
  });
});

describe('variant prop', () => {
  it('renders with np-picker--filled class when variant="filled"', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} variant="filled" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--filled');
  });

  it('renders with np-picker--borderless class when variant="borderless"', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} variant="borderless" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--borderless');
  });

  it('renders with np-picker--underlined class when variant="underlined"', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} variant="underlined" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--underlined');
  });

  it('renders without variant class when variant="outlined" (default)', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} variant="outlined" />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).not.toHaveClass('np-picker--filled');
    expect(picker).not.toHaveClass('np-picker--borderless');
    expect(picker).not.toHaveClass('np-picker--underlined');
  });

  it('defaults to outlined when variant is not provided', () => {
    const { container } = render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).not.toHaveClass('np-picker--filled');
    expect(picker).not.toHaveClass('np-picker--borderless');
    expect(picker).not.toHaveClass('np-picker--underlined');
  });

  it('underlined variant renders with a value', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 15 }}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.value).toBe('2000-01-15');
  });

  it('underlined variant works with size="small"', () => {
    const { container } = render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
        size="small"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--underlined');
    expect(picker).toHaveClass('np-picker--small');
  });

  it('underlined variant works with status="error"', () => {
    const { container } = render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
        status="error"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--underlined');
    expect(picker).toHaveClass('np-picker--error');
  });

  it('underlined variant opens picker on focus', async () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
    fireEvent.focus(input);
    fireEvent.click(input);
    expect(await screen.findByRole('dialog', { name: 'Nepali date picker' })).toBeInTheDocument();
  });

  it('underlined variant allows date selection from calendar', async () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        defaultValue={{ year: 2000, month: 1, day: 5 }}
        onChange={spy}
        adapter={adapter}
        variant="underlined"
      />
    );
    openPicker();
    fireEvent.click(getDayButton(10));
    expect(spy).toHaveBeenCalledWith({ year: 2000, month: 1, day: 10 });
  });

  it('underlined variant clears the input via allowClear', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
        allowClear={true}
      />
    );
    expect(screen.getByLabelText('Clear date')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Clear date'));
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});

describe('placement prop', () => {
  it('renders without error with placement="topLeft"', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        placement="topLeft"
      />
    );
    expect(screen.getByPlaceholderText('YYYY-MM-DD (BS)')).toBeInTheDocument();
  });

  it('renders without error with placement="bottomRight"', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        placement="bottomRight"
      />
    );
    expect(screen.getByPlaceholderText('YYYY-MM-DD (BS)')).toBeInTheDocument();
  });

  it('renders without error with placement="topRight"', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        placement="topRight"
      />
    );
    expect(screen.getByPlaceholderText('YYYY-MM-DD (BS)')).toBeInTheDocument();
  });
});

describe('getPopupContainer', () => {
  it('renders popover inside the custom container when getPopupContainer is provided', async () => {
    render(
      <div data-testid="custom-portal-root">
        <NepaliDatePicker
          value={null}
          onChange={() => {}}
          adapter={adapter}
          getPopupContainer={() => document.querySelector('[data-testid="custom-portal-root"]') as HTMLElement}
        />
      </div>
    );

    openPicker();
    const dialog = await screen.findByRole('dialog', { name: 'Nepali date picker' });
    const portalRoot = screen.getByTestId('custom-portal-root');
    expect(portalRoot.contains(dialog)).toBe(true);
  });

  it('renders in document.body when getPopupContainer is not provided', async () => {
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />);
    openPicker();
    const dialog = await screen.findByRole('dialog', { name: 'Nepali date picker' });
    expect(dialog.parentElement).toBe(document.body);
  });
});

describe('input events', () => {
  it('calls onFocus when the input gains focus', () => {
    const spy = vi.fn();
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} onFocus={spy} />);
    fireEvent.focus(screen.getByPlaceholderText('YYYY-MM-DD (BS)'));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the input loses focus', () => {
    const spy = vi.fn();
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} onBlur={spy} />);
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('calls onKeyDown when a key is pressed on the input', () => {
    const spy = vi.fn();
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} onKeyDown={spy} />);
    fireEvent.keyDown(screen.getByPlaceholderText('YYYY-MM-DD (BS)'), { key: 'Enter' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('inputReadOnly prop', () => {
  it('sets readOnly attribute on the input when inputReadOnly={true}', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        inputReadOnly={true}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('does not set readOnly when inputReadOnly is not provided', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.readOnly).toBe(false);
  });
});

describe('autoFocus prop', () => {
  it('focuses the input when autoFocus={true}', () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        autoFocus={true}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    // React's autoFocus calls .focus() on the element; the HTML attribute is not rendered
    expect(document.activeElement === input || input.autofocus).toBeTruthy();
  });

  it('does not auto-focus when autoFocus is not provided', () => {
    render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input).not.toHaveFocus();
  });
});

describe('renderExtraFooter', () => {
  it('renders custom footer content inside the popover', async () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        renderExtraFooter={() => <div data-testid="extra-footer">Custom footer</div>}
      />
    );
    expect(await screen.findByTestId('extra-footer')).toBeInTheDocument();
  });

  it('does not render extra footer when renderExtraFooter is not provided', async () => {
    render(
      <NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} open={true} onOpenChange={() => {}} />
    );
    await waitFor(() => {
      expect(screen.queryByTestId('extra-footer')).not.toBeInTheDocument();
    });
  });
});

describe('classNames prop', () => {
  it('applies semantic class names to sub-elements', async () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        classNames={{
          popup: 'my-popup-class',
          header: 'my-header-class',
          grid: 'my-grid-class',
          footer: 'my-footer-class',
        }}
      />
    );

    const popup = await screen.findByRole('dialog', { name: 'Nepali date picker' });
    expect(popup).toHaveClass('my-popup-class');
    expect(popup.querySelector('.my-header-class')).toBeInTheDocument();
    expect(popup.querySelector('.my-grid-class')).toBeInTheDocument();
    expect(popup.querySelector('.my-footer-class')).toBeInTheDocument();
  });

  it('applies input class name to the input element', () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        classNames={{ input: 'my-input-class' }}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
    expect(input).toHaveClass('my-input-class');
  });
});

describe('styles prop', () => {
  it('applies semantic inline styles to sub-elements', async () => {
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        styles={{
          popup: { backgroundColor: 'rgb(255, 0, 0)' },
        }}
      />
    );

    const popup = await screen.findByRole('dialog', { name: 'Nepali date picker' });
    expect(popup).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
  });
});

describe('name prop', () => {
  it('renders name attribute on the input element', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        name="birth-date"
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.name).toBe('birth-date');
  });

  it('does not render name attribute when not provided', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)') as HTMLInputElement;
    expect(input.name).toBe('');
  });
});

describe('onPanelChange', () => {
  it('fires when navigating to the next month', async () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        onPanelChange={spy}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText('Next month'));
    expect(spy).toHaveBeenCalledWith({ year: 2000, month: 2, day: 1 });
  });

  it('fires when navigating to the previous month', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 3, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        onPanelChange={spy}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(spy).toHaveBeenCalledWith({ year: 2000, month: 2, day: 1 });
  });

  it('fires when a different month is selected from the dropdown', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        onPanelChange={spy}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Baishak' }));
    fireEvent.click(screen.getByRole('option', { name: 'Jestha' }));
    expect(spy).toHaveBeenCalledWith({ year: 2000, month: 2, day: 1 });
  });

  it('fires when a different year is selected from the dropdown', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        onPanelChange={spy}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2000' }));
    fireEvent.click(screen.getByRole('option', { name: '2001' }));
    expect(spy).toHaveBeenCalledWith({ year: 2001, month: 1, day: 1 });
  });

  it('does not fire when a date is selected (only navigation)', () => {
    const spy = vi.fn();
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        onPanelChange={spy}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(getDayButton(15));
    // onPanelChange should NOT be called for date selection
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('menu.yearRange', () => {
  it('constrains the year dropdown to the specified range', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        menu={{ yearRange: { min: 2000, max: 2002 } }}
      />
    );

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '2000' }));

    expect(screen.getByRole('option', { name: '2000' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2002' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '2003' })).not.toBeInTheDocument();
  });

  it('takes priority over adapter.range', () => {
    render(
      <NepaliDatePicker
        value={{ year: 2080, month: 1, day: 1 }}
        onChange={() => {}}
        adapter={adapter}
        menu={{ yearRange: { min: 2075, max: 2085 } }}
      />
    );

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '2080' }));

    // Should have 11 years (2075-2085), not the full 2000-2099 adapter range
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(11);
  });
});

describe('cellRender', () => {
  it('renders custom content for each day cell', async () => {
    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 5 }}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        cellRender={(date) => (
          <div key={`custom-${date.day}`}>
            {date.day}
          </div>
        )}
      />
    );

    // Custom renderer replaces the default day span with just the number
    // Day 15 should be rendered by the custom function
    await waitFor(() => {
      const cells = screen.getAllByText('15').filter(
        (el) => el.tagName !== 'BUTTON' && !el.closest('.np-cal-dow')
      );
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it('passes correct info to cellRender', async () => {
    const spy = vi.fn();

    render(
      <NepaliDatePicker
        value={{ year: 2000, month: 1, day: 5 }}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        cellRender={(date, info) => {
          spy(info);
          return <div>{date.day}</div>;
        }}
      />
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    // Verify info shape from a cell in current month
    const callInfo = spy.mock.calls.find((args: any[]) => {
      const info = args[0];
      return info.inCurrentMonth === true;
    })?.[0];

    expect(callInfo).toBeDefined();
    expect(callInfo).toHaveProperty('today');
    expect(callInfo).toHaveProperty('selected');
    expect(callInfo).toHaveProperty('disabled');
    expect(callInfo).toHaveProperty('inCurrentMonth');
  });
});
