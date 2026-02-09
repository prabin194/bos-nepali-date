import { BsDate } from '../types';

export function formatBs(date?: BsDate | null): string {
  if (!date) return '';
  const { year, month, day } = date;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function toNepaliDigits(input: number | string): string {
  const map = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

export function normalizeDigitsToAscii(value: string): string {
  const nepaliMap: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };
  const arabicMap: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return value
    .replace(/[०१२३४५६७८९]/g, (ch) => nepaliMap[ch] ?? '')
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (ch) => arabicMap[ch] ?? '')
    .replace(/\D/g, (ch) => (/[0-9]/.test(ch) ? ch : ''));
}

export function parseBs(input: string): BsDate | null {
  const match = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return { year: Number(y), month: Number(m), day: Number(d) };
}
