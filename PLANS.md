# bos-nepali-date — Gap Analysis & Roadmap

> Comprehensive comparison against Ant Design DatePicker (v5.x) to identify feature gaps, prioritize improvements, and guide implementation.
>
> **Live reference:** [ant.design/components/date-picker](https://ant.design/components/date-picker/)

---

## Where We Win (no gap — our differentiators)

| Feature | Ant Design | bos-nepali-date |
|---|---|---|
| **Bikram Sambat dates** | ❌ No support at all | ✅ True BS calendar with pluggable adapter |
| **Nepali localization** | ❌ Only Gregorian locales | ✅ English + Nepali (labels, digits, months) |
| **Pluggable adapter** | ❌ Tied to dayjs | ✅ `BsAdapter` interface — swap any engine |
| **Portal popover** | ❌ Can clip in overflow containers | ✅ Portal-based, overflow-safe |
| **Nepali digit input** | ❌ Not possible natively | ✅ Accepts & normalizes ०-९ and Arabic ٠-١ digits |
| **Bundle size** | ~100kB+ (entire antd) | ✅ ~21kB UMD, one runtime dep (`clsx`) |

---

## Full API Surface Comparison

| Prop / Feature | Ant Design | bos-nepali-date | Gap |
|---|---|---|---|
| **`value` / `onChange`** | ✅ `Dayjs` | ✅ `BsDate \| null` | ✅ Supported |
| **`minDate` / `maxDate`** | ✅ `Dayjs` | ✅ `BsDate` | ✅ Supported |
| **`placeholder`** | ✅ | ✅ | ✅ Supported |
| `disabledDate` callback | ✅ Function per cell | ❌ Static rules only | ❌ **Missing** |
| **`open` / `onOpenChange`** | ✅ Controlled open | ❌ Internal only | ❌ **Missing** |
| **`size`** | ✅ `large`, `middle`, `small` | ❌ Fixed size | ❌ **Missing** |
| **`status`** | ✅ `'error' \| 'warning'` | ❌ No validation states | ❌ **Missing** |
| **`disabled`** | ✅ Boolean | ❌ No full disable | ❌ **Missing** |
| **`variant`** | ✅ `outlined`, `borderless`, `filled`, `underlined` | ❌ Single style | ❌ **Missing** |
| **`allowClear`** | ✅ In-field clear button | ❌ Footer clear only | ❌ **Missing** |
| **`format`** | ✅ Custom format string | ❌ Fixed `YYYY-MM-DD` | ❌ **Missing** |
| **`presets`** | ✅ Quick-select presets | ❌ Not available | ❌ **Missing** |
| **`placement`** | ✅ `bottomLeft`, `topLeft`, etc. | ❌ Auto only | ❌ **Missing** |
| **Range picker** | ✅ `RangePicker` | ❌ Not available | ❌ **Missing** |
| **`cellRender`** | ✅ Custom day rendering | ❌ Static days only | ❌ **Missing** |
| **`panelRender`** | ✅ Full panel override | ❌ Not available | ❌ **Missing** |
| **`renderExtraFooter`** | ✅ Extra footer content | ❌ Not available | ❌ **Missing** |
| **`mode` / `onPanelChange`** | ✅ Controlled panel mode | ❌ Internal only | ❌ **Missing** |
| **`picker`** | ✅ `date`, `week`, `month`, `quarter`, `year` | ❌ Date only | ❌ **Missing** |
| **`showTime`** | ✅ Time selection | ❌ Not available | ❌ **Missing** |
| **`multiple`** | ✅ Multiple date selection | ❌ Not available | ❌ **Missing** |
| **`needConfirm`** | ✅ Explicit OK to commit | ❌ Auto-commit only | ❌ **Missing** |
| **`getPopupContainer`** | ✅ Custom popup parent | ❌ Always `document.body` | ❌ **Missing** |
| **`prefix` / `suffix`** | ✅ Input icons | ❌ Calendar icon only | ❌ **Missing** |
| **`classNames` / `styles`** | ✅ Semantic sub-element targeting | ❌ Not available | ❌ **Missing** |
| **`locale`** | ✅ Per-component locale | ❌ Only via `menu.lang` | ❌ **Missing** |
| **`inputReadOnly`** | ✅ Read-only input | ❌ Not supported | ❌ **Missing** |
| **`autoFocus`** | ✅ Auto-focus on mount | ❌ Not supported | ❌ **Missing** |
| **`onFocus` / `onBlur`** | ✅ Focus events | ❌ Not exposed | ❌ **Missing** |
| **`onKeyDown`** | ✅ Keyboard events | ❌ Not exposed | ❌ **Missing** |

---

## Critical Gaps (P0 — blocks real-world adoption)

### 1. Range Picker (`NepaliDateRangePicker`)

**Ant Design API:**
```tsx
<DatePicker.RangePicker
  value={[start, end]}
  onChange={(dates) => {}}
  // Dual-month side-by-side view
  // Visual range highlighting
  // Independent input fields
/>
```

**What we need:**
```tsx
<NepaliDateRangePicker
  value={[BsDate | null, BsDate | null]}
  onChange={([start, end]) => void}
  startPlaceholder="Start date"
  endPlaceholder="End date"
  separator="→"
  // All existing props adapted for range
/>
```

**Implementation checklist:**
- [ ] New `NepaliDateRangePicker` component
- [ ] Dual-month calendar grid with linked navigation
- [ ] Visual range highlighting (start → end connected cells)
- [ ] Hover preview of the in-progress range
- [ ] Separate input fields for start/end
- [ ] Controlled + uncontrolled modes
- [ ] Shared disable/minDate/maxDate logic
- [ ] Keyboard navigation (Tab between inputs, arrow keys)
- [ ] Responsive: stack vertically on mobile, side-by-side on desktop
- [ ] Presets support

---

### 2. Controlled `open` / `onOpenChange`

**Ant Design API:**
```tsx
<DatePicker
  open={isOpen}
  onOpenChange={(open) => setIsOpen(open)}
/>
```

**Required changes:**
- Add `open?: boolean` and `onOpenChange?: (open: boolean) => void` props
- When `open` is provided, the internal reducer must be subordinated to it
- When `open` is not provided, internal reducer works as before (uncontrolled)
- All existing close/open triggers (Escape, click-outside, date select, clear) must fire `onOpenChange`

---

### 3. `disabledDate` callback

**Ant Design API:**
```tsx
<DatePicker
  disabledDate={(currentDate: Dayjs) => {
    // Disable weekends
    return currentDate.day() === 0 || currentDate.day() === 6;
  }}
/>
```

**Required changes:**
- Add `disabledDate?: (date: BsDate) => boolean` prop
- In the calendar grid's disabled check, call `disabledDate` if provided (combines with existing `disable` and `minDate`/`maxDate`)
- In the input handler's validation, also check `disabledDate`
- This is a minimal API addition with massive flexibility gain

---

### 4. Size variants (`size` prop)

**Ant Design API:**
```tsx
<DatePicker size="large" />
<DatePicker size="middle" />  // default
<DatePicker size="small" />
```

**Required changes:**
- Add `size?: 'small' | 'middle' | 'large'` prop
- Add CSS variables for each size tier:
  - `--np-size-input-height`: 24px / 32px / 40px
  - `--np-size-font-size`: 12px / 14px / 16px
  - `--np-size-padding`: 4px 8px / 8px 10px / 10px 14px
  - `--np-size-popover-font`: 12px / 14px / 15px
- Add CSS class `.np-picker--small`, `.np-picker--middle`, `.np-picker--large`
- Apply to input wrapper, toggle button, and popover content

---

### 5. Status / Validation state (`status` prop)

**Ant Design API:**
```tsx
<DatePicker status="error" />
<DatePicker status="warning" />
```

**Required changes:**
- Add `status?: 'error' | 'warning'` prop
- Add CSS variables: `--np-status-border-color` (mapped to red/orange)
- Add CSS class `.np-picker--error`, `.np-picker--warning`
- Apply colored border/ring to `.np-input-wrapper`

---

## Important Gaps (P1 — significant UX value)

| Feature | Ant Design API | Implementation Notes | Priority |
|---|---|---|---|
| **Presets / quick ranges** | `presets={[{label:'Today', value:dayjs()}]}` | Array of `{ label: string, value: BsDate \| [BsDate, BsDate] }` rendered as buttons above the footer or at the bottom of the popover. | High |
| **Custom `format`** | `format="YYYY/MM/DD"` | Add `format?: string` prop. Parse format tokens to construct display string. Fall back to `YYYY-MM-DD`. | High |
| **`cellRender`** | `cellRender={(current, info)}` | `cellRender?: (date: BsDate, info: { type: 'date' \| 'month' \| 'year', origin: BsDate }) => ReactNode`. Wrap existing cell content if not provided. | Medium |
| **`placement`** | `placement="bottomLeft"` \| `"topLeft"` \| `"bottomRight"` \| `"topRight"` | Add `placement?: 'bottomLeft' \| 'bottomRight' \| 'topLeft' \| 'topRight'` — affects popoverPosition calculation. | Medium |
| **`allowClear`** | `allowClear={true}` | Show a small × icon in the input field when a value is selected. Clicking it calls `onChange(null)`. | Medium |
| **Controlled `mode`** | `mode="month"` \| `"year"` | `mode?: 'date' \| 'month' \| 'year'` — externally control whether picker shows date grid, month selector, or year selector. | Low |
| **Full `disabled` prop** | `disabled={true}` | Grey out the input, prevent interaction, skip form submission. | Medium |
| **`variant`** | `variant="filled"` | Visual style: `'outlined' \| 'filled' \| 'borderless'`. Map to CSS classes. | Low |
| **`getPopupContainer`** | `getPopupContainer={(trigger) => trigger.parentNode}` | Function returning the DOM node to portal into. Fall back to `document.body`. | Medium |
| **Focus/blur events** | `onFocus`, `onBlur` | Forward focus/blur from the input element. | Medium |

---

## Nice-to-Have Gaps (P2)

| Feature | Ant Design | Notes |
|---|---|---|
| **`showTime`** | `showTime={{ format: 'HH:mm' }}` | BS time selection? Low demand but complex. |
| **`multiple`** | `multiple={true}` | Select multiple dates. BS use cases are niche. |
| **`renderExtraFooter`** | `renderExtraFooter={() => <div>...</div>}` | Simple prop, small implementation. |
| **`panelRender`** | `panelRender={(originPanel) => <>{originPanel}</>}` | Full override — requires restructuring the popover render. |
| **`needConfirm`** | `needConfirm={true}` | OK/Cancel buttons. Adds friction but prevents accidental changes. |
| **Week picker** | `picker="week"` | BS week numbers? Not commonly used. |
| **Month/Quarter/Year picker** | `picker="month"` \| `"quarter"` \| `"year"` | Already have month/year selectors but not as a primary picker mode. |
| **`classNames` / `styles`** | `classNames={{ input: 'my-input', popup: 'my-popup' }}` | Semantic DOM targeting for sub-elements. |
| **Form integration** | Native form library support | Integrate with React Hook Form, Formik — or just ensure standard form patterns work. |
| **`inputReadOnly`** | `inputReadOnly={true}` | Prevent keyboard input, only allow calendar selection. |
| **`autoFocus`** | `autoFocus` | Auto-focus the input on mount. |
| **`onKeyDown`** | `onKeyDown` | Forward keyboard events. |
| **`onPanelChange`** | `onPanelChange={(value, mode)}` | Callback when the panel mode/view changes. |

---

## Recommended Implementation Order

### Phase 1 — Foundation (Next release)
| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 | `disabledDate` callback | ★☆☆ (trivial) | Huge — enables custom business rules |
| 2 | Controlled `open` / `onOpenChange` | ★☆☆ (trivial) | High — unlocks form integration |
| 3 | `size` + `status` props | ★☆☆ (trivial) | High — visual polish |
| 4 | `allowClear` on input | ★☆☆ (trivial) | Medium — UX improvement |

### Phase 2 — Range Picker (Major release)
| # | Feature | Effort | Impact |
|---|---|---|---|
| 5 | `NepaliDateRangePicker` | ★★★ (complex) | Very high — biggest feature gap |
| 6 | Presets / quick ranges | ★★☆ (moderate) | High — complements range picker |
| 7 | Dual-month side-by-side calendar | ★★★ (complex) | Part of range picker |

### Phase 3 — Polish
| # | Feature | Effort | Impact |
|---|---|---|---|
| 8 | Custom `format` | ★★☆ (moderate) | Medium |
| 9 | `placement` | ★★☆ (moderate) | Medium |
| 10 | `cellRender` | ★☆☆ (trivial) | Medium |
| 11 | `disabled`, `variant`, `getPopupContainer` | ★☆☆ (trivial) | Medium |

### Phase 4 — Advanced
| # | Feature | Effort | Impact |
|---|---|---|---|
| 12 | Controlled `mode` + `onPanelChange` | ★★☆ (moderate) | Low |
| 13 | `renderExtraFooter` | ★☆☆ (trivial) | Low |
| 14 | `panelRender` | ★★☆ (moderate) | Low |
| 15 | `showTime` | ★★★ (complex) | Low |
| 16 | Form library integration | ★★☆ (moderate) | Medium |

---

## Implementation Notes

### CSS Variables Strategy

Add new CSS variables for size/status so users can override without touching JS:

```css
/* Sizes */
--np-sm-height: 24px;
--np-sm-padding: 4px 8px;
--np-sm-font: 12px;
--np-md-height: 32px;
--np-md-padding: 8px 10px;
--np-md-font: 14px;
--np-lg-height: 40px;
--np-lg-padding: 10px 14px;
--np-lg-font: 16px;

/* Status */
--np-color-error: #ef4444;
--np-color-warning: #f59e0b;

/* Popover */
--np-popover-placement-offset: 8px;
```

### Partial Range Picker Approach (if full dual-month is too much)

Instead of a full dual-month view, start with a single-month range picker:
1. Click a start date → calendar stays open
2. Click/hover an end date → range highlights
3. Footer shows "Start: YYYY-MM-DD → End: YYYY-MM-DD"
4. Confirm with a "Done" button

This is ~40% of the effort but ~70% of the value.

---

## Test Coverage Gaps

Current test files: `tests/adapter.test.ts`, `tests/NepaliDatePicker.test.tsx`, `tests/bsTable.test.ts`, `tests/setup.ts`

| Area | Current Coverage | Needed |
|---|---|---|
| Adapter | ✅ Basic BS↔AD round-trip | — |
| BS table | ✅ Data integrity | — |
| Picker | ✅ Basic render + controlled value | Add tests for disabledDate, open/onOpenChange, size, status |
| Keyboard nav | ❌ Not tested | Add Tab/arrow/Escape test coverage |
| Accessibility | ❌ Not tested | aria attributes, keyboard, screen reader |
| Range picker | ❌ Not applicable | Full suite when implemented |

---

## Documentation Gaps

Current: `README.md` with props table, `docs/` folder with full documentation site.

| Area | Status | Needed |
|---|---|---|
| Props reference | ✅ In README | Add new props as they're implemented |
| Range picker | ❌ | New section + examples |
| Accessibility | ❌ | Keyboard nav guide, aria patterns |
| Migration guide | ❌ | How to upgrade between versions |
| Live demo | ✅ | Update with new features |

---

*Last updated: June 2026*
