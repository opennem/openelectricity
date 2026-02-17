# Facility Power Chart

Components for visualizing facility-level power data with per-unit breakdown, horizontal panning, client-side caching, and fuel tech color coding.

## Page Integration

The Facility Explorer page (`src/routes/(main)/studio/facility-explorer/`) orchestrates these components:

1. **Server load** (`+page.server.js`): Fetches all facilities + selected facility. For ranges **≤14 days**, fetches 5m power data server-side. For **>14 days**, skips — ChartDataManager handles it client-side.
2. **Page component** (`+page.svelte`): Manages `activeMetric`/`activeInterval`, syncs DateRangePicker ↔ chart viewport, handles auto metric/interval switching.
3. **FacilityChart**: Owns the viewport state (`viewStart`/`viewEnd`), creates ChartDataManager, renders via StratumChart → StackedAreaChart.

## Files

| File | Description |
|------|-------------|
| `FacilityChart.svelte` | Main chart component with pan/zoom/viewport, interval toggle, unit colour mapping |
| `FacilityDataTable.svelte` | Tabular view of visible chart data |
| `FacilityUnitsTable.svelte` | Facility unit metadata table |
| `process-facility-power.js` | Core data processing — converts API response to chart-ready rows |
| `helpers.js` | Color shading (`buildUnitColourMap`), timezone helpers, legacy `transformFacilityPowerData` |
| `index.js` | Barrel exports |

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
  unitFuelTechMap,   // Record<string, string> — unit code → fuel tech
  unitOrder,         // string[] — series ordering (e.g. ['power_UNIT1', 'power_UNIT2'])
  loadsToInvert,     // string[] — series IDs to negate
  getLabel,          // (unitCode: string, fuelTech: string) => string
  getColour,         // (unitCode: string, fuelTech: string) => string
  metricFilter,      // string — default 'power'
  networkTimezone    // string — '+10:00' (NEM) or '+08:00' (WEM)
})
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

### Thresholds

| Viewport duration | Metric | Interval | Prefetch buffer |
|-------------------|--------|----------|-----------------|
| ≤14 days | `power` | `5m` | 1x viewport |
| 14–548 days | `energy` | `1d` | 3x viewport |
| ≥548 days (~1.5y) | `energy` | `1M` | 3x viewport |

### Auto-switching with hysteresis

To prevent rapid flipping during continuous zoom, the switch thresholds differ by direction:

- **Power → Energy**: triggers at **12 days** (not 14)
- **Energy → Power**: triggers at **10 days** (not 14)
- **Daily → Monthly**: triggers at **548 days**
- **Monthly → Daily**: triggers at **365 days**

Both switches are debounced by 300ms.

### What happens on switch

1. Page updates `activeMetric` and `activeInterval`
2. FacilityChart's `$effect` detects the change and creates a **new ChartDataManager** with the new interval/metric
3. The viewport (`viewStart`/`viewEnd`) is preserved
4. New data is fetched with a buffer (3x for energy, 1x for power)
5. Chart re-renders with the new data

### 5m/30m display toggle (power mode only)

FacilityChart has an internal `selectedInterval` toggle ('5m' | '30m'). This is **client-side only** — the API is always called with `5m`. When `30m` is selected, `aggregateToInterval()` averages the 5m data into 30m buckets before rendering.

## ChartDataManager

`src/lib/components/charts/v2/ChartDataManager.svelte.js`

Reactive Svelte 5 class that manages a processed data cache independently from the visible viewport.

- **`seedCache(powerResponse)`** — Populate cache from server-side data (no fetch)
- **`requestRange(start, end)`** — Debounced fetch for uncached time ranges
- **`getDataForRange(startMs, endMs)`** — Slice cache by viewport bounds
- **`clearCache()`** — Reset all state

Internally calls `processFacilityPower()` and merges results by timestamp (dedup on overlap). Fetches include overlap buffers at cache boundaries (10min for 5m, 1 day for 1d, 31 days for 1M).

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
    → #splitGapIntoBatches() — split >1000-day gaps
    → for each batch (sequential):
        → skip if #inFlightKeys has this range
        → #fetchFromApi() — call /api/facilities/[code]/power
        → #mergeProcessedData() — dedup by timestamp, new data wins, re-sort
        → #updateCacheRange()
```

## FacilityChart Component

### Props

| Prop | Type | Description |
|------|------|-------------|
| `facility` | object | Facility with `units` array |
| `powerData` | object | Power data from API |
| `timeZone` | string | `'+10:00'` or `'+08:00'` |
| `title` | string | Chart title |
| `chartHeight` | string | Tailwind height class |
| `useDivergingStack` | boolean | Stack positive/negative independently |
| `onviewportchange` | callback | Fired when viewport changes |
| `onvisibledata` | callback | Debounced visible data for external table |

### Features

- **Interval toggle**: 5m (raw) or 30m (client-side aggregation via `aggregateToInterval`)
- **Pan**: Drag to scroll through time; direction-aware prefetch on pan end
- **Zoom**: Cmd+scroll, pinch, or +/- buttons; anchored to cursor position
- **Viewport clamping**: Cannot pan past current time
- **Capacity reference lines**: Shows generation/load capacity as horizontal lines

### Viewport limits

| Mode | Min viewport | Max viewport |
|------|-------------|-------------|
| Power (5m) | 1 hour | 16 days |
| Energy (1d/1M) | 5 days | 10 years |

### Pan & Zoom flow

**Pan**:
1. `PanZoomLayer` (SVG) captures pointer events → converts `deltaPx × msPerPx` to `deltaMs` → rAF batching
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

### Data update flow

```
viewStart/viewEnd change (via pan/zoom)
  → $effect reads dataManager.getDataForRange(viewStart, viewEnd)
  → optionally aggregates to 30m (power mode)
  → sets chartStore.seriesData and chartStore.xDomain
  → ChartStore.seriesScaledData ($derived) applies data transform
  → StratumChart → StackedAreaChart → LayerCake → SVG
```
