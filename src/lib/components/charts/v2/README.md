# Chart System v2

A modular, flexible charting system for visualizing time series data. Built with Svelte 5 and designed for energy/power data visualization.

## Overview

The v2 chart system consists of:

- **Data Processing** - Transform raw statistics into chart-ready data
- **Chart Store** - Reactive state management for chart configuration
- **Chart Components** - Svelte components for rendering charts
- **Utilities** - Helpers for intervals, synchronization, and more

## Quick Start

```javascript
import {
	ChartStore,
	StratumChart,
	processForChart,
	DateBrush,
	INTERVAL_OPTIONS
} from '$lib/components/charts/v2';

// Process raw data
const chartData = processForChart(rawData, 'W', {
	groupMap: myGroupMap,
	groupOrder: myOrder,
	loadsToInvert: ['battery_charging'],
	labelReducer: myLabelReducer,
	colourReducer: myColourReducer
});

// Create chart store
const chart = new ChartStore({
	key: Symbol('my-chart'),
	title: 'Power Generation',
	baseUnit: 'W',
	timeZone: 'Australia/Sydney'
});

// Set data
chart.seriesData = chartData.data;
chart.seriesNames = chartData.seriesNames;
chart.seriesLabels = chartData.seriesLabels;
chart.seriesColours = chartData.seriesColours;
```

```svelte
<StratumChart {chart} />
```

---

## Data Processing

### processForChart(data, unit, options)

The main entry point for processing raw statistics data into chart-ready format.

```javascript
import { processForChart } from '$lib/components/charts/v2';

const result = processForChart(rawData, 'W', {
  // Group fuel techs into categories
  groupMap: {
    solar: ['solar_utility', 'solar_rooftop'],
    wind: ['wind', 'wind_offshore'],
    coal: ['coal_black', 'coal_brown']
  },

  // Display order
  groupOrder: ['coal', 'gas', 'wind', 'solar'],

  // Values to invert (show as negative)
  loadsToInvert: ['battery_charging', 'pumps'],

  // Custom label mapping
  labelReducer: (acc, d) => {
    acc[d.fuel_tech] = myLabels[d.fuel_tech];
    return acc;
  },

  // Custom colour mapping
  colourReducer: (acc, d) => {
    acc[d.fuel_tech] = myColours[d.fuel_tech];
    return acc;
  }
});

// Result structure
{
  data: [...],           // Array of time series data points
  seriesNames: [...],    // Array of series identifiers
  seriesLabels: {...},   // Map of id -> display label
  seriesColours: {...},  // Map of id -> colour
  minY: number,
  maxY: number
}
```

### createProcessor(presetOptions)

Create a reusable processor with preset options:

```javascript
import { createProcessor } from '$lib/components/charts/v2';

const processAuGrid = createProcessor({
	groupMap: auGridGroups,
	groupOrder: auGridOrder,
	loadsToInvert: loadFuelTechs
});

// Use with just data and unit
const result = processAuGrid(data, 'W');
```

### filterByDateRange(data, startDate, endDate)

Filter data points by date range:

```javascript
import { filterByDateRange } from '$lib/components/charts/v2';

const filtered = filterByDateRange(data, new Date('2024-01-01'), new Date('2024-01-31'));
```

---

## StatisticV2 Class

Located in `$lib/utils/Statistic/v2.js`

The StatisticV2 class processes raw statistics data, handling grouping, ordering, and value transformations.

### Constructor

```javascript
import StatisticV2 from '$lib/utils/Statistic/v2.js';

const stats = new StatisticV2(data, {
	statsType: 'history', // or 'forecast'
	unit: 'MW',
	immutable: false // If true, operations return new instances
});
```

### Methods

#### invertValues(idsToInvert)

Invert values for specified series (e.g., make loads negative):

```javascript
stats.invertValues(['battery_charging', 'pumps', 'exports']);
```

#### group(groupMap)

Group multiple series into single aggregated series:

```javascript
stats.group({
	solar: ['solar_utility', 'solar_rooftop'],
	wind: ['wind', 'wind_offshore'],
	fossil: ['coal_black', 'coal_brown', 'gas_ccgt', 'gas_ocgt']
});
```

#### reorder(order)

Reorder series for display:

```javascript
stats.reorder(['coal', 'gas', 'hydro', 'wind', 'solar']);
```

#### filter(predicate)

Filter data items:

```javascript
stats.filter((d) => d.fuel_tech !== 'imports');
```

#### getData()

Get the processed data array:

```javascript
const processedData = stats.getData();
```

### Chaining

All methods return `this` for chaining:

```javascript
const result = new StatisticV2(data, { unit: 'MW' })
	.invertValues(['battery_charging'])
	.group(myGroupMap)
	.reorder(myOrder)
	.getData();
```

---

## TimeSeriesV2 Class

Located in `$lib/utils/TimeSeries/v2.js`

The TimeSeriesV2 class transforms statistics data into time-indexed series suitable for charting.

### Constructor

```javascript
import TimeSeriesV2 from '$lib/utils/TimeSeries/v2.js';

const ts = new TimeSeriesV2(statsData, {
	statsType: 'history',
	labelReducer: myLabelReducer,
	colourReducer: myColourReducer
});
```

### Methods

#### transform()

Transform statistics data into time series format:

```javascript
ts.transform();
// Data now has { date, time, series1, series2, ... } structure
```

#### aggregate(targetInterval, method)

Aggregate data to a larger interval:

```javascript
// Aggregate 5-minute data to 30-minute
ts.aggregate('30m', 'mean'); // or 'sum'
```

#### filterByDateRange(startDate, endDate)

Filter data by date range:

```javascript
ts.filterByDateRange(new Date('2024-01-01'), new Date('2024-01-31'));
```

#### updateMinMax()

Calculate min/max values for stacked charts:

```javascript
ts.updateMinMax();
// Adds _min and _max to each data point
```

#### toPercentage(totalKey?)

Convert values to percentages:

```javascript
ts.toPercentage(); // Uses sum of all series as 100%
ts.toPercentage('total'); // Uses specific key as 100%
```

#### toChartFormat()

Export data in chart-ready format:

```javascript
const chartData = ts.toChartFormat();
// Returns { data, seriesNames, seriesLabels, seriesColours, minY, maxY }
```

### Full Example

```javascript
import StatisticV2 from '$lib/utils/Statistic/v2.js';
import TimeSeriesV2 from '$lib/utils/TimeSeries/v2.js';

// Process statistics
const stats = new StatisticV2(rawData, { unit: 'MW' })
	.invertValues(['battery_charging'])
	.group(fuelTechGroups)
	.reorder(displayOrder);

// Convert to time series
const ts = new TimeSeriesV2(stats.getData(), {
	labelReducer: myLabelReducer,
	colourReducer: myColourReducer
});

ts.transform().aggregate('30m').updateMinMax();

const chartData = ts.toChartFormat();
```

---

## Chart Components

### ChartStore

The central state management for a chart instance:

```javascript
import { ChartStore } from '$lib/components/charts/v2';

const chart = new ChartStore({
  key: Symbol('unique-key'),
  title: 'Power Generation',
  prefix: 'M',           // SI prefix (k, M, G)
  baseUnit: 'W',
  timeZone: 'Australia/Sydney'
});

// Set data
chart.seriesData = [...];
chart.seriesNames = [...];
chart.seriesColours = { ... };
chart.seriesLabels = { ... };
```

### StratumChart

The main chart component for stacked area/bar charts:

```svelte
<script>
	import { StratumChart } from '$lib/components/charts/v2';
</script>

<StratumChart {chart} height={400} />
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chart` | `ChartStore` | required | The chart store instance |
| `showHeader` | `boolean` | `true` | Whether to show the header |
| `tooltipMode` | `'strip' \| 'floating' \| 'none'` | `'strip'` | See [Tooltip modes](#tooltip-modes) |
| `tooltipDodgeRightPx` | `number` | `0` | Floating mode: width of a top-right UI element to dodge |
| `tooltipInsetPx` | `number` | `0` | Floating mode: horizontal gap kept from container edges |
| `showTooltip` | `boolean` | `true` | **Deprecated** — setting `false` forces `tooltipMode='none'`; prefer `tooltipMode` |
| `showOptions` | `boolean` | `true` | Whether to show options button |
| `defaultTooltipText` | `string` | `''` | Default text when nothing is hovered (strip mode) |
| `class` | `string` | `''` | Additional CSS classes |
| `chartPadding` | `string` | `'px-0'` | CSS classes for chart padding |
| `netTotalKey` | `string` | - | Key for net total values in data (renders step line overlay) |
| `netTotalColor` | `string` | `'#C74523'` | Color for net total line |
| `overlayStart` | `number \| null` | - | Start time (ms) for hatched projection overlay |
| `enablePan` | `boolean` | `false` | Enable pan/zoom gestures (pointer + wheel) via InteractionLayer |
| `loadingRanges` | `Array<{start, end}>` | `[]` | Time ranges currently being fetched (shaded overlay) |
| `viewDomain` | `[number, number] \| null` | `null` | Explicit time domain for InteractionLayer coordinate mapping |
| `resizable` | `boolean` | `false` | Show a vertical resize handle below the chart (`ChartResizeHandle`) |
| `heightStorageKey` | `string` | - | `localStorage` key used by the resize handle to persist height |
| `minHeight` / `maxHeight` | `number` | `120` / `800` | Bounds for the resize handle |
| `onhover` | `(time, key?) => void` | - | Callback when hovering |
| `onhoverend` | `() => void` | - | Callback when hover ends |
| `onfocus` | `(time) => void` | - | Callback when focusing (clicking) |
| `onpanstart` | `() => void` | - | Callback when pan gesture starts |
| `onpan` | `(deltaMs) => void` | - | Callback during pan with time delta (fires for pointer drag **and** horizontal wheel) |
| `onpanend` | `() => void` | - | Callback when pan gesture ends (debounced 150 ms for wheel) |
| `onzoom` | `(factor, centerMs) => void` | - | Callback for zoom (fires for pinch **and** vertical wheel) |
| `onresize` / `onresizeend` | `(height) => void` | - | Called during / after a resize drag |
| `header` | `Snippet` | - | Custom header snippet (replaces ChartHeader) |
| `tooltip` | `Snippet` | - | Custom tooltip snippet — only rendered in `strip` mode |
| `footer` | `Snippet` | - | Footer snippet rendered below the chart |

#### Tooltip modes

`tooltipMode` picks which built-in tooltip StratumChart renders:

- **`strip`** (default) — a fixed 21 px strip above the chart showing the date + the single hovered series + optional total. Consumers can pass a custom `tooltip` Snippet to fully replace the strip content.
- **`floating`** — a cursor-following card overlaid on the chart area. Shows the date as a header, then one row per visible series (colour dot + label + value) with the hovered row subtly tinted. Positions itself beside the crosshair (left/right of the cursor) and flips to the bottom of the chart when the cursor is near the top so the data under the cursor stays visible. Uses `tooltipDodgeRightPx` to avoid overlapping a top-right element like the zoom controls.
- **`none`** — no tooltip rendered. The vertical space normally reserved for the strip is also removed.

The shared derivation logic used by both built-in tooltips (hover/focus precedence, `visibleSeriesNames` total, date formatting for time-based and category charts, per-series row building) lives as pure helpers in [`tooltip-derivations.js`](./tooltip-derivations.js) with `tooltip-derivations.test.js` covering the edge cases.

#### Synced Charts Example

```svelte
<script>
	import { StratumChart, ChartStore, createSyncedCharts } from '$lib/components/charts/v2';

	const chart1 = new ChartStore({ key: Symbol('chart1'), title: 'Region 1' });
	const chart2 = new ChartStore({ key: Symbol('chart2'), title: 'Region 2' });

	const sync = createSyncedCharts([chart1, chart2]);

	function handleHover(time, key) {
		sync.setHover(time, key);
	}

	function handleHoverEnd() {
		sync.clearHover();
	}

	function handleFocus(time) {
		sync.toggleFocus(time);
	}
</script>

<StratumChart
	chart={chart1}
	onhover={handleHover}
	onhoverend={handleHoverEnd}
	onfocus={handleFocus}
/>
<StratumChart
	chart={chart2}
	onhover={handleHover}
	onhoverend={handleHoverEnd}
	onfocus={handleFocus}
/>
```

### DateBrush

A brush component for date range selection:

```svelte
<script>
	import { DateBrush } from '$lib/components/charts/v2';

	let brushedRange = $state(undefined);

	function handleBrush(range) {
		brushedRange = range;
	}
</script>

<DateBrush {chart} {brushedRange} onbrush={handleBrush} height={80} />
```

### IntervalSelector

Toggle between time intervals:

```svelte
<script>
	import { IntervalSelector, INTERVAL_OPTIONS } from '$lib/components/charts/v2';

	let selectedInterval = $state('5m');
</script>

<IntervalSelector
	options={INTERVAL_OPTIONS}
	selected={selectedInterval}
	onchange={(interval) => (selectedInterval = interval)}
/>
```

### ChartZoomControls

Top-right +/- buttons that fade in on parent `group-hover`. Wire to the same `onzoom`-compatible handler used by wheel/pinch:

```svelte
<script>
	import { StratumChart, ChartZoomControls } from '$lib/components/charts/v2';

	const FACTOR = 1.5;
	let zoomButtonsWidth = $state(0);

	function zoomIn() {
		handleZoom(FACTOR, (viewStart + viewEnd) / 2);
	}
	function zoomOut() {
		handleZoom(1 / FACTOR, (viewStart + viewEnd) / 2);
	}
</script>

<div class="group relative">
	<StratumChart
		{chart}
		enablePan
		onzoom={handleZoom}
		tooltipMode="floating"
		tooltipDodgeRightPx={zoomButtonsWidth + 8}
	/>
	<ChartZoomControls onzoomin={zoomIn} onzoomout={zoomOut} bind:width={zoomButtonsWidth} />
</div>
```

Props: `onzoomin`, `onzoomout`, `isAtMinZoom`, `isAtMaxZoom`, `overlayInsetPx`, `width` (bindable). The parent must carry the `group` class so the buttons fade in on hover. Feed `width` into StratumChart's `tooltipDodgeRightPx` so the floating tooltip moves out of the buttons' way.

### ChartRangeBar

A unified toolbar combining range presets, a calendar popover, and an interval dropdown. Designed for the Facility Explorer but reusable with any chart.

```svelte
<script>
	import { ChartRangeBar } from '$lib/components/charts/v2';
</script>

<ChartRangeBar
	selectedRange={3}
	activeMetric="power"
	displayInterval="5m"
	startDate="2026-01-01"
	endDate="2026-02-18"
	minDate="1998-12-01"
	maxDate="2026-02-18"
	earliestDate="2005-06-01"
	onrangeselect={(days) => handleRangeSelect(days)}
	ondaterangechange={(range) => handleDateRangeChange(range)}
	onintervalchange={(interval) => handleIntervalChange(interval)}
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `selectedRange` | `number \| null` | Active preset in days (`null` = custom, `-1` = All) |
| `activeMetric` | `string` | `'power'` or `'energy'` — controls which intervals are shown |
| `displayInterval` | `string` | Current interval (`'5m'`, `'30m'`, `'1d'`, `'1M'`, `'3M'`, `'1y'`) |
| `startDate` | `string \| null` | Start date (YYYY-MM-DD) for the DateRangePicker |
| `endDate` | `string \| null` | End date (YYYY-MM-DD) for the DateRangePicker |
| `minDate` | `string \| null` | Earliest selectable date |
| `maxDate` | `string \| null` | Latest selectable date |
| `earliestDate` | `string \| null` | Earliest data date (used by "All" preset) |
| `onrangeselect` | `(days) => void` | Called when a range preset is clicked |
| `ondaterangechange` | `({start, end}) => void` | Called when dates change via the calendar |
| `onintervalchange` | `(interval) => void` | Called when the interval dropdown changes |

#### Range presets

| Label | Days | Default interval |
|-------|------|-----------------|
| 1D | 1 | power/5m |
| 3D | 3 | power/5m |
| 7D | 7 | power/5m |
| 1M | 30 | energy/1d |
| 6M | 182 | energy/1d |
| 1Y | 365 | energy/3M |
| 5Y | 1825 | energy/3M |
| All | -1 | energy/1y |

#### Interval options by metric

- **Power**: 5 min, 30 min
- **Energy**: Daily, Monthly, Quarterly, Yearly

#### Responsive behavior

- **Desktop** (`sm:` and up): Range buttons as a switcher, calendar icon popover, interval dropdown
- **Mobile** (below `sm:`): Range as dropdown, interval as dropdown, no calendar

---

## Interval Utilities

### aggregateData(data, interval, seriesNames)

Aggregate and average data to a target interval:

```javascript
import { aggregateData } from '$lib/components/charts/v2';

const aggregated = aggregateData(data, '30m', seriesNames);
```

### INTERVAL_OPTIONS

Default interval options for selectors:

```javascript
import { INTERVAL_OPTIONS } from '$lib/components/charts/v2';

// [{ label: '5 min', value: '5m' }, { label: '30 min', value: '30m' }]
```

---

## Synchronization

### createSyncedCharts(charts)

Synchronize multiple charts for linked interactions:

```javascript
import { createSyncedCharts } from '$lib/components/charts/v2';

const chart1 = new ChartStore({ ... });
const chart2 = new ChartStore({ ... });

const sync = createSyncedCharts([chart1, chart2]);
// Hover/focus events now sync across charts
```

#### SyncedChartsController Methods

| Method                 | Description                        |
| ---------------------- | ---------------------------------- |
| `setHover(time, key?)` | Set hover state on all charts      |
| `clearHover()`         | Clear hover state on all charts    |
| `toggleFocus(time)`    | Toggle focus on all charts         |
| `clearFocus()`         | Clear focus on all charts          |
| `resetAll()`           | Reset all interaction states       |
| `addChart(chart)`      | Add a chart to the sync group      |
| `removeChart(chart)`   | Remove a chart from the sync group |
| `destroy()`            | Remove all charts and clean up     |

### Multi-Region Dashboard Example

A complete example showing multiple region charts with synced interactions:

```svelte
<script>
	import {
		ChartStore,
		StratumChart,
		DateBrush,
		IntervalSelector,
		INTERVAL_OPTIONS,
		createSyncedCharts,
		processForChart
	} from '$lib/components/charts/v2';

	let { data } = $props(); // { regions: [...] }

	let selectedInterval = $state('5m');
	let brushedRange = $state(undefined);

	// Create chart stores for each region
	let regionCharts = $derived(
		data.regions.map((r) => ({
			regionData: r,
			chart: new ChartStore({ key: Symbol(r.region), title: r.label })
		}))
	);

	// Create sync controller
	let sync = $derived(createSyncedCharts(regionCharts.map((r) => r.chart)));

	// Sync handlers
	function handleHover(time, key) {
		sync.setHover(time, key);
	}

	function handleHoverEnd() {
		sync.clearHover();
	}

	function handleFocus(time) {
		sync.toggleFocus(time);
	}
</script>

<IntervalSelector
	options={INTERVAL_OPTIONS}
	selected={selectedInterval}
	onchange={(i) => (selectedInterval = i)}
/>

<DateBrush chart={regionCharts[0]?.chart} {brushedRange} onbrush={(r) => (brushedRange = r)} />

{#each regionCharts as { chart }}
	<StratumChart {chart} onhover={handleHover} onhoverend={handleHoverEnd} onfocus={handleFocus} />
{/each}
```

---

## Migration from v1

### Key Differences

| Feature          | v1                   | v2                                 |
| ---------------- | -------------------- | ---------------------------------- |
| Data processing  | `process()` function | `processForChart()` with options   |
| Statistics       | `Statistic` class    | `StatisticV2` with cleaner API     |
| Time series      | `TimeSeries` class   | `TimeSeriesV2` with better methods |
| State management | Various patterns     | Unified `ChartStore`               |

### Migration Example

**Before (v1):**

```javascript
import process from './helpers/process';

const result = process({
	history: data,
	fuelTechMap: myMap,
	fuelTechOrder: myOrder,
	colourReducer: myColours,
	labelReducer: myLabels,
	unit: 'W'
});
```

**After (v2):**

```javascript
import { processForChart } from '$lib/components/charts/v2';

const result = processForChart(data, 'W', {
	groupMap: myMap,
	groupOrder: myOrder,
	colourReducer: myColours,
	labelReducer: myLabels
});
```

---

## Internal Architecture

### Component Hierarchy

```
StratumChart
├── ChartHeader (or custom header snippet)
├── ChartTooltip (or custom tooltip snippet)
├── InteractionLayer                 # HTML div wrapping the chart area
│   │                                # Handles all pointer interactions:
│   │                                # mouse hover, click-to-focus, Cmd+drag pan,
│   │                                # touch hover, tap-to-focus, 2-finger pan/pinch
│   │
│   └── StackedAreaChart             # Time-series chart (scaleTime x axis)
│       └── LayerCake                # Responsive SVG container with scales
│           ├── Shading              # Background shading regions
│           ├── [clipped group]
│           │   ├── StackedArea      # Rendered area/line paths (series-key hover)
│           │   ├── NetTotalLine     # Step line overlay for net total (optional)
│           │   └── HatchOverlay     # Hatched projection overlay (optional)
│           ├── LineY                # Horizontal reference lines
│           ├── StepHoverBand        # Band highlight for step mode
│           ├── LineX / Dot          # Hover/focus indicators for continuous mode
│           ├── AxisX                # Time axis with gridlines
│           ├── AxisY                # Value axis
│           └── LoadingOverlay       # Shaded regions for in-flight fetches
│
└── footer snippet (optional)
```

### Interaction Architecture

All pointer interactions are handled by **InteractionLayer**, an HTML `<div>` that wraps the chart content. This avoids SVG layer stacking issues — a single HTML element captures all gestures, while SVG elements inside remain pointer-passive (except StackedArea, which provides series-key hover).

**InteractionLayer** supports:

| Input | Gesture | Result |
|-------|---------|--------|
| Mouse | Move | Hover: snap to nearest data point, highlight series |
| Mouse | Click | Focus: lock tooltip to clicked time |
| Mouse | Left-button drag | Pan: shift viewport by `deltaPx × msPerPx` (after a 3 px threshold) |
| Mouse | Wheel — vertical | Zoom at cursor: `factor = 1.002^(-deltaY)` |
| Mouse | Wheel — horizontal | Pan: shift viewport, debounced `onpanend` 150 ms after the last tick |
| Touch | 1-finger drag | Hover: track finger position |
| Touch | 1-finger tap | Focus: lock tooltip |
| Touch | 2-finger drag | Pan: shift viewport |
| Touch | 2-finger pinch | Zoom: scale factor anchored to midpoint |

Wheel pan/zoom is a built-in default — it fires the same `onpan` / `onzoom` callbacks as pointer gestures, so any consumer that handles those gets wheel support for free. The classification and deltas are pure helpers in [`wheel-interaction.js`](./wheel-interaction.js) (`classifyWheelIntent`, `wheelPanDeltaMs`, `wheelZoomFactor`) and unit-tested in `wheel-interaction.test.js`.

**Coordinate mapping**: InteractionLayer converts `clientX` to time using the chart's time domain. It resolves the domain from (in order of priority):
1. `viewDomain` prop (explicit, used by FacilityChart)
2. `chart.xDomain` (set by consumer on the ChartStore)
3. `chart.seriesScaledData` first/last `.time` (automatic fallback)

**Time snapping**: Raw pixel-to-time values are snapped to the nearest data point. Step mode uses floor semantics (finds the last data point at or before the raw time); continuous mode uses closest-match via binary search.

**Interaction mode**: InteractionLayer exposes a bindable `interactionMode` state (`'none' | 'hover' | 'mouse-pan' | 'touch-pan'`). StratumChart uses this to suppress StackedArea's SVG-level series hover during pan/zoom gestures.

**StackedArea series hover**: The only SVG-level interaction kept. When the mouse is over a coloured `<path>`, StackedArea emits `onmousemove({ data, key })` which StratumChart uses to "upgrade" the basic time-hover with series highlighting (bold stroke on the hovered series).

### Step Mode

When `chart.chartOptions.selectedCurveType === 'step'`, StackedAreaChart renders with `curveStepAfter` and uses **StepHoverBand** instead of LineX/Dot for hover/focus indicators. This creates a bar-chart-like appearance suitable for interval data (e.g. financial year emissions, hourly energy).

For step mode to draw the final bar, consumers should append a **phantom extension point** — a duplicate of the last data point shifted one interval forward:

```js
const last = data[data.length - 1];
const interval = last.time - data[data.length - 2].time;
const extended = [...data, { ...last, time: last.time + interval }];
```

### Net Total Line & Hatch Overlay

Two optional SVG elements for specialized visualizations:

- **NetTotalLine** (`netTotalKey` prop): Renders a step-after line showing net total values on top of the stacked area. Uses `d3-shape`'s `line()` with `curveStepAfter`. Only renders in step mode.

- **HatchOverlay** (`overlayStart` prop): Renders a hatched rectangle from `overlayStart` (time in ms) to the right edge of the chart. Uses the existing `HatchPattern` SVG def. Useful for marking projection/forecast regions.

### ChartStore

`ChartStore` is a Svelte 5 reactive class (`$state`, `$derived`) that holds all chart configuration and data:

| Property | Description |
|---|---|
| `seriesData` | Raw data rows `[{ date, time, series1, series2, ... }]` |
| `seriesNames` | Ordered list of series keys |
| `seriesColours` | Map: series key -> hex colour |
| `seriesLabels` | Map: series key -> display label |
| `seriesScaledData` | Derived: data with SI-prefix scaling applied |
| `xDomain` | `[start, end]` time domain for the chart |
| `xKey` | Which field to use as x value (default `'date'`) |
| `hoverTime` / `hoverData` | Current hover state (time value / full data row) |
| `focusTime` / `focusData` | Current focus (click-lock) state |
| `hoverKey` | Series key being hovered (for highlight) |
| `yReferenceLines` | Horizontal annotations `[{ value, label, colour }]` |
| `formatTickX` | Custom x-axis tick formatter `(d) => string` |
| `useDivergingStack` | Use d3 diverging offset for independent pos/neg stacking |

### ChartDataManager

`ChartDataManager` is a Svelte 5 reactive class that manages cached time-series data independently from the visible viewport. Used by FacilityChart for client-side data fetching and caching.

```
Server data ──seedCache()──> #dataCache (sorted rows by timestamp)
                                  │
Pan/zoom ───requestRange()──> #computeGaps() ──> #fetchFromApi()
                                  │                    │
                                  │              #mergeProcessedData()
                                  │                    │
                                  └────────────────────┘
                                  │
                       getDataForRange(start, end)
                                  │
                          visible chart data
```

Key behaviors:
- **Gap detection**: Only fetches ranges not already in cache, with overlap buffers scaled by interval (10min for 5m, 1 day for 1d, 31 days for 1M, 92 days for 3M, 365 days for 1y)
- **Interval-aware fetch limits**: Max range per API request scales with interval — 1000 days (default), 1830 days (3M), 3700 days (1y)
- **Date snapping**: Aligns request boundaries to interval periods — midnight for 1d, 1st of month for 1M, quarter start for 3M, Jan 1 for 1y
- **Debounced fetching**: Batches rapid pan movements into single API calls (150ms debounce)
- **Dedup merge**: New data rows overwrite existing ones at the same timestamp, then re-sort
- **Metric-aware**: Accepts `interval` and `metric` config; recreated when these change

---

## File Structure

```
src/lib/components/charts/v2/
├── index.js                    # Main exports
├── README.md                   # This file
│
├── ChartStore.svelte.js        # Chart state management (runes)
├── ChartOptions.svelte.js      # Chart type/transform options
├── ChartStyles.svelte.js       # Style configurations
├── ChartTooltips.svelte.js     # Tooltip state
├── ChartDataManager.svelte.js  # Client-side data cache/fetcher
│
├── StratumChart.svelte         # Wrapper: header + tooltip + InteractionLayer + chart
├── StackedAreaChart.svelte     # Stacked area / line time-series chart
├── BarChart.svelte             # Stacked-bar chart
├── GroupedBarChart.svelte      # Grouped bar chart
├── ChartHeader.svelte          # Title + options row above the chart
├── ChartControls.svelte        # Chart type / transform toggles
├── ChartTooltip.svelte         # Built-in "strip" tooltip above the chart
├── ChartTooltipFloating.svelte # Built-in "floating" all-series card overlaid on the chart
├── ChartZoomControls.svelte    # +/- zoom buttons (top-right, hover-reveal)
├── ChartResizeHandle.svelte    # Vertical resize handle below the chart
├── ChartRangeBar.svelte        # Unified toolbar: range presets + calendar + interval dropdown
├── DateBrush.svelte            # Date range brush selector
├── IntervalSelector.svelte     # Interval toggle
│
├── dataProcessing.js           # Data processing utilities
├── chart-families.js           # Chart-type family metadata (stacked-area, bar, etc.)
├── compute-y-domain.js         # Y-domain computation for single/dual axes
├── energy-gridlines.js         # Gridline tick computation for energy intervals
├── formatters.js               # Axis / tick formatters
├── intervalConfig.js           # Interval/metric/curve definitions
├── intervals.js                # Interval utilities
├── presets.js                  # Chart presets
├── sync.js                     # Multi-chart synchronization
├── tooltip-derivations.js      # Pure helpers shared by both tooltip components
├── wheel-interaction.js        # Pure wheel→pan/zoom math (used by InteractionLayer)
│
├── *.test.js                   # Vitest unit tests co-located with each module
│
└── elements/                   # Low-level SVG/HTML components
    ├── index.js                # Element exports
    ├── InteractionLayer.svelte # HTML-level unified interaction handler (hover, click, pan, zoom, wheel)
    ├── StackedArea.svelte      # Stacked area/line paths (series-key hover)
    ├── Area.svelte             # Single-series area path
    ├── GroupedBar.svelte       # Grouped-bar rect group
    ├── StackedBar.svelte       # Stacked-bar rect group
    ├── NetTotalLine.svelte     # Step-after line for net total overlay
    ├── HatchOverlay.svelte     # Hatched projection overlay region
    ├── StepHoverBand.svelte    # Band highlight for step mode hover/focus
    ├── AxisX.svelte            # Time axis with gridlines
    ├── AxisY.svelte            # Value axis with gridlines
    ├── ClipPath.svelte         # SVG clip path definition
    ├── Dot.svelte              # Hover/focus dot indicator
    ├── Line.svelte             # General line element
    ├── LineX.svelte            # Vertical line (hover/focus)
    ├── LineY.svelte            # Horizontal line (reference)
    ├── LoadingOverlay.svelte   # Shaded loading indicator
    └── Shading.svelte          # Background shading regions

src/lib/utils/
├── Statistic/
│   ├── index.js                # Original Statistic class
│   └── v2.js                   # StatisticV2 class
└── TimeSeries/
    ├── index.js                # Original TimeSeries class
    └── v2.js                   # TimeSeriesV2 class
```
