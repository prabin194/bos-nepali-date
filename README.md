# bos-nepali-date

React-ready Nepali (Bikram Sambat) date picker packaged for reuse. Ships with a pluggable conversion adapter so you can swap in your own BS↔AD tables.

## Quick start

```bash
npm install bos-nepali-date
# or, inside this repo
npm install
npm run dev
```

```tsx
import { NepaliDatePicker, defaultAdapter } from 'bos-nepali-date';

function Demo() {
  const [value, setValue] = useState(null);
  return (
    <NepaliDatePicker
      value={value}
      onChange={setValue}
      adapter={defaultAdapter}
    />
  );
}
```

## Adapter

`MemoryBsAdapter` takes a year table: `{ [bsYear]: [12 month lengths] }` plus an anchor mapping BS→AD. The published default only contains demo data for 2080-2081; plug a full table before production.

```ts
import { MemoryBsAdapter } from 'bos-nepali-date';

const adapter = new MemoryBsAdapter({
  anchorBs: { year: 2000, month: 1, day: 1 },
  anchorAdIso: '1943-04-14',
  yearTable: yourFullTable,
});
```

## Props (NepaliDatePicker)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `BsDate \| null` | `null` | Controlled BS date value. |
| `onChange` | `(date: BsDate \| null) => void` | — | Fired on selection or clear. |
| `adapter` | `BsAdapter` | `defaultAdapter` | Conversion engine (BS↔AD). |
| `minDate` / `maxDate` | `BsDate` | — | Clamp selectable range. |
| `disableToday` | `boolean` | `false` | Prevent selecting today. |
| `disableDate` | `BsDate` | — | Disable a single date. |
| `disableDates` | `BsDate[]` | `[]` | Disable a list of dates. |
| `disableBefore` | `BsDate` | — | Disable all dates before this. |
| `disableAfter` | `BsDate` | — | Disable all dates after this. |
| `showMonth` | `boolean` | `true` | Show/hide month selector; hidden still shows current month text. |
| `showYear` | `boolean` | `true` | Show/hide year selector; hidden still shows current year text. |
| `lang` | `'en' \| 'ne'` | `'en'` | Localize month/day labels and digits (emitted value stays ASCII `YYYY-MM-DD`). |
| `firstDayOfWeek` | `0 \| 1` | `0` | Sunday or Monday start. |
| `placeholder` | `string` | `YYYY-MM-DD (BS)` | Input placeholder; mask enforces numeric `YYYY-MM-DD`. |
| `className` | `string` | — | Extra class for the root wrapper. |

### Locale behavior
- `lang="ne"` renders Nepali month names, weekday abbreviations, and Nepali digits in the grid/header. `onChange` still returns ASCII BS `YYYY-MM-DD`.
- `lang="en"` uses English labels/digits.

### Disable rules
Disable checks combine with `minDate` / `maxDate`; if any rule matches, the date is not selectable.

## Styling

Base styles live in `src/styles/base.css` and are imported automatically. Override CSS variables (see file) to theme.

## Build

`npm run build` uses `tsup` to emit CJS+ESM bundles with types to `dist/`.

## Roadmap

- Ship authoritative BS tables (2000–2100) as a data package.
- Range picker + dual calendar view.
- Storybook stories and visual regression coverage.
- Input masking and ARIA refinements.
