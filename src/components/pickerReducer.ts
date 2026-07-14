import { BsDate } from '../types';

export type PickerUIState = {
  open: boolean;
  monthOpen: boolean;
  yearOpen: boolean;
  viewMonth: BsDate;
};

export type PickerUIAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE_OPEN' }
  | { type: 'TOGGLE_MONTH' }
  | { type: 'TOGGLE_YEAR' }
  | { type: 'SELECT_MONTH'; month: number }
  | { type: 'SELECT_YEAR'; year: number }
  | { type: 'SET_VIEW_MONTH'; viewMonth: BsDate };

export function pickerUIReducer(state: PickerUIState, action: PickerUIAction): PickerUIState {
  switch (action.type) {
    case 'OPEN':
      return { ...state, open: true };
    case 'CLOSE':
      return { ...state, open: false, monthOpen: false, yearOpen: false };
    case 'TOGGLE_OPEN':
      return { ...state, open: !state.open, monthOpen: false, yearOpen: false };
    case 'TOGGLE_MONTH':
      return { ...state, monthOpen: !state.monthOpen, yearOpen: false };
    case 'TOGGLE_YEAR':
      return { ...state, yearOpen: !state.yearOpen, monthOpen: false };
    case 'SELECT_MONTH':
      return { ...state, viewMonth: { ...state.viewMonth, month: action.month, day: 1 }, monthOpen: false };
    case 'SELECT_YEAR':
      return { ...state, viewMonth: { ...state.viewMonth, year: action.year, day: 1 }, yearOpen: false };
    case 'SET_VIEW_MONTH':
      return { ...state, viewMonth: action.viewMonth };
    default:
      return state;
  }
}
