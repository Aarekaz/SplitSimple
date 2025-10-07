# UI Refresh Implementation Checklist

## Token Integration
- [ ] Update Tailwind config (if needed) to ensure utility classes map to new CSS custom properties.
- [ ] Replace bespoke classes (`float-card`, `btn-float`, etc.) with utility compositions derived from the new token set.
- [ ] Validate focus states across inputs/buttons leverage `var(--shadow-glow)` and meet WCAG AA contrast.

## Component Priorities
1. **App Layout (`app/page.tsx`)**
   - [ ] Extract header, items surface, and totals sidebar into dedicated layout primitives.
   - [ ] Apply new spacing scale (`--space-*`) and elevation tokens to cards and dock.
   - [ ] Tighten typography to use `text-display`, `text-headline`, `text-body-large` with updated font stacks.
2. **Mobile Onboarding (`components/MobileFirstUI.tsx`)**
   - [ ] Realign quick-start cards with `surface-alt` background and spring transitions.
   - [ ] Refresh form controls using new radius and focus treatments.
3. **Totals & Analytics (`components/TotalsPanel.tsx`)**
   - [ ] Introduce section headers with accent underline and reorganise person rows into reusable list component.
   - [ ] Re-evaluate animated amounts for timing (120–180 ms curve).
4. **Sharing Workflow (`components/ShareBill.tsx`)**
   - [ ] Redesign dialog layout with primary CTA, secondary exports, and info alert using new palette.
   - [ ] Add icon badges leveraging `--color-primary-soft` backgrounds.
5. **Admin Console (`app/admin/page.tsx`)**
   - [ ] Break file into dashboard, filters, table, and dialogs modules.
   - [ ] Apply cards/elevation tokens; refresh table header/footer spacing; standardise empty/loading states.

## Cross-Cutting Tasks
- [ ] Build reusable primitives: `Surface`, `GlassHeader`, `DockButton`, `ListRow`.
- [ ] Audit icon sizes (16/20/24px) for consistency with new type scale.
- [ ] Document animation durations/easings in component stories or MDX.
- [ ] Run accessibility contrast tests on primary, accent, danger backgrounds vs. text foregrounds.
- [ ] Prepare visual regression snapshots before and after token rollout.
