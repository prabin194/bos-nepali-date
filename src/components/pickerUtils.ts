import { BsDate, DateFormat } from '../types';

type FormatToken = 'YYYY' | 'YY' | 'MM' | 'M' | 'DD' | 'D';

const TOKEN_REGEX = /YYYY|YY|MM|M|DD|D/g;

/** Extract ordered tokens and the separator from a format string. */
function parseFormat(fmt: string): { tokens: FormatToken[]; separator: string } {
  const tokens: FormatToken[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_REGEX.source, 'g');
  while ((m = re.exec(fmt)) !== null) {
    tokens.push(m[0] as FormatToken);
  }
  // Find the separator: the first non-token character sequence between token groups
  const sepMatch = fmt.match(/[^YYYYMMDD]+/);
  const separator = sepMatch ? sepMatch[0] : '-';
  return { tokens, separator };
}

function formatToken(token: FormatToken, date: BsDate): string {
  const { year, month, day } = date;
  switch (token) {
    case 'YYYY': return String(year).padStart(4, '0');
    case 'YY':   return String(year).slice(-2).padStart(2, '0');
    case 'MM':   return String(month).padStart(2, '0');
    case 'M':    return String(month);
    case 'DD':   return String(day).padStart(2, '0');
    case 'D':    return String(day);
  }
}

// Cache parsed formats for performance
const formatCache = new Map<string, { tokens: FormatToken[]; separator: string }>();

function getParsedFormat(fmt: string): { tokens: FormatToken[]; separator: string } {
  let cached = formatCache.get(fmt);
  if (!cached) {
    cached = parseFormat(fmt);
    formatCache.set(fmt, cached);
  }
  return cached;
}

export function formatBs(date?: BsDate | null, format: DateFormat = 'YYYY-MM-DD'): string {
  if (!date) return '';
  const { tokens, separator } = getParsedFormat(format);
  return tokens.map((t) => formatToken(t, date)).join(separator);
}

/**
 * Parse a formatted BS date string back into a BsDate object.
 * Accepts both the exact format and lenient variations (e.g. single-digit month/day).
 */
export function parseBs(input: string, format: DateFormat = 'YYYY-MM-DD'): BsDate | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const { tokens, separator } = getParsedFormat(format);
  // Split by the separator (escape special regex characters)
  const escapedSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^\\s*${tokens.map(() => `(\\d{1,4})`).join(escapedSep)}\\s*$`);
  const match = cleaned.match(regex);
  if (!match) return null;

  let year = 0, month = 1, day = 1;
  for (let i = 0; i < tokens.length; i++) {
    const val = parseInt(match[i + 1], 10);
    switch (tokens[i]) {
      case 'YYYY':
      case 'YY':
        year = tokens[i] === 'YY' && val < 100 ? 2000 + val : val;
        break;
      case 'MM':
      case 'M':
        month = val;
        break;
      case 'DD':
      case 'D':
        day = val;
        break;
    }
  }
  if (month < 1 || month > 12 || day < 1 || day > 32) return null;
  return { year, month, day };
}

/** Minimum digit width for each token when building auto-format positions. */
function tokenMinWidth(token: FormatToken): number {
  switch (token) {
    case 'YYYY': return 4;
    case 'YY':   return 2;
    case 'MM':   return 2;
    case 'DD':   return 2;
    case 'M':    return 1; // variable, use min
    case 'D':    return 1; // variable, use min
  }
}

/** Maximum digit width for each token. */
function tokenMaxWidth(token: FormatToken): number {
  switch (token) {
    case 'YYYY': return 4;
    case 'YY':   return 2;
    case 'MM':   return 2;
    case 'DD':   return 2;
    case 'M':    return 2;
    case 'D':    return 2;
  }
}

export type FormatInfo = {
  tokens: FormatToken[];
  separator: string;
  /** The positions (0-based, in raw digit string) where separators should be auto-inserted. */
  insertPositions: number[];
  /** Total character length of the fully-formatted string (digits + separators) at max widths. */
  fullLength: number;
  /** Minimum character length (digits + separators) at min widths (for variable-width tokens like M, D). */
  minFullLength: number;
};

const formatInfoCache = new Map<string, FormatInfo>();

export function getFormatInfo(fmt: string): FormatInfo {
  const cached = formatInfoCache.get(fmt);
  if (cached) return cached;
  const { tokens, separator } = getParsedFormat(fmt);
  const minWidths = tokens.map(tokenMinWidth);
  const insertPositions: number[] = [];
  let pos = 0;
  for (let i = 0; i < minWidths.length - 1; i++) {
    pos += minWidths[i];
    insertPositions.push(pos);
  }
  const digitMaxCount = tokens.reduce((sum, t) => sum + tokenMaxWidth(t), 0);
  const digitMinCount = tokens.reduce((sum, t) => sum + tokenMinWidth(t), 0);
  const sepLen = separator.length * (tokens.length - 1);
  const fullLength = digitMaxCount + sepLen;
  const minFullLength = digitMinCount + sepLen;
  const result: FormatInfo = { tokens, separator, insertPositions, fullLength, minFullLength };
  formatInfoCache.set(fmt, result);
  return result;
}

/** Generate an input `pattern` regex string for a given format. */
export function generateInputPattern(fmt: string): string {
  const { tokens, separator } = getParsedFormat(fmt);
  const escapedSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = tokens.map((t) => {
    const w = tokenMaxWidth(t);
    return w === 1 ? '\\d{1,2}' : `\\d{${w}}`;
  });
  return `^${parts.join(escapedSep)}$`;
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
    .replace(/\D/g, '');
}


