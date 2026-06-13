import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { NepaliDateRangePicker } from '../src/components/NepaliDateRangePicker';
import { defaultAdapter } from '../src/adapter/memoryAdapter';
import { BsDate } from '../src/types';

const adapter = defaultAdapter;

function openPicker() {
  // Click on either input to open
  const input = screen.getByLabelText('Start date');
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('basic rendering', () => {
  it('renders two inputs with separator', () => {
    render(<NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} />);
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('renders custom separator', () => {
    render(<NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} separator="to" />);
    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('renders custom end placeholder', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        placeholder="Start"
        endPlaceholder="End"
      />
    );
    expect(screen.getByPlaceholderText('Start')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('End')).toBeInTheDocument();
  });
});

describe('controlled value', () => {
  it('displays start and end values', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 15 }]}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2000-01-01');
    expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe('2000-01-15');
  });

  it('fires onChange with updated range on calendar selection', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 5 }, null]}
        onChange={spy}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Click a second date to complete the range (start is already 5)
    fireEvent.click(getDayButton(10));
    expect(spy).toHaveBeenCalledWith([{ year: 2000, month: 1, day: 5 }, { year: 2000, month: 1, day: 10 }]);
  });

  it('syncs inputs when controlled value changes', async () => {
    const { rerender } = render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
      />
    );

    expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2000-01-01');

    rerender(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 2, day: 5 }, { year: 2000, month: 2, day: 20 }]}
        onChange={() => {}}
        adapter={adapter}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2000-02-05');
      expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe('2000-02-20');
    });
  });
});

describe('range selection flow', () => {
  it('first click sets start and keeps popover open', () => {
    vi.spyOn(adapter, 'today').mockReturnValue({ year: 2000, month: 1, day: 15 });
    render(
      <NepaliDateRangePicker
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(getDayButton(10));

    // Popover should still be open after first click
    expect(screen.getByRole('dialog', { name: 'Nepali date range picker' })).toBeInTheDocument();
  });

  it('second click completes the range and signals close', () => {
    const closeSpy = vi.fn();
    vi.spyOn(adapter, 'today').mockReturnValue({ year: 2000, month: 1, day: 15 });
    render(
      <NepaliDateRangePicker
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={closeSpy}
      />
    );

    fireEvent.click(getDayButton(5));
    fireEvent.click(getDayButton(15));

    // With controlled open, closePicker() calls onOpenChange(false)
    expect(closeSpy).toHaveBeenCalledWith(false);
  });

  it('auto-swaps when second click is before the first', () => {
    const spy = vi.fn();
    vi.spyOn(adapter, 'today').mockReturnValue({ year: 2000, month: 1, day: 15 });
    render(
      <NepaliDateRangePicker
        onChange={spy}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(getDayButton(15));
    spy.mockClear();
    fireEvent.click(getDayButton(5));

    // Should swap: [5, 15] not [15, 5]
    expect(spy).toHaveBeenCalledWith([
      { year: 2000, month: 1, day: 5 },
      { year: 2000, month: 1, day: 15 },
    ]);
  });

  it('third click restarts selection with new start date', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 5 }, { year: 2000, month: 1, day: 15 }]}
        onChange={spy}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Third click - should restart selection with 10 as new start
    fireEvent.click(getDayButton(10));

    // Should start a new selection with 10 as start
    expect(spy).toHaveBeenCalledWith([{ year: 2000, month: 1, day: 10 }, null]);
  });
});

describe('disabledDate in range picker', () => {
  it('disables dates via callback', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
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
});

describe('minDate/maxDate in range picker', () => {
  it('disables dates outside min/max range', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 10 }, null]}
        onChange={() => {}}
        adapter={adapter}
        minDate={{ year: 2000, month: 1, day: 5 }}
        maxDate={{ year: 2000, month: 1, day: 20 }}
      />
    );

    openPicker();
    expect(getDayButton(3)).toBeDisabled();
    expect(getDayButton(22)).toBeDisabled();
    expect(getDayButton(10)).not.toBeDisabled();
  });
});

describe('clear in range picker', () => {
  it('calls onChange with [null, null] on clear', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 15 }]}
        onChange={spy}
        adapter={adapter}
        allowClear={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Clear range'));
    expect(spy).toHaveBeenCalledWith([null, null]);
  });
});

describe('size/status/disabled on range picker', () => {
  it('applies size class', () => {
    const { container } = render(
      <NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} size="small" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--small');
  });

  it('applies status class', () => {
    const { container } = render(
      <NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} status="error" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--error');
  });

  it('disables inputs when disabled={true}', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 15 }]}
        onChange={() => {}}
        adapter={adapter}
        disabled={true}
      />
    );
    expect(screen.getByLabelText('Start date')).toBeDisabled();
    expect(screen.getByLabelText('End date')).toBeDisabled();
  });
});

describe('variant on range picker', () => {
  it('applies filled variant class', () => {
    const { container } = render(
      <NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} variant="filled" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--filled');
  });

  it('applies underlined variant class', () => {
    const { container } = render(
      <NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} variant="underlined" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--underlined');
  });

  it('applies borderless variant class', () => {
    const { container } = render(
      <NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} variant="borderless" />
    );
    expect(container.querySelector('.np-picker')).toHaveClass('np-picker--borderless');
  });

  it('underlined variant renders with values', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 15 }]}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
      />
    );
    expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2000-01-01');
    expect((screen.getByLabelText('End date') as HTMLInputElement).value).toBe('2000-01-15');
  });

  it('underlined variant works with size="small"', () => {
    const { container } = render(
      <NepaliDateRangePicker
        value={[null, null]}
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

  it('underlined variant works with status="warning"', () => {
    const { container } = render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
        status="warning"
      />
    );
    const picker = container.querySelector('.np-picker');
    expect(picker).toHaveClass('np-picker--underlined');
    expect(picker).toHaveClass('np-picker--warning');
  });

  it('underlined variant opens picker on focus', async () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        variant="underlined"
      />
    );
    openPicker();
    expect(await screen.findByRole('dialog', { name: 'Nepali date range picker' })).toBeInTheDocument();
  });

  it('underlined variant allows range selection', () => {
    const spy = vi.fn();
    vi.spyOn(adapter, 'today').mockReturnValue({ year: 2000, month: 1, day: 15 });
    render(
      <NepaliDateRangePicker
        onChange={spy}
        adapter={adapter}
        variant="underlined"
        open={true}
        onOpenChange={() => {}}
      />
    );
    fireEvent.click(getDayButton(5));
    fireEvent.click(getDayButton(15));
    expect(spy).toHaveBeenCalledWith([
      { year: 2000, month: 1, day: 5 },
      { year: 2000, month: 1, day: 15 },
    ]);
  });

  it('underlined variant clears values via allowClear', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 15 }]}
        onChange={spy}
        adapter={adapter}
        variant="underlined"
        allowClear={true}
      />
    );
    fireEvent.click(screen.getByLabelText('Clear range'));
    expect(spy).toHaveBeenCalledWith([null, null]);
  });
});

describe('controlled open on range picker', () => {
  it('opens when open={true}', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Nepali date range picker' })).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={spy}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(spy).toHaveBeenCalledWith(false);
  });
});

describe('input events on range picker', () => {
  it('calls onFocus when an input gains focus', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        onFocus={spy}
      />
    );
    fireEvent.focus(screen.getByLabelText('Start date'));
    expect(spy).toHaveBeenCalled();
  });

  it('calls onBlur when an input loses focus', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        onBlur={spy}
      />
    );
    // onBlur is on the end input in the range picker
    const endInput = screen.getByLabelText('End date');
    fireEvent.focus(endInput);
    fireEvent.blur(endInput);
    expect(spy).toHaveBeenCalled();
  });

  it('calls onKeyDown when a key is pressed on either input', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        onKeyDown={spy}
      />
    );
    // onKeyDown is on the end input in the range picker
    fireEvent.keyDown(screen.getByLabelText('End date'), { key: 'Enter' });
    expect(spy).toHaveBeenCalled();
  });
});

describe('getPopupContainer on range picker', () => {
  it('renders popover in custom container', async () => {
    render(
      <div data-testid="custom-root">
        <NepaliDateRangePicker
          value={[null, null]}
          onChange={() => {}}
          adapter={adapter}
          getPopupContainer={() => document.querySelector('[data-testid="custom-root"]') as HTMLElement}
        />
      </div>
    );

    openPicker();
    const dialog = await screen.findByRole('dialog', { name: 'Nepali date range picker' });
    const customRoot = screen.getByTestId('custom-root');
    expect(customRoot.contains(dialog)).toBe(true);
  });
});

describe('renderExtraFooter on range picker', () => {
  it('renders custom footer content', async () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        renderExtraFooter={() => <div data-testid="range-extra-footer">Range presets</div>}
      />
    );
    expect(await screen.findByTestId('range-extra-footer')).toBeInTheDocument();
  });
});

describe('classNames on range picker', () => {
  it('applies semantic class names to sub-elements', async () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        classNames={{
          popup: 'rp-popup',
          header: 'rp-header',
          grid: 'rp-grid',
          footer: 'rp-footer',
        }}
      />
    );

    const popup = await screen.findByRole('dialog', { name: 'Nepali date range picker' });
    expect(popup).toHaveClass('rp-popup');
    expect(popup.querySelector('.rp-header')).toBeInTheDocument();
    expect(popup.querySelector('.rp-grid')).toBeInTheDocument();
    expect(popup.querySelector('.rp-footer')).toBeInTheDocument();
  });
});

describe('placement on range picker', () => {
  it('renders without error with topLeft placement', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        placement="topLeft"
      />
    );
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
  });
});

describe('inputReadOnly on range picker', () => {
  it('sets readOnly on both inputs', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 15 }]}
        onChange={() => {}}
        adapter={adapter}
        inputReadOnly={true}
      />
    );
    expect((screen.getByLabelText('Start date') as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText('End date') as HTMLInputElement).readOnly).toBe(true);
  });
});

describe('autoFocus on range picker', () => {
  it('focuses the start input when autoFocus={true}', () => {
    render(
      <NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} autoFocus={true} />
    );
    const input = screen.getByLabelText('Start date') as HTMLInputElement;
    // React's autoFocus calls .focus() on the element; the HTML attribute is not rendered
    expect(document.activeElement === input || input.autofocus).toBeTruthy();
  });

  it('does not auto-focus when not provided', () => {
    render(<NepaliDateRangePicker value={[null, null]} onChange={() => {}} adapter={adapter} />);
    expect(screen.getByLabelText('Start date')).not.toHaveFocus();
  });
});

describe('styles prop on range picker', () => {
  it('applies inline styles to popup', async () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        styles={{ popup: { backgroundColor: 'rgb(0, 255, 0)' } }}
      />
    );
    const popup = await screen.findByRole('dialog', { name: 'Nepali date range picker' });
    expect(popup).toHaveStyle({ backgroundColor: 'rgb(0, 255, 0)' });
  });
});

describe('cellRender on range picker', () => {
  it('renders custom day cells', async () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 10 }, null]}
        onChange={() => {}}
        adapter={adapter}
        cellRender={(date) => <div data-testid={`rp-cell-${date.day}`}>{date.day}</div>}
      />
    );
    openPicker();
    await waitFor(() => {
      // With dual-month view, day appears in both calendars
      expect(screen.getAllByTestId('rp-cell-10').length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('disable rules on range picker', () => {
  it('disables today when disable.today is true', () => {
    // Mock today to a known date in the current view
    const today = { year: 2000, month: 1, day: 15 };
    vi.spyOn(adapter, 'today').mockReturnValue(today);

    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 10 }, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        disable={{ today: true }}
      />
    );
    expect(getDayButton(15)).toBeDisabled();
  });

  it('disables dates before/after bounds', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 10 }, null]}
        onChange={() => {}}
        adapter={adapter}
        disable={{
          before: { year: 2000, month: 1, day: 5 },
          after: { year: 2000, month: 1, day: 20 },
        }}
      />
    );
    openPicker();
    expect(getDayButton(3)).toBeDisabled();
    expect(getDayButton(22)).toBeDisabled();
    expect(getDayButton(10)).not.toBeDisabled();
  });
});

describe('Nepali locale in range picker', () => {
  it('renders Nepali month names when lang="ne"', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
        menu={{ lang: 'ne' }}
      />
    );
    openPicker();
    expect(screen.getByText('बैशाख')).toBeInTheDocument();
  });
});

describe('hover preview on range picker', () => {
  it('highlights dates between start and hovered date', async () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 5 }, null]}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    openPicker();

    // Hover over day 10
    fireEvent.mouseEnter(getDayButton(10));

    // Day 7 (between 5 and 10) should get the np-cal-cell--range class
    await waitFor(() => {
      const cells = document.querySelectorAll('.np-cal-cell--range');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});

describe('Escape on range picker (uncontrolled)', () => {
  it('closes popover on Escape', async () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 5 }, null]}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    openPicker();
    expect(screen.getByRole('dialog', { name: 'Nepali date range picker' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Nepali date range picker' })).not.toBeInTheDocument();
    });
  });
});

describe('name / nameEnd props', () => {
  it('renders name attribute on the start input', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        name="range-start"
      />
    );
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    expect(startInput.name).toBe('range-start');
  });

  it('renders nameEnd attribute on the end input', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        nameEnd="range-end"
      />
    );
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    expect(endInput.name).toBe('range-end');
  });

  it('does not render name attributes when not provided', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    expect(startInput.name).toBe('');
    expect(endInput.name).toBe('');
  });
});

describe('presets', () => {
  it('renders preset buttons when presets are provided', async () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        presets={[
          {
            label: 'This Week',
            value: [
              { year: 2000, month: 1, day: 3 },
              { year: 2000, month: 1, day: 9 },
            ],
          },
        ]}
      />
    );
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('fires onChange with preset range on click', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={spy}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        presets={[
          {
            label: 'This Month',
            value: [
              { year: 2000, month: 1, day: 1 },
              { year: 2000, month: 1, day: 31 },
            ],
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText('This Month'));
    expect(spy).toHaveBeenCalledWith([
      { year: 2000, month: 1, day: 1 },
      { year: 2000, month: 1, day: 31 },
    ]);
  });

  it('closes the popover after selecting a preset', async () => {
    const closeSpy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={closeSpy}
        presets={[
          {
            label: 'Apply',
            value: [
              { year: 2000, month: 1, day: 1 },
              { year: 2000, month: 1, day: 15 },
            ],
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText('Apply'));
    expect(closeSpy).toHaveBeenCalledWith(false);
  });

  it('renders multiple preset buttons', () => {
    render(
      <NepaliDateRangePicker
        value={[null, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
        presets={[
          { label: 'This Week', value: [{ year: 2000, month: 1, day: 3 }, { year: 2000, month: 1, day: 9 }] },
          { label: 'This Month', value: [{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 31 }] },
          { label: 'This Year', value: [{ year: 2000, month: 1, day: 1 }, { year: 2000, month: 12, day: 30 }] },
        ]}
      />
    );
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('This Year')).toBeInTheDocument();
  });
});

describe('onPanelChange in range picker', () => {
  it('fires when navigating to the next month', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
        onPanelChange={spy}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText('Next months'));
    expect(spy).toHaveBeenCalledWith({ year: 2000, month: 2, day: 1 });
  });

  it('fires when a different month is selected', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
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

  it('fires when a different year is selected', () => {
    const spy = vi.fn();
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
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
});

describe('menu.yearRange in range picker', () => {
  it('constrains the year dropdown', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
        menu={{ yearRange: { min: 2000, max: 2003 } }}
      />
    );

    openPicker();
    fireEvent.click(screen.getByRole('button', { name: '2000' }));

    expect(screen.getByRole('option', { name: '2003' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '2004' })).not.toBeInTheDocument();
  });
});

describe('dual-month view in range picker', () => {
  it('renders two calendar grids side by side', async () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    openPicker();

    // The left month shows the current month, right shows next month
    await waitFor(() => {
      const grids = document.querySelectorAll('.np-cal-grid');
      expect(grids.length).toBe(2);
    });
  });

  it('shows left month + next month in the header', async () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
      />
    );
    openPicker();

    // Left month: Baishak, Right month: Jestha
    const headerButtons = screen.getAllByRole('button');
    const monthButtons = headerButtons.filter(
      (b) => b.classList.contains('np-popover__selector') && !b.classList.contains('np-popover__selector--static')
    );
    expect(monthButtons.length).toBeGreaterThanOrEqual(1);

    // The static right month should also be visible
    expect(screen.getByText('Jestha')).toBeInTheDocument();
  });

  it('navigates both months forward', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Click next — left month goes from Baishak to Jestha, right goes from Jestha to Ashar
    fireEvent.click(screen.getByLabelText('Next months'));

    expect(screen.getByText('Jestha')).toBeInTheDocument();
    expect(screen.getByText('Ashar')).toBeInTheDocument();
  });

  it('navigates both months backward', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 3, day: 1 }, null]}
        onChange={() => {}}
        adapter={adapter}
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Click prev — left goes from Ashar to Jestha, right goes from Shrawan to Ashar
    fireEvent.click(screen.getByLabelText('Previous months'));

    expect(screen.getByText('Jestha')).toBeInTheDocument();
    expect(screen.getByText('Ashar')).toBeInTheDocument();
  });


});

describe('disabledDate combined with static rules on range picker', () => {
  it('combines callback and static disable rules', () => {
    render(
      <NepaliDateRangePicker
        value={[{ year: 2000, month: 1, day: 10 }, null]}
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
});
