# Facility Power Chart

Components for visualizing facility-level power data with per-unit breakdown, horizontal panning, client-side caching, and fuel tech color coding.

## Page Integration

The Facility Explorer page (`src/routes/(main)/studio/facility-explorer/`) orchestrates these components:

1. **Server load** (`+page.server.js`): Fetches all facilities + selected facility. For ranges below **POWER_THRESHOLD (10 days)**, fetches 5m power data server-side. For wider ranges or "All" (-1), skips — ChartDataManager handles it client-side.
2. **Page component** (`+page.svelte`): Manages `activeMetric`/`activeInterval`, syncs ChartRangeBar ↔ chart viewport, handles auto metric/interval switching.
3. **ChartRangeBar** (`v2/ChartRangeBar.svelte`): Unified toolbar with range presets (1D/3D/7D/30D/1Y/All), calendar popover (DateRangePicker), and an interval dropdown whose options follow the selected range (resolved from `range-interval-config.js`).
4. **FacilityChart**: Owns the viewport state (`viewStart`/`viewEnd`), creates data managers via `createFacilityDataManager()`, renders via StratumChart → StackedAreaChart.

## Files

| File                                 | Description                                                                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FacilityChart.svelte`               | Main chart component with pan/zoom/viewport, interval toggle, unit colour mapping                                                                                                         |
| `FacilityCompactCharts.svelte`       | Compact interactive Generation + Price block (own range tray, CSV options menu) shared by the `/facility/[code]` unit detail sheet and the `/facilities` selected-facility pane           |
| `FacilityDerivedRateProvider.svelte` | Generic provider behind the derived-rate chart pairs (Price + Market Value, Intensity + Emissions Volume) — data managers, viewport plumbing, chart effects; configured via a recipe      |
| `derived-rate-recipe.js`             | `DerivedRateRecipe` typedefs — the per-pair variation points the thin wrappers hand to `FacilityDerivedRateProvider`                                                                      |
| `FacilityDataTable.svelte`           | Tabular view of visible chart data                                                                                                                                                        |
| `FacilityUnitsTable.svelte`          | Facility unit metadata table                                                                                                                                                              |
| `process-facility-power.js`          | Core data processing — converts API response to chart-ready rows (thin wrapper over the timestamp-union core in `v2/series-rows.js`)                                                      |
| `facility-data-manager.js`           | `createFacilityDataManager` — facility-flavoured `ChartDataManager` factory: unit series ids, unit-set `seriesKey`, `processFacilityPower` wiring, default facility URL with `network_id` |
| `unit-analysis.js`                   | One-pass unit analysis (`analyzeUnits`): colours, fuel-tech/order/load maps, `unitsKey`, capacity sums; plus `unitSeriesIds` (series-id convention)                                       |
| `chart-range-control.svelte.js`      | `createChartRangeControl` — shared range/interval/preset state machine (hysteresis, picker dates, echo-suppressed viewport pushes) used by `/facility/[code]` and `FacilityCompactCharts` |
| `data-end.js`                        | Retired-facility helpers: `isFullyRetired`, `retiredAnchorMs` (shared with the page server load and RetiredFacilityNotice) and `dataEndMs` (chart window end for the compact charts)      |
| `range-interval-config.js`           | Single source of truth: range presets, per-range interval options, interval → API fetch + aggregation spec                                                                                |
| `range-params.js`                    | URL query-param (de)serialisation for the selected range (`range`/`start`/`end`/`interval`) plus `rangeSlugFor` (CSV filenames); URL sync is used by `/facility/[code]` only              |
| `facility-csv.js`                    | Chart CSV catalogue + builders (`chartDownloadItems`, `downloadChartCsv`) fed by the charts' visible-range datasets                                                                       |
| `energy-basis.js`                    | Shared price/intensity-provider helpers: basis-metric choice, combined query string, and the per-timestamp energy (MWh) map                                                               |
| `price-lines.js`                     | Direction-decomposed derived price: generation vs load partition, per-side VWAP rows, price-line labels (see "Derived price" below)                                                       |
| `intensity-lines.js`                 | Derived emissions intensity: Σ emissions / Σ energy (kgCO₂e/MWh) over the visible units — mirrors `price-lines.js` but with a single facility-wide line                                   |
| `capacity-annotations.js`            | Capacity reference-line and y-domain rules for the generation chart, extracted from FacilityChart as a pure function                                                                      |
| `colours.js`                         | `LINE_COLOUR` — the shared red used by both the price and intensity lines                                                                                                                 |
| `interval-hours.js`                  | `displayInterval` → bucket length in hours (calendar-aware); used to convert power → energy on the 5m/30m grains                                                                          |
| `helpers.js`                         | Colour shading (`buildUnitColourMap`, `SHADE_SPREADS`), series label/colour getter factories, timezone helpers, legacy `transformFacilityPowerData`                                       |
| `index.js`                           | Barrel exports                                                                                                                                                                            |

## Data Pipeline

### How it works

The OE API returns power data as `[timestamp, value]` pairs per unit:

```
{ data: [{ metric: 'power', results: [{ name: 'power_UNIT1', data: [['2026-02-08T04:50:00+10:00', 150], ...] }] }] }
```

`processFacilityPower()` converts this directly to chart-ready rows:

1. For each series, builds a `Map<timestampMs, value>` from the real timestamp/value pairs
2. Inverts values for load series (e.g. battery charging)
3. Unions all timestamps across all series, sorts ascending
4. For each timestamp, creates a row: `{ date, time, power_UNIT1: val|null, power_UNIT2: val|null, ... }`
5. Builds `seriesLabels` and `seriesColours` via callback functions

Steps 1–4 are the shared timestamp-union core in `v2/series-rows.js` (`collectSeriesByTimestamp` in `'set'` mode, `orderSeriesIds`, `rowsFromSeriesMaps`) — the same skeleton `processNetworkData` (`'sum'` mode, keyed on fuel tech) and `processPriceData` build on.

### Config

Chart components don't call `processFacilityPower` directly — they create data managers via `createFacilityDataManager()` (`facility-data-manager.js`), which builds this config from unit codes and injects it as the manager's `processResponse`:

```js
processFacilityPower(powerResponse, {
	unitFuelTechMap, // Record<string, string> — unit code → fuel tech
	unitOrder, // string[] — series ordering, prefixed for the fetched metric (built via unitSeriesIds(metric, orderedCodes))
	loadsToInvert, // string[] — series IDs to negate (built via unitSeriesIds(metric, loadCodes))
	getLabel, // (unitCode: string, fuelTech: string) => string
	getColour, // (unitCode: string, fuelTech: string) => string
	metricFilter, // string — default 'power'
	networkTimezone // string — '+10:00' (NEM) or '+08:00' (WEM)
});
```

### Output

```js
{
  data: [{ date: Date, time: number, power_UNIT1: number|null, ... }],
  seriesNames: string[],
  seriesLabels: Record<string, string>,
  seriesColours: Record<string, string>
}
```

### Timestamp parsing

API timestamps have inconsistent timezone formats (`Z` or `+HH:MM`). The pipeline:

1. Strips the timezone suffix via `stripDateTimezone()`
2. Re-appends the network timezone (`+10:00` or `+08:00`)
3. Parses to UTC milliseconds

### Why not TimeSeriesV2?

The previous pipeline went through `transformFacilityPowerData → StatisticV2 → TimeSeriesV2.transform()`. `TimeSeriesV2.transform()` reconstructs timestamps from `startTime + index * interval`, using the **first series' start time as the base for all series**. If units have different start times or data lengths, values get mapped to wrong timestamps. `processFacilityPower()` avoids this by using the real timestamps from the API directly.

The old `transformFacilityPowerData` is still exported for backward compatibility but is no longer used by the chart. The StatisticV2 → TimeSeriesV2 pipeline itself has moved to `v2/legacy-transform.js` (re-exported through `v2/dataProcessing.js` for the routes that still consume it).

## Interval/Metric System

The chart automatically switches between power and energy metrics based on the viewport duration. This is managed by the **page component** (`+page.svelte`), not FacilityChart itself.

### Thresholds (auto-set by `autoSetMetricInterval`)

The auto-switch ladder only ever lands on a **native** fetch interval
(`5m ↔ 1d ↔ 1M ↔ 1y`) so each switch is a single valid `ChartDataManager`
request. Coarser display grains (Week, Quarter, Season, Half-year, Fin-year) are
explicit picker choices (see `range-interval-config.js`), never auto-selected.

| Viewport duration | Metric   | API Interval | Auto display |
| ----------------- | -------- | ------------ | ------------ |
| < 10 days         | `power`  | `5m`         | 5 min        |
| 10–364 days       | `energy` | `1d`         | Daily        |
| 365–1824 days     | `energy` | `1M`         | Month        |
| ≥ 1825 days       | `energy` | `1y`         | Year         |

### Auto-switching with hysteresis

To prevent rapid flipping during continuous zoom, the switch thresholds differ by direction:

**Zoom out (→ coarser):**

- **Power/5m → Energy/1d**: at **10+ days**
- **Energy/1d → Energy/1M**: at **365+ days**
- **Energy/1M → Energy/1y**: at **1825+ days**

**Zoom in (→ finer, with hysteresis gap):**

- **Energy/1y → Energy/1M**: at **< 1500 days**
- **Energy/1M → Energy/1d**: at **< 300 days**
- **Energy/1d → Power/5m**: at **≤ 8 days**

Switches are evaluated **once per gesture, when it settles** (the chart's
`onviewportsettle` callback — synchronous on pointer release / zoom-button
click, a 200 ms lull for wheel streams), always against the final viewport.
Mid-gesture, only the display interval adapts (re-aggregation, no fetch). A
pan/zoom that doesn't cross a native threshold preserves an explicit
interval-dropdown pick (5m/30m/Week/Quarter/Season/Half/Fin-Year) rather than
snapping it back to the auto grain — see `stickyDisplay` in
`chart-range-control.svelte.js`. Crossing a threshold, or a later
preset/calendar selection, re-derives the display interval.

### What happens on switch

1. Page updates `activeMetric` and `activeInterval`
2. FacilityChart's `$effect` detects the change and swaps managers: it first checks its manager stash (a `createManagerStash()` LRU from `v2/manager-stash.js`, keyed `${interval}-${metric}-${seriesKey}`) and revives the previous manager for that grain and unit set — so switching back to a range (or flipping battery net ⇄ split and back) renders instantly from cache — otherwise it creates a **new manager** via `createFacilityDataManager()`
3. The outgoing manager is stashed (LRU, max 4 entries; evictions are `dispose()`d) so its cache stays warm for a back-switch; managers from another facility are disposed instead (that policy lives in FacilityChart's `stashOrDispose`; the LRU mechanics are in `v2/manager-stash.js`, shared with NetworkChart)
4. The viewport (`viewStart`/`viewEnd`) is preserved
5. New data is fetched with a buffer (3x for energy, 1x for power); while it loads, the previous chart stays visible under the loading veil (`chart-loading-state.js`) and the page pulses the active range control (`ChartRangeBar`'s `pending` prop)
6. Chart re-renders with the new data

### Display interval vs API interval

FacilityChart has internal display interval toggles that perform **client-side aggregation** on top of cached API data:

- **Power mode**: API always fetches `5m`. Toggle between `5m` (raw) and `30m` (`aggregateToInterval` averages). All consumers share the config defaults: `5m` auto-derives under 2 days, `30m` at 2+ days (so `/facility/[code]`'s default 3-day window loads at 30m); either grain remains an explicit dropdown pick that survives pan/zoom.
- **Energy mode with `1d` API interval**: Daily (raw) or Monthly (`aggregateToMonth` sums).
- **Energy mode with `1M` API interval**: Monthly (raw), or the coarse calendar picks — Season / Half-year / Fin-year — bucketed client-side via `aggregateByBoundary`.
- **Energy mode with `3M` or `1y` API interval**: Quarter / Year render at the fetched grain — no further aggregation.

All render-layer aggregation is funnelled through a single dispatcher,
`aggregateForDisplay(data, seriesNames, { apiInterval, displayInterval, ianaTimeZone, method })`
in `v2/dataProcessing.js`, so FacilityChart and the financial/emissions providers
stay in lock-step. At the `30m` grain the dispatcher opts summed (volume) series —
market value, emissions — into `trimPartialEdges`, dropping half-filled first/last
buckets that would otherwise render as a false dip at the viewport edges; averaged
(rate) series keep theirs, since a partial bucket still averages to the right level.

The `showIntervalToggle` prop (default `true`) controls whether FacilityChart shows its own interval buttons. When using ChartRangeBar (which has its own interval dropdown), pass `showIntervalToggle={false}`.

The `setDisplayInterval(intv)` export method allows external control of the display interval (for `5m`/`30m`/`1d`/`1M` — the client-side aggregation levels).

## Derived-rate providers (`FacilityDerivedRateProvider` + recipes)

The Market and Emissions tab chart pairs share one generic provider, `FacilityDerivedRateProvider.svelte`. It owns everything common to both pairs: a volume `ChartDataManager` plus a basis (energy) manager on the same combined URL (`metric=<basis>,market_value,emissions` — so all managers across the pairs collapse to one network round-trip per range), the viewport plumbing (`createViewportGestures`, `createVisibleAggregation` memos), the rate derivation flow (volume ÷ energy), and the two ChartStores (rate line + stacked volume) published through a named context.

`FacilityFinancialDataProvider.svelte` (~318 lines) and `FacilityEmissionsDataProvider.svelte` (~230 lines) are thin wrappers: each builds a **recipe** object — the per-pair variation points — and renders the generic provider with it. The recipe carries the volume metric (`market_value` / `emissions`), the ChartStore factories (price's hybrid y-scale vs intensity's linear axis), the rate derivation (`derivePriceRows` from `price-lines.js` / `deriveIntensityRows` from `intensity-lines.js`), the rate series names/colours/labels, the summary payload shape, and a `setContext` callback that maps the generic context onto the wrapper's named context fields. The recipe's typedefs live in `derived-rate-recipe.js` (JSDoc typedefs in a `.svelte` script aren't importable elsewhere).

Shared colour helpers: the load-side price line resolves its fuel-tech colour via `getFuelTechColour` in `src/lib/components/charts/colours.js` (neutral `#888888` fallback); the generation-side price line and the intensity line share the red `LINE_COLOUR` from this folder's `colours.js`.

## Derived price (`price-lines.js` + FacilityFinancialDataProvider)

The Market tab's price is derived, not fetched: volume-weighted average price
= Σ market_value / Σ energy over the visible window. That division is only
meaningful while the numerator and denominator describe flow in **one
direction**, so the derivation partitions the unit set into a **generation
side** and a **load side** (`loadFuelTechs`: battery charging variants, pumps,
etc.) and computes an independent line per side:

| Line        | Formula                           | Valid while | Meaning                                                             |
| ----------- | --------------------------------- | ----------- | ------------------------------------------------------------------- |
| `price`     | Σ mv(gen units) / Σ energy(gen)   | energy > 0  | VWAP earned by generation/discharge                                 |
| `loadPrice` | Σ mv(load units) / Σ energy(load) | energy < 0  | VWAP paid to charge/pump — negative when paid to consume (−ve spot) |

Load series arrive sign-inverted from `processFacilityPower` (`loadsToInvert`),
so on the load side both totals are negative and the ratio recovers the
positive price paid. Sides without volume in their direction render `null`
(gaps): a generator that's off, a battery that isn't charging — and, crucially,
a **net-signed** series while flowing the "wrong" way (see net battery below).

### Facility shapes

- **Generation-only facility** (coal/wind/solar…): no load units, so only the
  `price` line exists — identical to the historical single-line behaviour.
- **Battery, split view** (`battery_discharging` + `battery_charging`):
  `price` is the discharge VWAP, `loadPrice` the charge VWAP; the gap between
  the lines is the arbitrage spread.
- **Battery, net view**: the bidirectional `battery` unit is _not_ a load, and
  its net-signed series can't be decomposed row-by-row at daily+ grains (a day
  mixes both directions; round-trip losses make most days net-negative, which
  is why the naive facility-wide price rendered nothing). The page therefore
  passes the **split** unit set via the provider's `priceFacility` prop, so
  both toggles show the same two decomposed price lines. The dedicated pricing
  managers fetch the same combined URL as the display managers — the in-flight
  dedup and the completed-response LRU collapse them into the same requests.
- **Mixed fuel techs + battery** (e.g. solar + storage): solar and discharging
  sit together on the generation side; charging gets its own `loadPrice` line.
- **Pumped hydro**: `pumps` units are loads, so pumping cost is the
  `loadPrice` line next to the hydro generation price.
- **Unit slide-out**: the per-unit facility clone prices just that unit — a
  discharge unit shows only `price`, a charging/pump unit only `loadPrice`.

### Labels and colours

`genPriceLabel` / `loadPriceLabel` name the lines by what's on each side:
"Discharge price" (pure battery discharge) vs "Generation price"; "Charge
price" (all charging variants), "Pumping price" (all pumps), else "Load
price". With no load line the single line keeps its historical "Av. Price"
label. The load line takes its first unit's fuel-tech colour so it ties back
to the same units in the stacked charts; the generation line keeps the shared
red `LINE_COLOUR`.

When both lines render, the price chart's hover strip lists each direction's
value separately — never a total, since the lines are independent $/MWh
measures.

The price lines are facility-wide by design — the units-panel visibility
toggles (`hiddenUnitCodes`) hide series from the market-value stack only.
The emissions-intensity line keeps its `energy > 0` guard: loads have no
generation intensity, so a load-side intensity would be meaningless.

Business-logic tests: `price-lines.test.js`.

## ChartDataManager

`src/lib/components/charts/v2/ChartDataManager.svelte.js`

Reactive Svelte 5 class that manages a processed data cache independently from the visible viewport. The class itself is source-neutral — config `{ cacheKey, networkTimezone, interval?, metric?, seriesKey?, processResponse, buildFetchUrl }` with the last two required. Facility consumers create managers through the `createFacilityDataManager()` factory (`facility-data-manager.js`), which owns the facility wiring:

```js
import { createFacilityDataManager } from './facility-data-manager.js';

const manager = createFacilityDataManager({
	facilityCode: facility.code,
	networkId: facility.network_id, // injected into the fetch URL as `network_id`
	interval: '5m',
	metric: 'power', // series ids carry this prefix — ordering/inversion are built per metric
	unitFuelTechMap, // unit code → fuel tech; also derives the manager's `seriesKey`
	orderedCodes, // unit codes in stack order
	loadCodes, // unit codes whose series are inverted (loads)
	getLabel,
	getColour
	// buildFetchUrl — optional override, e.g. the providers' combined-metrics URL
});
```

The factory wraps `processFacilityPower` as the manager's `processResponse` and defaults the URL to `/api/facilities/[code]/power`.

- **`seedCache(powerResponse)`** — Populate cache from server-side data (no fetch)
- **`requestRange(start, end)`** — Debounced fetch for uncached time ranges
- **`getDataForRange(startMs, endMs)`** — Slice cache by viewport bounds (binary search)
- **`cancelStaleFetches(keepStart, keepEnd)`** — Abort in-flight batches disjoint from the keep-window and drop/clamp the pending debounced fetch. Aborted spans stay unknown (never recorded empty), so a later `requestRange` re-fetches them
- **`reconcileWindow(keepStart, keepEnd)`** — `cancelStaleFetches` + an immediate `requestRange` for the same window, as one operation. What the charts call when a pan/zoom gesture settles — the paired request is what brings any wrongly-dropped span straight back
- **`dispose()`** — Retire the manager: cancel the pending debounce, abort in-flight batches (safe for shared URLs — `sharedFetch` refcounts consumers) and make still-settling fetches no-ops. The cache is left intact so a stashed manager can be revived
- **`clearCache()`** — Dispose and reset all cached state

Internally calls its configured `processResponse` (for facilities, `processFacilityPower`) and merges results with an O(n+m) sorted merge (new rows win on equal timestamps). The newest (right) boundary keeps an interval-scaled overlap (10min for 5m, 1 day for 1d, 31 days for 1M, 92 days for 3M, 365 days for 1y) to refresh the latest bucket; the older (left) boundary fetches contiguously up to the cache start. Concurrent identical fetches across managers (e.g. the generation chart and the price/emissions providers' combined URL) collapse to one network request via an in-flight dedup, and completed responses are kept in a module-level LRU (cap 30, TTL 300 s — the API's `max-age`) so sequential repeats skip the network and the JSON re-parse.

### Cache structure

- **`#dataCache`** (`$state.raw`): sorted array of chart-ready rows `{date, time, series1: val, ...}`
- **`#cacheStart` / `#cacheEnd`** (`$state`): derived from first/last row timestamps
- **`#inFlightKeys`**: Set of `"start-end"` strings preventing duplicate fetch requests
- **`#pendingFetch`**: Merged pending range from rapid `requestRange()` calls

### Fetch lifecycle

```
requestRange(start, end)
  → skip if fully cached
  → merge with #pendingFetch (widen range)
  → debounce 150ms
  → #executeFetch()
    → #computeGaps() — find uncached ranges (with overlap buffer)
    → #splitGapIntoBatches() — split gaps exceeding max range (~11000d for every energy grain 1d/1M/3M/1y; the OE API caps for sub-daily: 30d for 5m, 365d for 1h)
    → for each batch (concurrent):
        → skip if #inFlightKeys has this range
        → #fetchFromApi() — call buildFetchUrl(params) (facility default: /api/facilities/[code]/power with network_id)
        → drop the result if dispose()/clearCache() retired this generation mid-flight
        → #mergeProcessedData() — sorted two-pointer merge, new data wins on equal timestamps
        → #updateCacheRange()
```

## FacilityChart Component

### Props

| Prop                      | Type                                  | Description                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `facility`                | object                                | Facility with `units` array                                                                                                                                                                                                                                                                                            |
| `powerData`               | object                                | Power data from API                                                                                                                                                                                                                                                                                                    |
| `timeZone`                | string                                | `'+10:00'` or `'+08:00'`                                                                                                                                                                                                                                                                                               |
| `title`                   | string                                | Chart title                                                                                                                                                                                                                                                                                                            |
| `chartHeight`             | string                                | Tailwind height class                                                                                                                                                                                                                                                                                                  |
| `useDivergingStack`       | boolean                               | Stack positive/negative independently                                                                                                                                                                                                                                                                                  |
| `onviewportchange`        | callback                              | Fired when viewport changes                                                                                                                                                                                                                                                                                            |
| `onvisibledata`           | callback                              | Debounced visible data for external table                                                                                                                                                                                                                                                                              |
| `ondisplayintervalchange` | callback                              | Fired when display interval changes                                                                                                                                                                                                                                                                                    |
| `onloadcomplete`          | callback                              | Fired when a fetch/seed settles, with `{ hasData }` — lets a parent tell "loading" from "no data". If the first settled window is empty it retries once from the facility's own default range before reporting `hasData: false`, so a stale viewport after a client-side nav self-heals. Stays accurate across panning |
| `showIntervalToggle`      | boolean                               | Show built-in interval toggle buttons (default: `true`)                                                                                                                                                                                                                                                                |
| `panZoomMode`             | `'always' \| 'tap-to-engage'`         | Forwarded to StratumChart. `'always'` is the default; `'tap-to-engage'` shows a "Click to enable" hint pill and gates gestures behind `panZoomEngaged`. Used on `/facility/[code]` to keep the chart from hijacking page scroll until the user opts in                                                                 |
| `panZoomEngaged`          | `boolean` (bindable)                  | Engagement state for tap-to-engage mode. The facility page binds the same state across the visible charts (FacilityChart plus whichever of the financial/emissions tab pairs are mounted) and resets it on ESC, click-outside, or facility change                                                                      |
| `enablePan`               | `boolean`                             | Enable drag/wheel pan (default `true`). Set `false` for a fixed-window snapshot — hover tooltips still work. Used by the `/facilities` detail-pane snapshot charts                                                                                                                                                     |
| `resizable`               | `boolean`                             | Show the drag-to-resize handle (default `true`). Set `false` for a fixed-height snapshot so the chart honours `chartHeight` and doesn't share the persisted resize height                                                                                                                                              |
| `yTicks`                  | `number \| any[] \| (ticks) => any[]` | Y-axis ticks forwarded to AxisY: a count, explicit values, or a function thinning the scale's default ticks. Omit for the AxisY default (4). The snapshot charts pass `capYTicks` (helpers.js), capping at 3                                                                                                           |
| `prefetchRanges`          | `boolean`                             | Background-prefetch the 7-day power + 1-year energy ranges after the initial load (default `true`). The unit detail sheet passes `false` — its prefetch would duplicate the main page's cache                                                                                                                          |
| `hiddenUnitCodes`         | `string[]`                            | Unit codes toggled off in the units panel — mapped onto the chart store's `hiddenSeriesNames` via `unitSeriesIds(metric, codes)`                                                                                                                                                                                       |

### Features

- **Interval toggle**: 5m/30m for power, 1d/1M for energy (client-side aggregation). Hidden when `showIntervalToggle={false}`
- **Pan**: Drag to scroll through time; direction-aware prefetch on pan end
- **Zoom**: Cmd+scroll, pinch, or +/- buttons; anchored to cursor position
- **Viewport clamping**: Cannot pan past current time
- **Capacity reference lines**: Shows generation/load capacity as horizontal lines (rules extracted as a pure function in `capacity-annotations.js`)

### Viewport limits

| Mode              | Min viewport | Max viewport |
| ----------------- | ------------ | ------------ |
| Power (5m)        | 1 hour       | 16 days      |
| Energy (1d/3M/1y) | 5 days       | 50 years     |

### Pan & Zoom flow

FacilityChart's handlers come from `createViewportGestures()` in `v2/viewport-gestures.js` — the shared pan/zoom maths (delta inversion, clamp-to-now, pointer-anchored zoom, directional prefetch) also used by NetworkChart and FacilityDerivedRateProvider; the variants differ only in the config callbacks (`viewport`, `apply`, `onMove`, `onPanEnd`, min/max durations).

**Pan**:

1. `InteractionLayer` (HTML div) captures pointer events → converts `deltaPx × msPerPx` to `deltaMs` → rAF batching
2. `handlePan(deltaMs)`: shifts `viewStart`/`viewEnd` via the `apply` callback, clamps to now; the `onMove` hook calls `dataManager.requestRange(viewport ± buffer)`
3. `handlePanEnd()`: the `onPanEnd` hook prefetches 1x/3x viewport in the pan direction

**Zoom**:

- **Wheel**: Cmd/Ctrl + scroll → `factor = 1.002^(-deltaY)`, anchored to cursor position in time domain
- **Buttons**: `zoomIn`/`zoomOut` from the gesture factory — 1.5x, anchored to viewport centre
- **Pinch**: Two-pointer distance ratio, anchored to midpoint
- All three call `handleZoom(factor, centerMs)` which clamps to min/max viewport and now

**Viewport → Page sync**:

- `onviewportchange({start, end})` fires reactively whenever the viewport changes (pan, zoom, `setViewport`, initial load, metric switch)
- `onviewportsettle({start, end})` fires once when a gesture comes to rest (pointer release / zoom-button click synchronously; wheel streams after a 200 ms lull; never from `setViewport`)
- Page converts to dates for DateRangePicker display
- Page runs the hysteresis metric/interval switch at settle (`handleViewportSettle`); mid-gesture only the display interval adapts
- On settle the chart also reconciles its fetches (`reconcileFetches()`): in-flight requests outside the buffered final window are aborted and the remaining gaps fetched immediately

**Tap-to-engage** (`/facility/[code]` and `FacilityCompactCharts` — the unit detail sheet and the /facilities pane):

- The host passes `panZoomMode="tap-to-engage"` and `bind:panZoomEngaged` to every chart in the stack so a single tap engages them together — they're viewport-synced, and wheel/drag can't hijack the page/sheet scroll until the user opts in.
- First tap on a chart sets `panZoomEngaged = true` and skips the usual focus-marker toggle.
- The engage/exit control lives in the **chart header row**: `v2/ChartHeader` renders a ✥ toggle left of the +/- zoom buttons (same flat icon-button style, subtle divider between them, app tooltips); while engaged the +/- buttons hide (wheel zoom covers them) and the toggle shows the dark active state. StratumChart wires it automatically for tap-to-engage charts (`showPanZoomToggle`/`panZoomEngaged`/`onpanzoomtoggle`). All headers in a viewport-synced stack reflect the one shared flag. `FacilityCompactCharts` shows the same headers (`showOptions={false}` hides the options button), so the unit sheet and /facilities pane carry identical interaction buttons to the facility page.
- **Intent hint**: scrolling the wheel over an idle chart still scrolls the page, but a momentary "Click to enable pan & zoom" pill fades in over that chart (clicking it engages). Wired via InteractionLayer's `onblockedwheel` — a passive wheel listener attached only while tap-to-engage is idle; StratumChart owns the overlay and its ~1.6s dismiss timer.
- **Engaged-region marker**: while engaged, the facility page's chart section cards pick up a solid `!border-dark-grey` (via the page's `chartCardClass`); the compact block gets a flush `outline-dark-grey/40` on its wrapper — the mode is visible at every chart, not just at the toggle.
- Releases: the toggle itself, **Esc** (owned by StratumChart — a capture-phase window keydown while engaged, so releasing the mode wins over host Esc behaviour like the unit sheet's close; each chart in a stack attaches one and they converge idempotently on the shared flag), or a pointerdown anywhere **outside the charts wrapper** — `use:clickoutside={{ event: 'pointerdown', options: true }}` (capture-phase pointerdown on document; the action's default bubble-phase `click` can be swallowed by stopPropagation/preventDefault along the way, which left the engagement stuck).
- The `/facility/[code]` page itself runs `panZoomMode="always"` (the default): pan/zoom is live immediately and no interaction hints render.

### Data update flow

```
viewStart/viewEnd change (via pan/zoom)
  → $effect calls visibleAggregation(dataManager.processedCache, { viewStart, viewEnd, apiInterval, displayInterval, … })
      (a createVisibleAggregation() memo from v2/display-aggregation.js — slices the
       cache by binary search and aggregates to the display interval; on a hit it
       returns the SAME array reference, so the seriesData assignment below is a
       signal no-op and downstream recomputation is skipped)
  → sets chartStore.seriesData and chartStore.xDomain
  → applyFacilityTimeAxis (per-store write guards skip unchanged ticks/formatters)
  → ChartStore.seriesScaledData ($derived) applies data transform
  → StratumChart → StackedAreaChart → LayerCake → SVG
```
