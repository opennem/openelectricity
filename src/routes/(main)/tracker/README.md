# Tracker

The canonical tracker page — the planned replacement for the legacy
`explore.openelectricity.org.au`. Lives at `/tracker`, promoted from
`/tracker/next`. The map/dashboard/explore concepts that informed it live on at
`/studio/tracker`, with their own copies of `tracker-regions.js` and
`RegionDropdown.svelte`.

## Composition

- **`+page.svelte`** — chrome layer. Owns the URL-parsed navigation state
  (region, grouping, range snapshot, price/emissions modes, chart overlays,
  table panel) and
  is the sole URL writer (shallow `pushState`/`replaceState`, `popstate`
  restore). Renders the fullscreen filter bar: Tracker label, `RegionDropdown`,
  `ChartRangeBar` (`variant="expanded"` — the preset switcher with its
  integrated date-picker segment at `md:` and up, the dropdown with a
  "Custom…" row below, plus the interval dropdown), the interval-aware
  range readout (`formatRangeLabel` — bucket names at FY/quarter/season
  grains, clock times + zone at sub-daily ones). The table panel opens and
  closes from its own edge.
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
- **Generation units are selectable in the chart options**: power offers
  MW/GW and starts in MW; energy offers MWh/GWh/TWh. Energy automatically
  promotes its default from MWh to TWh when the largest visible positive
  stack reaches six digits in MWh, while an explicit unit choice remains
  pinned until the power/energy basis changes. The selected prefix drives the
  chart header, y-axis and floating tooltip values together. The current open
  energy bucket (hour/day/week/month and coarser calendar grains) is hatched
  until that interval is complete.
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
  OE-red demand line and a renewables-green share line (right-hand % axis
  that extends past 100% in 20-point steps for exporting regions) over the
  generation chart via `ChartStore.overlayLines`. These four overlay toggles
  are URL-owned so direct and copied links reproduce them. When enabled, each
  also appears in the generation chart's floating tooltip: demand and
  curtailment follow the selected generation unit, while renewable share uses
  percent.

## URL schema

`region` (`_all`, the NEM) · `range`/`start`+`end`/`interval` via the shared
`range-params.js` (default 3-day preset; the tracker opts into the
12-month rolling variants on the 1Y/All tiers via `includeRolling`) ·
`group` (simple) · `price=mv` · `emissions=volume` (intensity is the default) ·
`overlay` — a canonical comma-separated selection of `demand`, `renewables`,
`curtailment-solar`, and `curtailment-wind` · `table=0` · `fullscreen=false` ·
`filter` — a calendar-period id (`jan`…`dec`,
`summer`…, `q1`…`q4`, `h1`/`h2`) shown beside the interval control in the All
range. Charts connect matching occurrences across years. For non-rolling
intervals, table summaries retain the native row cadence but ignore values
outside the selected period.
Defaults are omitted.
At the rolling grain every summed surface shows trailing 12-month windows,
intensity and the price card derive ratios of 12-month sums (the price card
swaps its spot series for `price_vw`, volume-weighted), and the table computes
from native monthly rows so overlapping windows do not double-count.
Hover, pan/zoom engagement, panel width, hidden fuel-tech series and
contribution mode are deliberately not serialised.

## Data notes

- Everything fetches through `/api/network/data`; the providers share the
  charts' request broker, LRU and gap-aware fetching.
- Individual NEM region generation responses merge the official import/export
  flow metrics into the fuel-tech series. Imports render as a positive source;
  exports render below zero as a load. They therefore appear consistently in
  the generation stack, grouping menu, table and floating tooltip. Whole NEM,
  All Regions and WA do not add regional flows.
- Providers request the same buffered windows as the charts
  (`fetch-window.js`), so overlapping URLs collapse in the broker — in
  market-value mode the table's provider and the price chart share one
  fetch. Each provider is `enabled`-gated on the surface that consumes it:
  with the table panel closed and the overlays off, only the three chart
  metrics fetch at all.
- Background idle prefetch (`idle-prefetch.js` via the chart host): every
  chart widens its cached window to 3× the viewport each side after settling,
  then warms 30 days of daily data and the full monthly history for its active
  metric. Later 30D/1Y/All selections can revive those managers immediately.
  Price and emissions history also use the edge cache below. All
  prefetch traffic runs at fetch priority 'low' during idle slices. The full
  trigger, job ordering, de-duplication, edge/D1 lifecycle and production test
  procedure live in `src/routes/api/admin/network-cache/README.md`.
- The route carries a keyed edge SWR cache (`keyed-swr-cache.js`, Cloudflare
  Cache API): any cached window serves instantly and refreshes in the
  background — live windows on a 5-minute horizon, fully-historical ones
  6-hourly — so the slow upstream fuel-tech scans (a cold full-history
  request takes tens of seconds) are paid once per colo, not per visitor.
  `x-oe-cache: hit|stale|miss` reports the tier; dev is uncached.
- An explicit range/interval pick is pinned: pans and zooms keep it until the
  span leaves the tier that offers it (`pinnedInterval` in the range
  control), so the first pan after "All" no longer flips 1M→1y and refires
  every surface.
- The nav's pending pulse clears when ALL three charts have loaded (slowest
  wins), not the fastest; each chart's veil names its target window while the
  stale frame holds.
- During pan/zoom gestures the charts freeze their y-domains and render
  padded whole-bucket slices with stable identity (`display-aggregation.js`),
  so per-frame work is path regeneration only; the table, overlays, URL and
  label track the settled window and update once per gesture. Debug flags:
  `localStorage['oe:debug-chart-fetch']` (request counts) and
  `localStorage['oe:debug-chart-fps']` (per-gesture frame stats).
- Demand-mode contribution shares needn't sum to 100% (losses, imports,
  basis differences) — this matches the homepage renewables methodology.

## Tests

Colocated vitest suites: `tracker-url.test.js`, `tracker-model.test.js`,
`table-model.test.js`, `page-load.test.js`. E2E smoke:
`tests/e2e/tracker.spec.js`.

## Deferred

Nav-items entry (currently behind the `tracker_nav` flag); CSV export; saved
views.
