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

| Prop                 | Type                   | Default  | Description                          |
| -------------------- | ---------------------- | -------- | ------------------------------------ |
| `chart`              | `ChartStore`           | required | The chart store instance             |
| `showHeader`         | `boolean`              | `true`   | Whether to show the header           |
| `showTooltip`        | `boolean`              | `true`   | Whether to show the tooltip          |
| `showOptions`        | `boolean`              | `true`   | Whether to show options button       |
| `defaultTooltipText` | `string`               | `''`     | Default text when nothing is hovered |
| `class`              | `string`               | `''`     | Additional CSS classes               |
| `chartPadding`       | `string`               | `'px-0'` | CSS classes for chart padding        |
| `height`             | `number`               | -        | Chart height in pixels               |
| `onhover`            | `(time, key?) => void` | -        | Callback when hovering               |
| `onhoverend`         | `() => void`           | -        | Callback when hover ends             |
| `onfocus`            | `(time) => void`       | -        | Callback when focusing (clicking)    |

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
├── ChartHeader              # Title, options menu
├── ChartTooltip             # Hover/focus value display
└── [chart mode routing]
    ├── StackedAreaChart      # Time-series (continuous x axis)
    │   ├── LayerCake         # Responsive SVG container, scales
    │   │   ├── HoverLayer    # Transparent rect for mouse events in empty space
    │   │   ├── PanZoomLayer  # Drag-to-pan, pinch-to-zoom (optional)
    │   │   ├── StackedArea   # Rendered area/line paths
    │   │   ├── LineY         # Horizontal reference lines
    │   │   ├── LineX / Dot   # Hover/focus indicators
    │   │   ├── AxisX         # Time axis with gridlines
    │   │   └── AxisY         # Value axis
    │   └── LoadingOverlay    # Shaded regions for in-flight fetches
    │
    └── StackedCategoryChart  # Discrete categories (band x axis)
        └── LayerCake         # xDomain [0, 100] with band scale
            ├── StackedArea         # Rendered area paths (step curves)
            ├── CategoryLine        # Optional net-total overlay line
            ├── CategoryOverlay     # Hatched projection overlay
            ├── LineY               # Horizontal reference lines
            ├── CategoryHoverLayer  # Visual highlight/focus rects
            ├── PanZoomLayer        # Drag-to-pan with event forwarding (optional)
            ├── CategoryAxisX       # Band axis with auto-thinned labels
            └── AxisY               # Value axis
```

### Chart Mode Routing

StratumChart routes between two chart implementations based on `chart.isCategoryChart`:

| | StackedAreaChart | StackedCategoryChart |
|---|---|---|
| **X scale** | `scaleTime()` with `xDomain: [startMs, endMs]` | `scaleBand()` mapped to `[0, 100]` range |
| **X accessor** | `d => d.date` (Date objects) | `d => d._bandX` (band position 0-100) |
| **xKey** | `'date'` (default) | Set by consumer (e.g. `'time'` for unique timestamps) |
| **Curve types** | `straight`, `step`, `monotone` | Typically `step` for block/bar appearance |
| **Pan/zoom** | Via `PanZoomLayer` using `xScale.invert()` | Via `PanZoomLayer` using `viewDomain` prop |
| **Hover** | `HoverLayer` + `StackedArea` mouse events | `CategoryHoverLayer` (or forwarded through `PanZoomLayer`) |
| **Axis** | `AxisX` with tick/gridline arrays | `CategoryAxisX` with auto-thinned labels |

### Pan and Zoom

Pan/zoom is handled by `PanZoomLayer`, a transparent SVG rect that captures pointer events. It supports three input methods:

1. **Drag-to-pan** -- Pointer down + move. Computes a `deltaMs` (time shift per pixel of drag) and emits `onpan(deltaMs)`. Uses `requestAnimationFrame` throttling.

2. **Pinch-to-zoom** -- Two-pointer gesture. Computes a scale `factor` and center time, emits `onzoom(factor, centerMs)`.

3. **Wheel zoom** -- Handled at the container `div` level (not inside SVG) with `Cmd`/`Ctrl` modifier. Attached imperatively with `{ passive: false }` so `preventDefault()` works.

#### Time-series vs Category pan

For time-series charts, PanZoomLayer reads `xScale.domain()` (Date objects) to compute `msPerPx`:

```
msPerPx = (domain[1].getTime() - domain[0].getTime()) / chartWidthPx
```

For category charts, the x scale is `[0, 100]` (not time-based). Instead, PanZoomLayer accepts a `viewDomain: [number, number]` prop -- the actual time range `[viewStart, viewEnd]` -- and computes:

```
msPerPx = (viewDomain[1] - viewDomain[0]) / chartWidthPx
```

The consuming component (e.g. FacilityChart) manages `viewStart`/`viewEnd` state and updates the chart data accordingly.

#### Event layering with pan

When pan is enabled on a category chart, PanZoomLayer sits on top of CategoryHoverLayer in the SVG stacking order. Since only the topmost SVG element receives pointer events, PanZoomLayer forwards mouse events (when not actively panning) through callback props:

```
PanZoomLayer (top)         -- captures pointerdown for pan
  onmousemove forwarding   -- when not panning, forwards to parent
  onmouseout forwarding    -- always forwards
  onpointerup forwarding   -- when not panning (i.e. a click)

CategoryHoverLayer (below) -- renders visual highlight/focus rects only
                              interaction handlers disabled when pan is on
```

### ChartStore

`ChartStore` is a Svelte 5 reactive class (`$state`, `$derived`) that holds all chart configuration and data:

| Property | Description |
|---|---|
| `seriesData` | Raw data rows `[{ date, time, series1, series2, ... }]` |
| `seriesNames` | Ordered list of series keys |
| `seriesColours` | Map: series key -> hex colour |
| `seriesLabels` | Map: series key -> display label |
| `seriesScaledData` | Derived: data with SI-prefix scaling applied |
| `xDomain` | `[start, end]` for time-series charts |
| `xKey` | Which field to use as x value (default `'date'`, use `'time'` for category charts with timestamps) |
| `isCategoryChart` | Route to StackedCategoryChart instead of StackedAreaChart |
| `hoverData` / `hoverCategory` | Current hover state (time-series / category) |
| `focusData` / `focusCategory` | Current focus (click-lock) state |
| `yReferenceLines` | Horizontal annotations `[{ value, label, colour }]` |
| `formatTickX` | Custom x-axis tick formatter `(d) => string` |

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
- **Gap detection**: Only fetches ranges not already in cache, with overlap buffers scaled by interval (10min for 5m, 1 day for 1d)
- **Debounced fetching**: Batches rapid pan movements into single API calls (150ms debounce)
- **Dedup merge**: New data rows overwrite existing ones at the same timestamp, then re-sort
- **Metric-aware**: Accepts `interval` and `metric` config; recreated when these change

### CategoryAxisX

Renders the x axis for band-scale charts. Automatically thins labels, gridlines, and tick marks when the viewport is too narrow:

```js
const bandwidthPixels = chartWidth / categories.length;
const skip = Math.ceil(minLabelWidth / bandwidthPixels);
// Only show every `skip`-th label/gridline
```

Labels are centered within each band (between gridlines), matching the block/step visual style. Uses index-based `{#each}` keys to handle non-unique category values (e.g. date labels that repeat across year boundaries).

---

## File Structure

```
src/lib/components/charts/v2/
├── index.js                    # Main exports
├── README.md                   # This file
├── ChartStore.svelte.js        # Chart state management (runes)
├── ChartOptions.svelte.js      # Chart type/transform options
├── ChartStyles.svelte.js       # Style configurations
├── ChartTooltips.svelte.js     # Tooltip state
├── ChartDataManager.svelte.js  # Client-side data cache/fetcher
├── StratumChart.svelte         # Router: header + tooltip + chart mode
├── StackedAreaChart.svelte     # Time-series chart (continuous x)
├── StackedCategoryChart.svelte # Category chart (band x)
├── DateBrush.svelte            # Date range brush selector
├── IntervalSelector.svelte     # Interval toggle
├── dataProcessing.js           # Data processing utilities
├── intervalConfig.js           # Interval/metric/curve definitions
├── intervals.js                # Interval utilities
├── sync.js                     # Multi-chart synchronization
├── presets.js                  # Chart presets
│
└── elements/                   # Low-level SVG components
    ├── AxisX.svelte            # Time axis with gridlines
    ├── AxisY.svelte            # Value axis with gridlines
    ├── CategoryAxisX.svelte    # Band axis with auto-thinned labels
    ├── CategoryHoverLayer.svelte # Category highlight/focus rects
    ├── CategoryLine.svelte     # Overlay line on category chart
    ├── CategoryOverlay.svelte  # Hatched overlay region
    ├── ClipPath.svelte         # SVG clip path definition
    ├── Dot.svelte              # Hover/focus dot indicator
    ├── HoverLayer.svelte       # Time-series mouse event layer
    ├── Line.svelte             # General line element
    ├── LineX.svelte            # Vertical line (hover/focus)
    ├── LineY.svelte            # Horizontal line (reference)
    ├── LoadingOverlay.svelte   # Shaded loading indicator
    ├── PanZoomLayer.svelte     # Drag-to-pan + pinch-to-zoom
    ├── Shading.svelte          # Background shading regions
    ├── StackedArea.svelte      # Stacked area/line paths
    └── index.js                # Element exports

src/lib/utils/
├── Statistic/
│   ├── index.js                # Original Statistic class
│   └── v2.js                   # StatisticV2 class
└── TimeSeries/
    ├── index.js                # Original TimeSeries class
    └── v2.js                   # TimeSeriesV2 class
```
