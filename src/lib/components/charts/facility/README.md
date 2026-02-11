# Facility Power Chart

Components for visualizing facility-level power data with per-unit breakdown, horizontal panning, client-side caching, and fuel tech color coding.

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

## ChartDataManager

`src/lib/components/charts/v2/ChartDataManager.svelte.js`

Reactive Svelte 5 class that manages a processed data cache independently from the visible viewport.

- **`seedCache(powerResponse)`** — Populate cache from server-side data (no fetch)
- **`requestRange(start, end)`** — Debounced fetch for uncached time ranges
- **`getDataForRange(startMs, endMs)`** — Slice cache by viewport bounds
- **`clearCache()`** — Reset all state

Internally calls `processFacilityPower()` and merges results by timestamp (dedup on overlap). Fetches include a 10-minute overlap buffer at cache boundaries to prevent seam gaps.

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
- **Pan**: Drag to scroll through time; prefetches 1x viewport ahead on pan end
- **Zoom**: Cmd+scroll, pinch, or +/- buttons; anchored to cursor position
- **Viewport clamping**: Min 1 hour, max 14 days, cannot pan past current time
- **Capacity reference lines**: Shows generation/load capacity as horizontal lines
