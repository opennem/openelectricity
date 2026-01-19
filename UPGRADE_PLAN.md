# Package Upgrade Plan

Created: 2026-01-20

This document outlines the plan for upgrading packages with major version changes.

## Phase 1: Low-Risk Updates

These can be done independently with minimal testing.

### 1.1 Icon Library

```bash
npm install @lucide/svelte@latest
```

- Risk: Low (icon additions, possible renames)
- Testing: Visual check of pages using icons

### 1.2 ESLint Ecosystem

```bash
npm install eslint-plugin-svelte@latest eslint-config-prettier@latest
```

- Risk: Low (linting rule changes)
- Testing: Run `npm run lint` and fix any new violations

### 1.3 Minor Utilities

```bash
npm install @svelte-put/shortcut@latest sveltekit-embed@latest
```

- Risk: Low
- Testing: Check keyboard shortcuts and embeds still work

---

## Phase 2: Sanity CMS Updates

### 2.1 Sanity Client & Image URL

```bash
npm install @sanity/client@latest @sanity/image-url@latest
```

- Risk: Medium
- Files to check:
  - `src/lib/sanity/` - client configuration
  - `src/routes/(main)/analysis/` - article pages
- Testing: Verify articles load and images render correctly
- Docs: https://github.com/sanity-io/client/releases

---

## Phase 3: Date Library Migration

### 3.1 date-fns v4 + date-fns-tz v3

```bash
npm install date-fns@latest date-fns-tz@latest
```

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

## Phase 4: Styling Updates

### 4.1 tailwind-variants v3

```bash
npm install tailwind-variants@latest
```

- Risk: Medium
- Check usage in `src/lib/components/ui/`
- Docs: https://www.tailwind-variants.org/docs/getting-started

---

## Phase 5: Chart Library

### 5.1 LayerCake v10

```bash
npm install layercake@latest
```

- Risk: Medium-High
- Major rewrite with new API
- Files to check:
  - `src/lib/components/charts/` - all chart components
  - `src/lib/components/info-graphics/` - homepage visualizations
- Testing: Thoroughly test all charts and visualizations
- Docs: https://layercake.graphics/

---

## Phase 6: Chroma.js

### 6.1 chroma-js v3

```bash
npm install chroma-js@latest @types/chroma-js@latest
```

- Risk: Medium
- Files to check:
  - `src/lib/theme/` - color theming
  - Any color manipulation code
- Testing: Verify fuel tech colors render correctly
- Docs: https://gka.github.io/chroma.js/

---

## Phase 7: Vite Ecosystem (Do Together)

This is the largest upgrade and should be done as a single unit.

### 7.1 Vite 7 + SvelteKit Plugin + Vitest

```bash
npm install vite@latest @sveltejs/vite-plugin-svelte@latest vitest@latest
```

- Risk: High
- Requires all three to be updated together
- May need `vite.config.js` changes
- Testing:
  - `npm run dev` - development server
  - `npm run build` - production build
  - `npm run test` - test suite
- Docs:
  - https://vite.dev/guide/migration
  - https://github.com/sveltejs/vite-plugin-svelte/releases
  - https://vitest.dev/guide/migration

---

## Recommended Order

1. **Phase 1** - Quick wins, low risk
2. **Phase 4** - Styling (isolated impact)
3. **Phase 2** - Sanity (isolated to CMS features)
4. **Phase 6** - Chroma (isolated to theming)
5. **Phase 3** - date-fns (moderate impact, well-documented migration)
6. **Phase 5** - LayerCake (significant, affects charts)
7. **Phase 7** - Vite ecosystem (largest change, do last)

---

## Pre-Upgrade Checklist

- [ ] Ensure all tests pass: `npm run test`
- [ ] Ensure build works: `npm run build`
- [ ] Ensure lint passes: `npm run lint`
- [ ] Create a git branch for the upgrade work
- [ ] Review changelogs for each package

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
