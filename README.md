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

## Props

- `value` / `onChange`: controlled usage (`BsDate | null`).
- `adapter`: any object that implements `BsAdapter` (defaults to `defaultAdapter`).
- `minDate`, `maxDate`: optional clamps.
- `firstDayOfWeek`: `0` Sunday (default) or `1` Monday.

## Styling

Base styles live in `src/styles/base.css` and are imported automatically. Override CSS variables (see file) to theme.

## Build

`npm run build` uses `tsup` to emit CJS+ESM bundles with types to `dist/`.

## Roadmap

- Ship authoritative BS tables (2000–2100) as a data package.
- Range picker + dual calendar view.
- Storybook stories and visual regression coverage.
- Input masking and ARIA refinements.
