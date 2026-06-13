import React from 'react';
import { cn } from '../utils/classnames';

type PickerFooterProps = {
  isNepali: boolean;
  onClear: () => void;
  onToday: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export const PickerFooter: React.FC<PickerFooterProps> = ({ isNepali, onClear, onToday, className, style }) => (
  <div className={cn('np-footer', className)} style={style}>
    <button type="button" className="np-footer__btn" onClick={onClear} aria-label={isNepali ? 'मिति सफा गर्नुहोस्' : 'Reset date picker'}>
      {isNepali ? 'सफा' : 'Clear'}
    </button>
    <button type="button" className="np-footer__btn np-footer__btn--primary" onClick={onToday} aria-label={isNepali ? 'आजको मिति चयन गर्नुहोस्' : 'Select today\'s date'}>
      {isNepali ? 'आज' : 'Today'}
    </button>
  </div>
);
