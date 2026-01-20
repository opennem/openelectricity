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

## File Structure

```
src/lib/components/charts/v2/
├── index.js                 # Main exports
├── README.md                # This file
├── ChartStore.svelte.js     # Chart state management
├── ChartOptions.svelte.js   # Chart options store
├── ChartStyles.svelte.js    # Style configurations
├── ChartTooltips.svelte.js  # Tooltip state
├── StratumChart.svelte      # Main chart component
├── StackedAreaChart.svelte  # Alternative chart type
├── DateBrush.svelte         # Date range selector
├── IntervalSelector.svelte  # Interval toggle
├── dataProcessing.js        # Data processing utilities
├── intervals.js             # Interval utilities
├── sync.js                  # Chart synchronization
└── presets.js               # Chart presets

src/lib/utils/
├── Statistic/
│   ├── index.js             # Original Statistic class
│   └── v2.js                # StatisticV2 class
└── TimeSeries/
    ├── index.js             # Original TimeSeries class
    └── v2.js                # TimeSeriesV2 class
```
