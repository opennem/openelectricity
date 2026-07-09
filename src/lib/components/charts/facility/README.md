# Facility Power Chart

Components for visualizing facility-level power data with per-unit breakdown, horizontal panning, client-side caching, and fuel tech color coding.

## Page Integration

The Facility Explorer page (`src/routes/(main)/studio/facility-explorer/`) orchestrates these components:

1. **Server load** (`+page.server.js`): Fetches all facilities + selected facility. For ranges below **POWER_THRESHOLD (10 days)**, fetches 5m power data server-side. For wider ranges or "All" (-1), skips — ChartDataManager handles it client-side.
2. **Page component** (`+page.svelte`): Manages `activeMetric`/`activeInterval`, syncs ChartRangeBar ↔ chart viewport, handles auto metric/interval switching.
3. **ChartRangeBar** (`v2/ChartRangeBar.svelte`): Unified toolbar with range presets (1D/3D/7D/30D/1Y/All), calendar popover (DateRangePicker), and an interval dropdown whose options follow the selected range (resolved from `range-interval-config.js`).
4. **FacilityChart**: Owns the viewport state (`viewStart`/`viewEnd`), creates ChartDataManager, renders via StratumChart → StackedAreaChart.

## Files

| File                            | Description                                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FacilityChart.svelte`          | Main chart component with pan/zoom/viewport, interval toggle, unit colour mapping                                                                                                       |
| `FacilityDataTable.svelte`      | Tabular view of visible chart data                                                                                                                                                      |
| `FacilityUnitsTable.svelte`     | Facility unit metadata table                                                                                                                                                            |
| `process-facility-power.js`     | Core data processing — converts API response to chart-ready rows                                                                                                                        |
| `unit-analysis.js`              | One-pass unit analysis (`analyzeUnits`): colours, fuel-tech/order/load maps, `unitsKey`, capacity sums; plus `unitSeriesIds` (series-id convention)                                     |
| `chart-range-control.svelte.js` | `createChartRangeControl` — shared range/interval/preset state machine (hysteresis, picker dates, echo-suppressed viewport pushes) used by `/facility/[code]` and its unit detail sheet |
| `data-end.js`                   | Retired-data window anchors: `retiredAnchorMs` (shared with the page server load) and `dataEndMs` (chart window end for snapshot/unit charts)                                           |
| `range-interval-config.js`      | Single source of truth: range presets, per-range interval options, interval → API fetch + aggregation spec                                                                              |
| `energy-basis.js`               | Shared price/intensity-provider helpers: basis-metric choice, combined query string, series-prefix rewrite, and the per-timestamp energy (MWh) map                                      |
| `interval-hours.js`             | `displayInterval` → bucket length in hours (calendar-aware); used to convert power → energy on the 5m/30m grains                                                                        |
| `helpers.js`                    | Colour shading (`buildUnitColourMap`, `SHADE_SPREADS`), series label/colour getter factories, timezone helpers, legacy `transformFacilityPowerData`                                     |
| `index.js`                      | Barrel exports                                                                                                                                                                          |

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

### Config

```js
processFacilityPower(powerResponse, {
	unitFuelTechMap, // Record<string, string> — unit code → fuel tech
	unitOrder, // string[] — series ordering (e.g. ['power_UNIT1', 'power_UNIT2'])
	loadsToInvert, // string[] — series IDs to negate
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

The old `transformFacilityPowerData` is still exported for backward compatibility but is no longer used by the chart.

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

All switches are debounced by 300ms. A pan/zoom that doesn't cross a native
threshold preserves an explicit interval-dropdown pick (5m/30m/Week/Quarter/
Season/Half/Fin-Year) rather than snapping it back to the auto grain — see
`stickyDisplay` in `chart-range-control.svelte.js`. Crossing a threshold, or a
later preset/calendar selection, re-derives the display interval.

### What happens on switch

1. Page updates `activeMetric` and `activeInterval`
2. FacilityChart's `$effect` detects the change and swaps managers: it first checks its stash (`prefetchCache`, keyed `${interval}-${metric}-${unitsKey}`) and revives the previous manager for that grain and unit set — so switching back to a range (or flipping battery net ⇄ split and back) renders instantly from cache — otherwise it creates a **new ChartDataManager**
3. The outgoing manager is stashed (LRU, max 4 entries; evictions are `dispose()`d) so its cache stays warm for a back-switch; managers from another facility are disposed instead
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

## ChartDataManager

`src/lib/components/charts/v2/ChartDataManager.svelte.js`

Reactive Svelte 5 class that manages a processed data cache independently from the visible viewport.

- **`seedCache(powerResponse)`** — Populate cache from server-side data (no fetch)
- **`requestRange(start, end)`** — Debounced fetch for uncached time ranges
- **`getDataForRange(startMs, endMs)`** — Slice cache by viewport bounds (binary search)
- **`dispose()`** — Retire the manager: cancel the pending debounce and make in-flight fetches no-ops on resolve. The cache is left intact so a stashed manager can be revived
- **`clearCache()`** — Dispose and reset all cached state

Internally calls `processFacilityPower()` and merges results with an O(n+m) sorted merge (new rows win on equal timestamps). The newest (right) boundary keeps an interval-scaled overlap (10min for 5m, 1 day for 1d, 31 days for 1M, 92 days for 3M, 365 days for 1y) to refresh the latest bucket; the older (left) boundary fetches contiguously up to the cache start. Concurrent identical fetches across managers (e.g. the generation chart and the price/emissions providers' combined URL) collapse to one network request via an in-flight dedup.

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
    → #splitGapIntoBatches() — split gaps exceeding max range (~11000d for every energy grain 1d/1M/3M/1y; ~1000d for sub-daily 5m/1h)
    → for each batch (sequential):
        → skip if #inFlightKeys has this range
        → #fetchFromApi() — call /api/facilities/[code]/power
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
- **Capacity reference lines**: Shows generation/load capacity as horizontal lines

### Viewport limits

| Mode              | Min viewport | Max viewport |
| ----------------- | ------------ | ------------ |
| Power (5m)        | 1 hour       | 16 days      |
| Energy (1d/3M/1y) | 5 days       | 50 years     |

### Pan & Zoom flow

**Pan**:

1. `InteractionLayer` (HTML div) captures pointer events → converts `deltaPx × msPerPx` to `deltaMs` → rAF batching
2. `FacilityChart.handlePan(deltaMs)`: shifts `viewStart`/`viewEnd`, clamps to now, calls `dataManager.requestRange(viewport ± buffer)`
3. `FacilityChart.handlePanEnd()`: direction-aware prefetch (prefetches 1x/3x viewport in the pan direction), notifies parent via `onviewportchange`

**Zoom**:

- **Wheel**: Cmd/Ctrl + scroll → `factor = 1.002^(-deltaY)`, anchored to cursor position in time domain
- **Buttons**: 1.5x zoom in/out, anchored to viewport center
- **Pinch**: Two-pointer distance ratio, anchored to midpoint
- All three call `handleZoom(factor, centerMs)` which clamps to min/max viewport and now

**Viewport → Page sync**:

- `onviewportchange({start, end})` fires on pan end and zoom
- Page converts to dates for DateRangePicker display
- Page runs hysteresis logic for auto metric/interval switching

**Tap-to-engage** (`/facility/[code]`):

- Page passes `panZoomMode="tap-to-engage"` and `bind:panZoomEngaged` to every mounted chart in the column (Generation plus the currently-visible Market and Emissions tabs) so a single tap engages them together — they're viewport-synced.
- First tap on the chart sets `panZoomEngaged = true` and skips the usual focus-marker toggle.
- The page's `<svelte:window onkeydown onclick>` handles ESC and click-outside, resetting the shared flag. ESC calls `preventDefault` + `stopPropagation` so it never escalates to exiting fullscreen.

### Data update flow

```
viewStart/viewEnd change (via pan/zoom)
  → $effect reads dataManager.getDataForRange(viewStart, viewEnd)
  → optionally aggregates to 30m (power mode)
  → sets chartStore.seriesData and chartStore.xDomain
  → ChartStore.seriesScaledData ($derived) applies data transform
  → StratumChart → StackedAreaChart → LayerCake → SVG
```
