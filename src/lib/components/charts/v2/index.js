/**
 * Chart v2 Module
 *
 * A refactored chart system with:
 * - Better type definitions
 * - Cleaner API surface
 * - Configurable timezone
 * - Improved synchronization support
 */

// Core stores
export { default as ChartStore } from './ChartStore.svelte.js';
export { default as ChartOptions } from './ChartOptions.svelte.js';
export { default as ChartStyles } from './ChartStyles.svelte.js';
export { default as ChartTooltips } from './ChartTooltips.svelte.js';

// Components
export { default as StratumChart } from './StratumChart.svelte';
export { default as StackedAreaChart } from './StackedAreaChart.svelte';
export { default as ChartHeader } from './ChartHeader.svelte';
export { default as ChartTooltip } from './ChartTooltip.svelte';
export { default as ChartControls } from './ChartControls.svelte';

// Presets
export {
	powerChartPreset,
	energyChartPreset,
	emissionsChartPreset,
	intensityChartPreset,
	priceChartPreset,
	temperatureChartPreset,
	percentageChartPreset,
	createPreset,
	applyPreset
} from './presets.js';

// Synchronization utilities
export {
	createSyncedCharts,
	createSyncedHoverHandler,
	createSyncedFocusHandler,
	createSyncedClearHoverHandler,
	syncDataTransformType,
	syncChartType,
	syncCurveType
} from './sync.js';

// Brush and interval components
export { default as DateBrush } from './DateBrush.svelte';
export { default as IntervalSelector } from './IntervalSelector.svelte';

// Interval utilities
export {
	INTERVAL_OPTIONS,
	parseIntervalMs,
	aggregateData,
	aggregateToInterval,
	averageAggregatedData,
	detectInterval,
	needsAggregation
} from './intervals.js';

// Data processing utilities
export {
	processData,
	processForChart,
	filterByDateRange,
	createProcessor,
	StatisticV2,
	TimeSeriesV2
} from './dataProcessing.js';

// Chart elements (v2)
export {
	StackedArea,
	Line,
	HoverLayer,
	AxisX,
	AxisY,
	LineX,
	Dot,
	ClipPath
} from './elements';
