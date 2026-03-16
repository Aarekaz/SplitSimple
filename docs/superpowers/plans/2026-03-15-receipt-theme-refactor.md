# Receipt Theme Refactor - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify SplitSimple's frontend from its current split-personality (receipt CSS system defined but ignored, hardcoded slate/indigo everywhere) into a cohesive thermal-receipt aesthetic that actually uses the design tokens already built in globals.css.

**Architecture:** Three-phase approach: (1) Fix the CSS foundation so tokens are correct and fonts are unified, (2) Migrate all 20 component files from hardcoded Tailwind colors to semantic CSS variables, (3) Break ProBillSplitter.tsx (2121 lines) into focused modules. Each phase produces a working app.

**Tech Stack:** Next.js 15 + React 19, Tailwind CSS v4 with `@theme` directives, Radix UI / shadcn components, CSS custom properties for theming.

---

## Color Migration Reference

Every hardcoded color maps to a semantic token:

| Hardcoded | Semantic replacement | Notes |
|-----------|---------------------|-------|
| `bg-white` | `bg-card` | Card surfaces |
| `bg-slate-50` | `bg-muted/50` | Subtle backgrounds |
| `bg-slate-100` | `bg-muted` | Muted surfaces |
| `bg-slate-200` | `border-border` | (when used as divider bg) |
| `bg-slate-900` | `bg-foreground` | Inverse surfaces |
| `text-slate-900` | `text-foreground` | Primary text |
| `text-slate-700` | `text-foreground` | Primary text |
| `text-slate-600` | `text-muted-foreground` | Secondary text |
| `text-slate-500` | `text-muted-foreground` | Secondary text |
| `text-slate-400` | `text-muted-foreground` | Muted text (fix contrast) |
| `text-slate-300` | `text-border` | Very muted / placeholder |
| `border-slate-200` | `border-border` | Standard border |
| `border-slate-100` | `border-border/50` | Subtle border |
| `bg-indigo-*` | `bg-primary` / `bg-primary/10` | Primary actions |
| `text-indigo-*` | `text-primary` | Primary text accent |
| `ring-indigo-*` | `ring-ring` | Focus rings |
| `hover:bg-indigo-*` | `hover:bg-primary/10` | Hover states |
| `bg-green-500` | `bg-success` | Success states |
| `bg-red-500` | `bg-destructive` | Error states |
| `selection:bg-indigo-100` | `selection:bg-primary/20` | Text selection |

## Font Migration Reference

| Current | Replacement | Notes |
|---------|------------|-------|
| `.font-inter` (custom class) | `font-sans` | Tailwind built-in, mapped to Inter |
| `.font-space-mono` (custom class) | `font-mono` | Tailwind built-in, mapped to Space Mono |
| `font-family: 'Inter'` | `font-sans` | Use token |
| `font-family: 'Space Mono'` | `font-mono` | Use token |

---

## Phase 1: CSS Foundation

### Task 1: Create branch and update font system

**Files:**
- Modify: `app/globals.css` (lines 3, 91-94, 1116-1122, 243-244)

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b receipt-theme-refactor
```

- [ ] **Step 2: Update font imports and CSS variable definitions**

In `globals.css`:
1. Keep the Google Fonts import (line 3) for Inter + Space Mono
2. Update `--font-ui` (line 93) to prioritize Inter: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
3. Update `--font-receipt` (line 92) to prioritize Space Mono: `'Space Mono', ui-monospace, "SF Mono", Monaco, monospace`
4. Update `--font-numbers` (line 94) to match: `'Space Mono', ui-monospace, "SF Mono", Monaco, monospace`
5. Remove `.font-space-mono` and `.font-inter` custom classes (lines 1116-1122)
6. Verify `@theme` block maps `--font-sans: var(--font-ui)` and `--font-mono: var(--font-receipt)` (lines 243-244)

- [ ] **Step 3: Verify fonts render correctly**

```bash
npm run dev
```
Open http://localhost:3000 and verify Inter loads for body text, Space Mono for numbers/headers.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Unify font system: Inter for UI, Space Mono for mono"
```

### Task 2: Clean up globals.css - remove Pro SaaS classes and fix hardcoded values

**Files:**
- Modify: `app/globals.css` (lines 987-1033, 1036-1146)

- [ ] **Step 1: Remove `.pro-*` classes**

Delete lines 1036-1146 (`.pro-app-shell`, `.pro-header`, `.pro-footer`, `.pro-grid`, `.pro-sticky-left`, `.pro-sticky-right`, `.pro-grid-header`, `.pro-tile-inactive`, `.pro-tile-active`, `.pro-scrollbar`). These define a competing design system.

- [ ] **Step 2: Update scrollbar colors to use CSS variables**

Replace hardcoded hex values in scrollbar styles (lines 987-1033) with `var()` references:
- `#D4D2CC` → `var(--border)`
- `#FFFEF9` → `var(--background)`
- `#A8A29E` → `var(--muted-foreground)`
- `#78716C` → (darker muted)
- Dark mode scrollbar values similarly

- [ ] **Step 3: Verify no visual regression**

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Remove Pro SaaS classes and fix hardcoded scrollbar colors"
```

### Task 3: Grep-verify remaining references to removed classes

**Files:**
- Potentially modify: any component referencing `pro-scrollbar`, `pro-app-shell`, `font-inter`, `font-space-mono`

- [ ] **Step 1: Search for removed class references**

```bash
grep -rn "pro-scrollbar\|pro-app-shell\|pro-header\|pro-footer\|pro-grid\|pro-sticky\|pro-tile\|font-inter\|font-space-mono" --include="*.tsx" --include="*.ts" components/ app/
```

- [ ] **Step 2: Replace any found references**

- `pro-scrollbar` → remove (use default styled scrollbar)
- `font-inter` → `font-sans`
- `font-space-mono` → `font-mono`
- `pro-app-shell` → remove and use Tailwind equivalents inline

- [ ] **Step 3: Verify app still renders**

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Replace removed class references in components"
```

---

## Phase 2: Color Migration (by file)

### Task 4: Migrate ProBillSplitter.tsx colors (Part 1 - Header & Grid Header)

**Files:**
- Modify: `components/ProBillSplitter.tsx` (lines 1019-1350)

- [ ] **Step 1: Replace header area colors (lines 1019-1250)**

Key replacements in the header/toolbar section:
- `selection:bg-indigo-100 selection:text-indigo-900` → `selection:bg-primary/20 selection:text-primary`
- `text-slate-900` → `text-foreground`
- `hover:text-indigo-600` → `hover:text-primary`
- `bg-slate-100` → `bg-muted`
- `text-slate-500` → `text-muted-foreground`
- `bg-indigo-600` → `bg-primary`
- `hover:bg-indigo-700` → `hover:bg-primary/90`
- `text-indigo-600` → `text-primary`
- `bg-indigo-50` → `bg-primary/10`
- `ring-indigo-*` → `ring-ring`

- [ ] **Step 2: Replace grid header colors (lines 1250-1350)**

- `bg-slate-50` → `bg-muted/50`
- `border-slate-200` → `border-border`
- `text-slate-600` → `text-muted-foreground`
- `bg-white` → `bg-card`

- [ ] **Step 3: Visual verification**

Open app, check header and grid header look correct with receipt colors.

- [ ] **Step 4: Commit**

```bash
git add components/ProBillSplitter.tsx
git commit -m "Migrate header and grid header to receipt design tokens"
```

### Task 5: Migrate ProBillSplitter.tsx colors (Part 2 - Grid Body & Cells)

**Files:**
- Modify: `components/ProBillSplitter.tsx` (lines 1350-1600)

- [ ] **Step 1: Replace grid body colors**

- Row hover: `hover:bg-slate-50/50` → `hover:bg-muted/30`
- Cell borders: `border-slate-*` → `border-border`
- Placeholder text: `text-slate-300` → `text-muted-foreground/40`
- Cell background: `bg-slate-50/30` → `bg-muted/20`
- Focus ring: `ring-indigo-500` → `ring-ring`
- Edit border: `border-indigo-500` → `border-primary`
- Action icons: `text-slate-300` → `text-muted-foreground/40`
- Action hover: `hover:text-indigo-600` → `hover:text-primary`
- Delete hover: `hover:text-red-500` → `hover:text-destructive`

- [ ] **Step 2: Update focusRingClass constant (line 249)**

```tsx
const focusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
```

- [ ] **Step 3: Visual verification - edit cells, hover rows, click buttons**

- [ ] **Step 4: Commit**

```bash
git add components/ProBillSplitter.tsx
git commit -m "Migrate grid body and cells to receipt design tokens"
```

### Task 6: Migrate ProBillSplitter.tsx colors (Part 3 - Sidebar, Footer, Dialogs)

**Files:**
- Modify: `components/ProBillSplitter.tsx` (lines 1600-2121)

- [ ] **Step 1: Replace sidebar panel colors (People + Bill Totals)**

- Panel borders: `border-slate-200` → `border-border`
- Panel backgrounds: `bg-white` → `bg-card`
- Section text: `text-slate-900` → `text-foreground`
- Muted text: `text-slate-500` / `text-slate-400` → `text-muted-foreground`
- Input focus: `focus:ring-indigo-*` → `focus:ring-ring`
- Person expand: `hover:bg-slate-50` → `hover:bg-muted/50`
- Dividers: `divide-slate-*` → `divide-border`

- [ ] **Step 2: Replace footer colors**

- `bg-white` → `bg-card`
- `border-slate-200` → `border-border`
- `text-slate-*` → `text-foreground` / `text-muted-foreground`

- [ ] **Step 3: Replace dialog colors**

- Dialog backgrounds, text colors, button colors → semantic tokens
- Color picker: keep COLORS array hex values (these are the actual person colors)

- [ ] **Step 4: Visual verification - check sidebar, footer, dialogs**

- [ ] **Step 5: Commit**

```bash
git add components/ProBillSplitter.tsx
git commit -m "Migrate sidebar, footer, and dialogs to receipt design tokens"
```

### Task 7: Migrate ProBillBreakdownView.tsx

**Files:**
- Modify: `components/ProBillBreakdownView.tsx` (180 lines, 23 hardcoded instances)

- [ ] **Step 1: Replace all hardcoded colors**

- `bg-slate-50` → `bg-muted/50`
- `bg-white` → `bg-card`
- `border-slate-200/60` → `border-border/60`
- `text-slate-900` → `text-foreground`
- `text-slate-400` → `text-muted-foreground`
- `text-slate-600` → `text-muted-foreground`
- `bg-slate-100` → `bg-muted`
- `font-inter` → `font-sans`
- `font-space-mono` → `font-mono`

- [ ] **Step 2: Add ARIA label to share graph bars**

```tsx
<div className="flex gap-1.5 h-2" role="img" aria-label={`${person.name} pays ${stats?.ratio.toFixed(1)}% of the bill`}>
```

- [ ] **Step 3: Commit**

```bash
git add components/ProBillBreakdownView.tsx
git commit -m "Migrate ProBillBreakdownView to receipt design tokens"
```

### Task 8: Migrate ReceiptScanner.tsx

**Files:**
- Modify: `components/ReceiptScanner.tsx` (576 lines, 41 hardcoded instances)

- [ ] **Step 1: Replace all hardcoded colors**

Key replacements:
- Upload zone: `bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400` → `bg-muted/30 hover:bg-muted/50 hover:border-primary`
- Processing: `bg-indigo-500` → `bg-primary`
- Icons: `text-indigo-600` → `text-primary`
- Preview bg: `bg-slate-900` → `bg-foreground` (dark background for image preview)
- Review section: all slate → semantic tokens
- Labels: `text-slate-400` → `text-muted-foreground`

- [ ] **Step 2: Add motion-reduce where missing**

Any `animate-*` class without `motion-reduce:animate-none` should get it added.

- [ ] **Step 3: Commit**

```bash
git add components/ReceiptScanner.tsx
git commit -m "Migrate ReceiptScanner to receipt design tokens"
```

### Task 9: Migrate mobile components

**Files:**
- Modify: `components/mobile/MobileCardView.tsx` (15 instances)
- Modify: `components/mobile/MobileGridView.tsx` (48 instances)
- Modify: `components/mobile/shared/ViewToggle.tsx` (5 instances)
- Modify: `components/MobileSpreadsheetView.tsx` (4 instances)

- [ ] **Step 1: Replace all hardcoded colors in MobileGridView.tsx** (largest mobile file)

Same mapping as reference table. This file has 48 instances.

- [ ] **Step 2: Replace in MobileCardView.tsx**

- [ ] **Step 3: Replace in ViewToggle.tsx and MobileSpreadsheetView.tsx**

- [ ] **Step 4: Commit**

```bash
git add components/mobile/ components/MobileSpreadsheetView.tsx
git commit -m "Migrate mobile components to receipt design tokens"
```

### Task 10: Migrate remaining components

**Files:**
- Modify: `components/TaxTipSection.tsx` (3 instances)
- Modify: `components/SyncStatusIndicator.tsx` (2 instances)
- Modify: `components/LedgerItemsTable.tsx` (2 instances)
- Modify: `components/EmptyStates.tsx` (fix motion-reduce)
- Modify: `components/MobileFirstUI.tsx` (fix motion-reduce)

- [ ] **Step 1: Replace hardcoded colors in all listed files**

- [ ] **Step 2: Add `motion-reduce:animate-none` to EmptyStates.tsx animations**

Specifically `animate-bounce` and `animate-pulse` elements.

- [ ] **Step 3: Add `motion-reduce:animate-none` to MobileFirstUI.tsx animations**

Specifically the `animate-bounce` on the green checkmark dot.

- [ ] **Step 4: Commit**

```bash
git add components/TaxTipSection.tsx components/SyncStatusIndicator.tsx components/LedgerItemsTable.tsx components/EmptyStates.tsx components/MobileFirstUI.tsx
git commit -m "Migrate remaining components and fix motion-reduce gaps"
```

### Task 11: Verify zero remaining hardcoded colors

- [ ] **Step 1: Run verification grep**

```bash
grep -rn "slate-\|indigo-" --include="*.tsx" --include="*.ts" components/ | grep -v "node_modules" | grep -v "__tests__"
```

Expected: zero results (or only in COLORS array hex values which are intentional person colors).

- [ ] **Step 2: Fix any remaining instances**

- [ ] **Step 3: Run full app check**

```bash
npm run build
npm run dev
```

Navigate through ledger view, breakdown view, receipt scanner, mobile view. Verify receipt aesthetic is consistent.

- [ ] **Step 4: Commit if needed**

---

## Phase 3: Component Decomposition

### Task 12: Extract shared constants and utilities

**Files:**
- Create: `lib/design-tokens.ts`
- Create: `components/SplitSimpleIcon.tsx`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Create `lib/design-tokens.ts`**

Move the COLORS array (lines 74-81) and splitMethodOptions (lines 215-220) here.

```tsx
export const PERSON_COLORS = [
  { id: 'indigo', bg: 'bg-primary/20', solid: 'bg-primary', text: 'text-primary', textSolid: 'text-primary-foreground', hex: '#4F46E5' },
  // ... (update to use semantic tokens where possible)
]

export const SPLIT_METHOD_OPTIONS = [
  { value: 'even' as const, label: 'Even Split', icon: Users },
  // ...
]

export type SplitMethod = "even" | "shares" | "percent" | "exact"
```

- [ ] **Step 2: Create `components/SplitSimpleIcon.tsx`**

Move SplitSimpleIcon component (lines 83-99).

- [ ] **Step 3: Update imports in ProBillSplitter.tsx**

Replace local definitions with imports from new files.

- [ ] **Step 4: Verify app works**

- [ ] **Step 5: Commit**

```bash
git add lib/design-tokens.ts components/SplitSimpleIcon.tsx components/ProBillSplitter.tsx
git commit -m "Extract design tokens and icon to dedicated files"
```

### Task 13: Extract GridCell component

**Files:**
- Create: `components/GridCell.tsx`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Move GridCell** (lines 123-208) to `components/GridCell.tsx`

Keep it as `React.memo` with the same props interface. Export it.

- [ ] **Step 2: Update import in ProBillSplitter.tsx**

- [ ] **Step 3: Commit**

```bash
git add components/GridCell.tsx components/ProBillSplitter.tsx
git commit -m "Extract GridCell to dedicated component file"
```

### Task 14: Extract keyboard handler hook

**Files:**
- Create: `hooks/use-bill-keyboard.ts`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Create `hooks/use-bill-keyboard.ts`**

Move `handleGlobalKeyDown` (lines 697-928) and the hotkey ref setup into a custom hook.

```tsx
export function useBillKeyboard(options: {
  activeView: 'ledger' | 'breakdown'
  editing: boolean
  selectedCell: { row: number; col: string }
  items: Item[]
  people: Person[]
  // ... other dependencies
  actions: {
    addItem: () => void
    addPerson: () => void
    // ... other actions
  }
}) {
  // Move handleGlobalKeyDown, hotkeyStateRef, hotkeyActionsRef here
  // Set up useEffect for event listener
}
```

- [ ] **Step 2: Use hook in DesktopBillSplitter**

Replace inline keyboard handling with `useBillKeyboard(...)`.

- [ ] **Step 3: Verify keyboard shortcuts still work**

Test: Tab, Enter, Escape, arrow keys, Cmd+Z, Cmd+Shift+N, Cmd+Shift+P

- [ ] **Step 4: Commit**

```bash
git add hooks/use-bill-keyboard.ts components/ProBillSplitter.tsx
git commit -m "Extract keyboard handler to dedicated hook"
```

### Task 15: Extract calculation hooks

**Files:**
- Create: `hooks/use-bill-calculations.ts`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Create `hooks/use-bill-calculations.ts`**

Move these useMemo blocks:
- `calculatedItems` (lines 305-312)
- `{ subtotal, taxAmount, tipAmount, discountAmount, grandTotal }` (lines 314-326)
- `personFinalShares` (lines 328-366)
- `itemsById` and `peopleById` (lines 368-374)

```tsx
export function useBillCalculations(items: Item[], people: Person[], bill: BillState) {
  const calculatedItems = useMemo(() => { ... }, [items])
  // ... other memos
  return { calculatedItems, subtotal, taxAmount, tipAmount, discountAmount, grandTotal, personFinalShares, itemsById, peopleById }
}
```

- [ ] **Step 2: Use hook in DesktopBillSplitter**

- [ ] **Step 3: Verify calculations are correct** - check totals, per-person shares

- [ ] **Step 4: Commit**

```bash
git add hooks/use-bill-calculations.ts components/ProBillSplitter.tsx
git commit -m "Extract bill calculations to dedicated hook"
```

### Task 16: Extract sidebar panels

**Files:**
- Create: `components/BillSidebar.tsx`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Create `components/BillSidebar.tsx`**

Move the aside section (sidebar with Starter, People, Bill Totals panels).
Accept all needed props and callbacks.

- [ ] **Step 2: Update ProBillSplitter.tsx**

Replace inline sidebar JSX with `<BillSidebar ... />`.

- [ ] **Step 3: Visual verification**

- [ ] **Step 4: Commit**

```bash
git add components/BillSidebar.tsx components/ProBillSplitter.tsx
git commit -m "Extract sidebar panels to BillSidebar component"
```

### Task 17: Extract dialogs

**Files:**
- Create: `components/BillDialogs.tsx`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Create `components/BillDialogs.tsx`**

Move all 4 dialog components:
- New Bill confirmation
- Delete Item confirmation
- Remove Person confirmation
- Person Editor modal

- [ ] **Step 2: Update ProBillSplitter.tsx**

Replace inline dialog JSX with `<BillDialogs ... />`.

- [ ] **Step 3: Test all dialogs open/close/confirm correctly**

- [ ] **Step 4: Commit**

```bash
git add components/BillDialogs.tsx components/ProBillSplitter.tsx
git commit -m "Extract dialogs to BillDialogs component"
```

### Task 18: Extract header and footer

**Files:**
- Create: `components/BillHeader.tsx`
- Create: `components/BillFooter.tsx`
- Modify: `components/ProBillSplitter.tsx`

- [ ] **Step 1: Create `components/BillHeader.tsx`**

Move header section (brand, title, view switcher, action buttons).

- [ ] **Step 2: Create `components/BillFooter.tsx`**

Move footer section (counts, shortcuts, sync status).

- [ ] **Step 3: Update ProBillSplitter.tsx**

Should now be dramatically smaller - mostly orchestration + grid body.

- [ ] **Step 4: Verify navigation, title editing, all header actions**

- [ ] **Step 5: Commit**

```bash
git add components/BillHeader.tsx components/BillFooter.tsx components/ProBillSplitter.tsx
git commit -m "Extract header and footer to dedicated components"
```

---

## Phase 4: Final Cleanup

### Task 19: Remove dead CSS from globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Search for unused utility classes**

```bash
for class in "proportion-blocks" "proportion-block " "receipt-button" "receipt-input" "receipt-line " "float-card" "float-panel" "glass-header" "floating-dock" "dock-item" "dock-divider"; do
  echo "--- $class ---"
  grep -rn "$class" --include="*.tsx" --include="*.ts" components/ app/ | head -3
done
```

- [ ] **Step 2: Remove any classes with zero references**

- [ ] **Step 3: Verify no visual regression**

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Remove unused CSS utility classes"
```

### Task 20: Final verification and build

- [ ] **Step 1: Run build**

```bash
npm run build
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Final grep for remaining hardcoded colors**

```bash
grep -rn "slate-\|indigo-" --include="*.tsx" components/ | grep -v "__tests__" | wc -l
```

Expected: 0 (or near-zero for intentional COLORS hex values)

- [ ] **Step 4: Visual QA pass**

Check: Ledger view, Breakdown view, Receipt scanner, Mobile view, Dialogs, Empty states, Dark mode (if applicable).

- [ ] **Step 5: Final commit and prepare for merge**

```bash
git add -A
git commit -m "Final cleanup: receipt theme refactor complete"
```

---

## Summary

| Phase | Tasks | Estimated Impact |
|-------|-------|-----------------|
| Phase 1: CSS Foundation | Tasks 1-3 | Fix fonts, remove competing design system |
| Phase 2: Color Migration | Tasks 4-11 | Replace 313 hardcoded colors across 20 files |
| Phase 3: Component Decomposition | Tasks 12-18 | ProBillSplitter: 2121 lines → ~600 lines + 7 focused files |
| Phase 4: Final Cleanup | Tasks 19-20 | Remove dead CSS, verify build |

**Total: 20 tasks, ~20 commits**

After completion:
- One unified receipt design system
- All components use CSS variables (themeable, dark-mode ready)
- ProBillSplitter.tsx reduced from 2121 to ~600 lines
- Zero hardcoded slate/indigo colors
- Consistent Inter + Space Mono font usage
- Improved accessibility (motion-reduce, ARIA labels)
