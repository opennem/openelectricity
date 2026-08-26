# Tracker (next)

The canonical-to-be tracker page — the planned replacement for the legacy
`explore.openelectricity.org.au`. Lives at `/tracker/next` during the design
review; promotion moves this folder to `/tracker`. **The route slug appears
only in the folder name and the view-transition keys** — files, symbols and
typedefs use neutral `tracker-*` naming, so promotion is a pure folder move
plus a re-slug of `routeKey`/`stableName` and the keyframe selectors in
`(main)/+layout.svelte`.

## Composition

- **`+page.svelte`** — chrome layer. Owns the URL-parsed navigation state
  (region, grouping, range snapshot, price/emissions modes, table panel) and
  is the sole URL writer (shallow `pushState`/`replaceState`, `popstate`
  restore). Renders the fullscreen filter bar: Tracker label, `RegionDropdown`,
  `ChartRangeBar` (presets + date pickers + interval), the interval-aware
  range readout (`formatRangeLabel` — bucket names at FY/quarter/season
  grains, clock times + zone at sub-daily ones) and the table-panel toggle.
- **`TrackerCanvas.svelte`** — chart machinery. One `createChartRangeControl`
  (3-day initial window) drives three always-mounted `NetworkChart`s plus the
  two headless providers; shared `hoverTime` and tap-to-engage `panZoomEngaged`
  sync every surface. On mount it hands the live range control up via
  `oncontrolschange`, so the nav bar's controls drive the charts directly.
- **Split toggles** flip `metric`/`chartKind` props on the single mounted
  chart instance — no remount, so `isSwitchingData` veils the previous frame
  and the response LRU makes toggling back near-instant. For the `au` scope
  (no national spot price) `resolvePriceMode` forces market value and hides
  the Price toggle; the user's selection survives the region round trip.
- **Chart heights are drag-adjustable** (StratumChart's resize handle) and
  persist to localStorage per card; each split pair shares one key so
  toggling modes keeps the chosen height.
- **Grouping menu** mirrors the legacy explore tool: Detailed, Simplified,
  Coal/Gas/Renewables, Flexibility, Renewables/Fossils, VRE/Residual
  (`groups.js` registry). Grouping is applied client-side in
  `processNetworkData` — the API always returns detailed per-fuel-tech
  series, so switching groups re-processes cached responses without a fetch.
- **Fuel-tech table** (`FuelTechPanel` + `FuelTechTable` in a `ResizablePanel`)
  — Av power, contribution (% of source generation ⇄ % of gross demand) and
  volume-weighted price ($/MWh) per group, computed in `table-model.js` from:
  the generation chart's `onvisibledata` snapshot, the headless
  `createNetworkFuelTechMarketValue` provider, and the market pair's
  `demand_gross`. Ratios are ratios of window sums (each side normalised to
  MWh via its own interval length), never means of per-bucket ratios. Row
  clicks toggle chart series; denominators ignore visibility so percentages
  stay stable. Stale rows stay visible under a veil while refetching. The
  panel also shows the visible window in network time (AEST/AWST), a
  curtailment section (official solar/wind curtailment, outside the
  grouping, shared against the same contribution denominator), and Demand /
  Renewables summary rows — official OE series (`demand`,
  `generation_renewable`, `renewable_proportion`), whose row toggles draw an
  OE-red demand line and a renewables-green share line (fixed 0–100% right
  axis) over the generation chart via `ChartStore.overlayLines`.

## URL schema

`region` (`_all`, the NEM) · `range`/`start`+`end`/`interval` via the shared
`range-params.js` (default 3-day preset) · `group` (simple) · `price=mv` ·
`emissions=volume` (intensity is the default) · `table=0` · `fullscreen=false`.
Defaults are omitted.
Hover, pan/zoom engagement, panel width, hidden series and contribution mode
are deliberately not serialised.

## Data notes

- Everything fetches through `/api/network/data`; the providers share the
  charts' request broker, LRU and gap-aware fetching.
- The visible charts fetch a buffered window while the providers fetch the
  exact viewport, so their URLs only coincide (and dedupe) once windows align;
  the initial load in market-value mode issues one extra subset request.
- Demand-mode contribution shares needn't sum to 100% (losses, imports,
  basis differences) — this matches the homepage renewables methodology.

## Tests

Colocated vitest suites: `tracker-url.test.js`, `tracker-model.test.js`,
`table-model.test.js`, `page-load.test.js`. E2E smoke:
`tests/e2e/tracker-next.spec.js`.

## Deferred to promotion

`/tracker` redirect and review-index retirement; nav-items entry (currently
reachable from the `/tracker` review index); CSV export; saved views.
