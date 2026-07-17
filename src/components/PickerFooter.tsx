import React from 'react';
import { cn } from '../utils/classnames';
import type { PickerLocale } from './pickerTypes';

type PickerFooterProps = {
  locale: PickerLocale;
  onClear: () => void;
  onToday: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export const PickerFooter: React.FC<PickerFooterProps> = ({ locale, onClear, onToday, className, style }) => (
  <div className={cn('np-footer', className)} style={style}>
    <button type="button" className="np-footer__btn" onClick={onClear} aria-label={locale.labels.clearAria}>
      {locale.labels.clear}
    </button>
    <button type="button" className="np-footer__btn np-footer__btn--primary" onClick={onToday} aria-label={locale.labels.todayAria}>
      {locale.labels.today}
    </button>
  </div>
);
