# Package Upgrade Plan

Created: 2026-01-20
Updated: 2026-01-20

This document outlines the plan for upgrading packages with major version changes.

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Low-Risk Updates | ✅ Completed |
| 2 | Sanity CMS Updates | ✅ Completed |
| 3 | Date Library Migration | ⏳ Pending |
| 4 | Styling Updates | ✅ Completed |
| 5 | Chart Library (LayerCake) | ✅ Completed |
| 6 | Chroma.js | ✅ Completed |
| 7 | Vite Ecosystem | ✅ Completed |

---

## ✅ Phase 1: Low-Risk Updates (COMPLETED)

These can be done independently with minimal testing.

### 1.1 Icon Library

```bash
bun add @lucide/svelte@latest
```

- Risk: Low (icon additions, possible renames)
- Testing: Visual check of pages using icons

### 1.2 ESLint Ecosystem

```bash
bun add eslint-plugin-svelte@latest eslint-config-prettier@latest
```

- Risk: Low (linting rule changes)
- Testing: Run `bun run lint` and fix any new violations

### 1.3 Minor Utilities

```bash
bun add @svelte-put/shortcut@latest sveltekit-embed@latest
```

- Risk: Low
- Testing: Check keyboard shortcuts and embeds still work

---

## ✅ Phase 2: Sanity CMS Updates (COMPLETED)

### 2.1 Sanity Client & Image URL

```bash
bun add @sanity/client@latest @sanity/image-url@latest
```

- Upgraded: @sanity/client 7.14.0, @sanity/image-url 2.0.3
- Risk: Medium
- Files to check:
  - `src/lib/sanity/` - client configuration
  - `src/routes/(main)/analysis/` - article pages
- Testing: Verify articles load and images render correctly
- Docs: https://github.com/sanity-io/client/releases

---

## ⏳ Phase 3: Date Library Migration (PENDING)

### 3.1 date-fns v4 + date-fns-tz v3

```bash
bun add date-fns@latest date-fns-tz@latest
```

- Current: date-fns 2.30.0
- Target: date-fns 4.x
- Risk: Medium-High
- Breaking changes in v4:
  - Functions are now subpath exports (`date-fns/format` instead of `import { format } from 'date-fns'`)
  - Some function signatures changed
- Files to check:
  - `src/lib/utils/` - date utilities
  - Components using date formatting
- Testing: Check all date displays, especially timezone handling
- Docs: https://date-fns.org/v4.1.0/docs/Getting-Started

---

## ✅ Phase 4: Styling Updates (COMPLETED)

### 4.1 tailwind-variants v3

```bash
bun add tailwind-variants@latest
```

- Upgraded: tailwind-variants 3.2.2
- Risk: Medium
- Check usage in `src/lib/components/ui/`
- Docs: https://www.tailwind-variants.org/docs/getting-started

---

## ✅ Phase 5: Chart Library (COMPLETED)

### 5.1 LayerCake v10

```bash
bun add layercake@latest
```

- Upgraded: layercake 8.4.3 → 10.0.2
- Risk: **LOW** (minimal breaking changes)
- Result: ✅ Build passed, all 30 tests passed
- Docs: https://layercake.graphics/

### LayerCake Breaking Changes Analysis

#### v9.0.0 Breaking Changes

| Change | Impact on Codebase |
|--------|-------------------|
| `title` prop renamed to `titleText` on `Svg`/`ScaledSvg` | ✅ **No impact** - not used in codebase |
| `title` snippet now auto-creates `<title>` tag | ✅ **No impact** - not using title snippets |
| `fallback` slot removed from `Canvas`/`Webgl` | ✅ **No impact** - not using Canvas/Webgl |
| `extents` prop deprecated | ✅ **No impact** - not used in codebase |
| Ordinal scale domains no longer auto-sorted | ⚠️ **Verify** - uses `scaleOrdinal()` in 8 files |

#### v10.0.0 Breaking Changes

| Change | Impact on Codebase |
|--------|-------------------|
| `innerElement` binding removed from `Svg` | ✅ **No impact** - not used in codebase |
| New `overflow` prop on layout components | ✅ **No impact** - additive feature |

### Files Using LayerCake

**Direct imports (17 files):**
- `src/lib/components/charts/v2/StackedAreaChart.svelte`
- `src/lib/components/charts/v2/DateBrush.svelte`
- `src/lib/components/charts/StackedAreaChart.svelte`
- `src/lib/components/charts/LineChart.svelte`
- `src/lib/components/charts/LineChartWithContext.svelte`
- `src/lib/components/charts/DateBrush.svelte`
- `src/lib/components/charts/DateBrushWithContext.svelte`
- `src/lib/components/charts/StackedAreaLineChartWithContext.svelte`
- `src/lib/components/info-graphics/scenarios-explorer/Chart.svelte`
- `src/lib/components/info-graphics/scenarios-explorer/homepage/Chart.svelte`
- `src/lib/components/info-graphics/integrated-system-plan/OverviewChart.svelte`
- `src/lib/components/info-graphics/integrated-system-plan/SparkLineArea.svelte`
- `src/lib/components/info-graphics/fossil-fuels-renewables/Chart.svelte`
- `src/lib/components/info-graphics/system-snapshot/ColourLegend.svelte`
- `src/routes/records-checker/components/RecordHistoryChart.svelte`
- `src/lib/opennem/index.js` (uses `flatten`)
- `src/lib/models/index2.js` (uses `flatten`)

**Element components using LayerCake context (34 files):**
- All files in `src/lib/components/charts/elements/`
- All files in `src/lib/components/charts/v2/elements/`
- `src/lib/components/info-graphics/fossil-fuels-renewables/Annotations.svelte`

### Ordinal Scale Sorting Change

The only potential issue is the ordinal scale domain sorting change. Files using `scaleOrdinal()`:

```
src/lib/components/charts/v2/StackedAreaChart.svelte
src/lib/components/charts/StackedAreaChart.svelte
src/lib/components/charts/StackedAreaLineChartWithContext.svelte
src/lib/components/info-graphics/scenarios-explorer/Chart.svelte
src/lib/components/info-graphics/scenarios-explorer/homepage/Chart.svelte
src/lib/components/info-graphics/integrated-system-plan/OverviewChart.svelte
src/lib/components/info-graphics/fossil-fuels-renewables/Chart.svelte
```

**Analysis:** These charts pass explicit `zDomain` values (e.g., `zDomain={chart.seriesNames}`) which already control the order. The auto-sort removal should not affect them since order is explicitly defined.

### Migration Steps

1. Run `bun add layercake@latest`
2. Run `bun run build` to check for compilation errors
3. Visually verify charts render correctly (especially stacking order)
4. Run tests: `bun run test`

### Expected Outcome

**Low risk upgrade** - No code changes should be required. The breaking changes do not affect patterns used in this codebase.

---

## ✅ Phase 6: Chroma.js (COMPLETED)

### 6.1 chroma-js v3

```bash
bun add chroma-js@latest @types/chroma-js@latest
```

- Upgraded: chroma-js 3.2.0
- Risk: Medium
- Files to check:
  - `src/lib/theme/` - color theming
  - Any color manipulation code
- Testing: Verify fuel tech colors render correctly
- Docs: https://gka.github.io/chroma.js/

---

## ✅ Phase 7: Vite Ecosystem (COMPLETED)

This is the largest upgrade and should be done as a single unit.

### 7.1 Vite 7 + SvelteKit Plugin + Vitest

```bash
bun add vite@latest @sveltejs/vite-plugin-svelte@latest vitest@latest
```

- Upgraded:
  - vite: 5.4.17 → 7.3.1
  - @sveltejs/vite-plugin-svelte: 4.0.4 → 6.2.4
  - vitest: 2.1.9 → 4.0.17
- Risk: High
- Requires all three to be updated together
- May need `vite.config.js` changes
- Testing:
  - `bun run dev` - development server
  - `bun run build` - production build
  - `bun run test` - test suite
- Docs:
  - https://vite.dev/guide/migration
  - https://github.com/sveltejs/vite-plugin-svelte/releases
  - https://vitest.dev/guide/migration

---

## Remaining Work

### Next Steps

1. **Phase 3: date-fns v4** - Update date handling utilities
   - Audit all imports from `date-fns` and `date-fns-tz`
   - Update to subpath exports if needed
   - Test timezone handling thoroughly

---

## Pre-Upgrade Checklist

- [x] Ensure all tests pass: `bun run test`
- [x] Ensure build works: `bun run build`
- [x] Ensure lint passes: `bun run lint`
- [x] Create a git branch for the upgrade work
- [x] Review changelogs for each package

## Post-Upgrade Checklist

- [ ] Run full test suite
- [ ] Run production build
- [ ] Manual testing of key features:
  - [ ] Homepage infographics
  - [ ] Charts in studio pages
  - [ ] Article pages (Sanity)
  - [ ] Date/time displays
  - [ ] Color theming
- [ ] Run lint and fix any issues
