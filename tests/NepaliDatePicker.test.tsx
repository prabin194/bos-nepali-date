import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NepaliDatePicker } from '../src/components/NepaliDatePicker';
import { defaultAdapter } from '../src/adapter/memoryAdapter';

const adapter = defaultAdapter;

function openPicker() {
  const input = screen.getByPlaceholderText('YYYY-MM-DD (BS)');
  fireEvent.focus(input);
  fireEvent.click(input);
}

describe('disable rules', () => {
  it('disables today when disableToday is true', () => {
    const today = adapter.today();
    render(<NepaliDatePicker value={null} onChange={() => {}} adapter={adapter} disableToday />);
    openPicker();
    const todayBtn = screen.getAllByText(String(today.day))[0];
    expect(todayBtn).toBeDisabled();
  });

  it('disables specific date', () => {
    const disableDate = { year: 2000, month: 1, day: 1 };
    render(
      <NepaliDatePicker
        value={null}
        onChange={() => {}}
        adapter={adapter}
        disableDate={disableDate}
      />
    );
    openPicker();
    const btn = screen.getByText('1');
    expect(btn).toBeDisabled();
  });
});

describe('Nepali locale', () => {
  it('renders Nepali digits and month names when lang="ne"', () => {
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
    // year rendered in Nepali digits
    expect(screen.getByText('२०००')).toBeInTheDocument();
  });
});
