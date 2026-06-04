# bos-nepali-date — Gap Analysis & Roadmap

> Comparison against Ant Design DatePicker (v5.x) to identify feature gaps and prioritize improvements.

---

## Where We Win (no gap — our differentiators)

| Feature | Ant Design | bos-nepali-date |
|---|---|---|
| **Bikram Sambat dates** | ❌ No support at all | ✅ True BS calendar with pluggable adapter |
| **Nepali localization** | ❌ Only Gregorian locales | ✅ English + Nepali (labels, digits, months) |
| **Pluggable adapter** | ❌ Tied to dayjs | ✅ BsAdapter interface — swap any engine |
| **Bundle size** | ~100kB+ (entire antd) | ✅ ~21kB UMD, one runtime dep (clsx) |
| **Portal popover** | ❌ Can clip in overflow containers | ✅ Portal-based, overflow-safe |
| **Nepali digit input** | ❌ Not possible natively | ✅ Accepts & normalizes ०-९ |

---

## Critical Gaps (P0 — should address)

### 1. Range Picker (`NepaliDateRangePicker`)
- **What Ant Design has:** Full `RangePicker` with start/end date selection, visual range highlighting between selected dates, dual-month side-by-side view, independent input fields.
- **Our gap:** No range selection at all.
- **Suggested approach:** New `NepaliDateRangePicker` component reusing existing calendar subcomponents. Dual-month layout. `onChange` returns `[BsDate | null, BsDate | null]`. Controlled + uncontrolled modes.

### 2. Controlled `open` / `onOpenChange`
- **What Ant Design has:** `open` prop to control popover visibility externally, `onOpenChange` callback when it opens/closes.
- **Our gap:** Popover state is fully internal — no way to control or observe it from outside.
- **Suggested approach:** Add `open?: boolean` and `onOpenChange?: (open: boolean) => void` props to `NepaliDatePicker`. Internal reducer respects external open state.

### 3. `disabledDate` callback
- **What Ant Design has:** `disabledDate: (currentDate: Dayjs) => boolean` — a function that receives each date and returns true/false. Enables dynamic rules like "disable weekends" or "disable public holidays."
- **Our gap:** Only static disable rules (`today`, `before`, `after`, date list). No callback for custom logic.
- **Suggested approach:** Add `disabledDate?: (date: BsDate) => boolean` prop. If provided, it's called for each calendar cell alongside existing `disable` options.

### 4. Size variants (`size` prop)
- **What Ant Design has:** `small` (24px), `middle` (32px), `large` (40px) — three predefined sizes.
- **Our gap:** Single fixed size.
- **Suggested approach:** Add `size?: 'small' | 'middle' | 'large'` prop. Map to CSS classes/variables that adjust input height, font size, popover sizing.

### 5. Error/warning status (`status` prop)
- **What Ant Design has:** `status: 'error' | 'warning'` — applies visual validation state to the picker.
- **Our gap:** No validation state support.
- **Suggested approach:** Add `status?: 'error' | 'warning'` prop. Apply colored borders/backgrounds to the input.

---

## Important Gaps (P1 — significant UX value)

| Feature | Description | Priority |
|---|---|---|
| **Presets / quick ranges** | `presets` prop for shortcuts like "Today", "This month", "Last 7 days" — useful for RangePicker too | High |
| **Custom `format`** | Accept a format string (e.g., `"YYYY/MM/DD"`) instead of fixed `YYYY-MM-DD` | High |
| **`cellRender`** | Custom render function for individual calendar day cells (badges, markers, indicators) | Medium |
| **`placement`** | Configurable popover direction: `top`, `bottom`, `left`, `right` | Medium |
| **`allowClear`** | Clear button directly on the input field (not just in footer) | Medium |
| **Controlled `mode`** | Externally control the calendar view mode (month/year selection) | Low |

---

## Nice-to-Have Gaps (P2)

| Feature | Description |
|---|---|
| **`showTime`** | Time selection alongside the date (BS time?) |
| **`multiple`** | Select multiple dates (perhaps for BS calendar?) |
| **`renderExtraFooter`** | Custom React node at the bottom of the popover |
| **`panelRender`** | Full override of the popover panel structure |
| **`needConfirm`** | Require an explicit OK click before selection commits |
| **`variant`** | Visual variants: outlined, filled, borderless |
| **`picker` modes** | Week picker, month picker, quarter picker, year picker |
| **`classNames`/`styles`** | Semantic DOM targeting for sub-elements |
| **Form integration** | Native integration with form libraries |

---

## Recommended Implementation Order

1. **Range Picker** — highest user demand, already on the roadmap
2. **`disabledDate` callback** — small API addition, huge flexibility gain
3. **Controlled `open`/`onOpenChange`** — unlocks form integration patterns
4. **`size` + `status`** — quick visual polish wins
5. **Presets** — enhances both single picker and range picker
6. **Everything else** — as needed

---

*Last updated: June 2026*
