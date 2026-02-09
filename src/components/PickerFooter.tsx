import React from 'react';

type PickerFooterProps = {
  isNepali: boolean;
  onClear: () => void;
  onToday: () => void;
};

export const PickerFooter: React.FC<PickerFooterProps> = ({ isNepali, onClear, onToday }) => (
  <div className="np-footer">
    <button type="button" className="np-footer__btn" onClick={onClear}>
      {isNepali ? 'सफा' : 'Clear'}
    </button>
    <button type="button" className="np-footer__btn np-footer__btn--primary" onClick={onToday}>
      {isNepali ? 'आज' : 'Today'}
    </button>
  </div>
);
