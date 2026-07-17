import { bsMonthNames, bsMonthNamesNe } from '../adapter/bsTable';
import { toNepaliDigits } from './pickerUtils';
import type { PickerLocale } from './pickerTypes';

export const englishPickerLocale: PickerLocale = {
  code: 'en',
  monthNames: bsMonthNames,
  weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  formatNumber: String,
  labels: {
    clear: 'Clear',
    clearAria: 'Reset date picker',
    today: 'Today',
    todayAria: "Select today's date",
    cancel: 'Cancel',
    apply: 'Apply',
    customised: 'Customised',
  },
};

export const nepaliPickerLocale: PickerLocale = {
  code: 'ne',
  monthNames: bsMonthNamesNe,
  weekdays: ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'],
  formatNumber: toNepaliDigits,
  labels: {
    clear: 'सफा',
    clearAria: 'मिति सफा गर्नुहोस्',
    today: 'आज',
    todayAria: 'आजको मिति चयन गर्नुहोस्',
    cancel: 'रद्द गर्नुहोस्',
    apply: 'लागू गर्नुहोस्',
    customised: 'अनुकूलित',
  },
};

export function resolvePickerLocale(language: 'en' | 'ne', override?: PickerLocale): PickerLocale {
  return override ?? (language === 'ne' ? nepaliPickerLocale : englishPickerLocale);
}
