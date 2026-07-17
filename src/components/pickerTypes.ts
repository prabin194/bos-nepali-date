import type React from 'react';
import type { BsDate } from '../types';

export type DisableOptions = {
  today?: boolean;
  date?: BsDate;
  dates?: BsDate[];
  before?: BsDate;
  after?: BsDate;
};

export type PickerLocale = {
  code: string;
  monthNames: readonly string[];
  weekdays: readonly string[];
  formatNumber: (value: number) => string;
  labels: {
    clear: string;
    clearAria: string;
    today: string;
    todayAria: string;
    cancel: string;
    apply: string;
    customised: string;
  };
};

export type MenuOptions = {
  showMonth?: boolean;
  showYear?: boolean;
  firstDayOfWeek?: 0 | 1;
  lang?: 'en' | 'ne';
  /** Complete locale override. Takes precedence over `lang`. */
  locale?: PickerLocale;
  yearRange?: { min?: number; max?: number };
};

export type PickerSize = 'small' | 'middle' | 'large';
export type PickerStatus = 'error' | 'warning';
export type PickerVariant = 'outlined' | 'filled' | 'borderless' | 'underlined';
export type PickerPlacement = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

export type PickerClassNames = {
  input?: string;
  popup?: string;
  header?: string;
  grid?: string;
  cell?: string;
  footer?: string;
};

export type PickerStyles = {
  input?: React.CSSProperties;
  popup?: React.CSSProperties;
  header?: React.CSSProperties;
  grid?: React.CSSProperties;
  footer?: React.CSSProperties;
};
