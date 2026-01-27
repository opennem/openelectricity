<script>
	/**
	 * Lens on Emissions
	 *
	 * Displays Australian emissions data by sector with options to toggle
	 * historical data (FY 1990-2004) and future projections (FY 2026-2040).
	 */

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import {
		aggregateToYearly,
		filterByFYRange,
		mergeData
	} from './helpers/csv-parser.js';
	import {
		SECTOR_ORDER,
		SECTOR_COLORS,
		SECTOR_LABELS,
		TIME_RANGES
	} from './helpers/config.js';
	import { formatFYRange } from './helpers/financial-year.js';
	import TimeRangeControls from './components/TimeRangeControls.svelte';
	import EmissionsLegend from './components/EmissionsLegend.svelte';
	import { NET_TOTAL_COLOR } from './helpers/config.js';

	/**
	 * @typedef {import('./helpers/csv-parser.js').EmissionsDataPoint} EmissionsDataPoint
	 */

	/** @type {{ data: { quarterlyData: EmissionsDataPoint[], projectionsData: EmissionsDataPoint[] } }} */
	let { data } = $props();

	// ============================================
	// State
	// ============================================

	/** @type {'quarter' | 'year'} */
	let intervalType = $state(/** @type {'quarter' | 'year'} */ ('year'));

	/** @type {boolean} */
	let showHistory = $state(false);

	/** @type {boolean} */
	let showProjections = $state(false);

	// ============================================
	// Chart Store Instance
	// ============================================

	const chart = new ChartStore({
		key: Symbol('emissions-chart'),
		title: 'Emissions Volume',
		prefix: 'M',
		displayPrefix: 'M',
		baseUnit: 'tCO\u2082e',
		chartType: 'area',
		timeZone: 'Australia/Sydney',
		hideDataOptions: true,
		hideChartTypeOptions: true
	});

	// Set the curve type to stepAfter
	chart.chartOptions.selectedCurveType = 'stepAfter';

	// Set chart height
	chart.chartStyles.chartHeightClasses = 'h-[400px]';

	// ============================================
	// Derived Data
	// ============================================

	/**
	 * Process quarterly data based on interval type
	 */
	let processedQuarterlyData = $derived.by(() => {
		const quarterly = data.quarterlyData;

		if (intervalType === 'quarter') {
			// Return quarterly data filtered to current period
			return filterByFYRange(
				quarterly,
				TIME_RANGES.CURRENT_START_FY,
				TIME_RANGES.CURRENT_END_FY
			);
		}

		// Aggregate to yearly
		const yearly = aggregateToYearly(quarterly);
		return filterByFYRange(
			yearly,
			TIME_RANGES.CURRENT_START_FY,
			TIME_RANGES.CURRENT_END_FY
		);
	});

	/**
	 * Get historical data from projections (FY 1990-2004)
	 */
	let historicalData = $derived.by(() => {
		if (!showHistory || intervalType === 'quarter') return [];
		return filterByFYRange(
			data.projectionsData,
			TIME_RANGES.HISTORY_START_FY,
			TIME_RANGES.HISTORY_END_FY
		);
	});

	/**
	 * Get projection data (FY 2026-2040)
	 */
	let projectionData = $derived.by(() => {
		if (!showProjections) return [];
		return filterByFYRange(
			data.projectionsData,
			TIME_RANGES.PROJECTION_START_FY,
			TIME_RANGES.PROJECTION_END_FY
		);
	});

	/**
	 * Merge all data sources
	 */
	let chartData = $derived.by(() => {
		return mergeData(historicalData, processedQuarterlyData, projectionData);
	});

	/**
	 * Calculate the date range for display
	 */
	let dateRangeTitle = $derived.by(() => {
		let startFY = TIME_RANGES.CURRENT_START_FY;
		let endFY = TIME_RANGES.CURRENT_END_FY;

		if (showHistory && intervalType === 'year') {
			startFY = TIME_RANGES.HISTORY_START_FY;
		}

		if (showProjections) {
			endFY = TIME_RANGES.PROJECTION_END_FY;
		}

		return formatFYRange(startFY, endFY);
	});

	/**
	 * History toggle should be disabled in quarter mode
	 */
	let isHistoryDisabled = $derived(intervalType === 'quarter');

	// ============================================
	// Effects - Update Chart
	// ============================================

	$effect(() => {
		if (!chartData.length) return;

		// Update chart store with data
		chart.seriesData = chartData;
		chart.seriesNames = SECTOR_ORDER;
		chart.seriesColours = SECTOR_COLORS;
		chart.seriesLabels = SECTOR_LABELS;
		chart.formatTickX = formatXAxis;
	});

	// ============================================
	// Formatters
	// ============================================

	/**
	 * Format date for X axis ticks
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatXAxis(d) {
		if (!(d instanceof Date)) return String(d);
		const year = d.getFullYear();
		return `FY ${year}`;
	}

	// ============================================
	// Event Handlers
	// ============================================

	/**
	 * Handle interval type change
	 * @param {'quarter' | 'year'} type
	 */
	function handleIntervalChange(type) {
		intervalType = type;
		// Reset showHistory when switching to quarter mode (history only available in year mode)
		if (type === 'quarter') {
			showHistory = false;
		}
	}

	// Check if data is ready
	let isDataReady = $derived(chartData.length > 0);

	/**
	 * Get the data for the legend (hovered data or latest data point)
	 * @type {Record<string, number> | null}
	 */
	let legendData = $derived.by(() => {
		// Use hovered/focused data if available
		const displayData = chart.hoverData || chart.focusData;
		if (displayData) return /** @type {Record<string, number>} */ (displayData);

		// Fall back to the latest data point
		if (chartData.length > 0) {
			return /** @type {Record<string, number>} */ (chartData[chartData.length - 1]);
		}
		return null;
	});
</script>

<svelte:head>
	<title>Lens on Emissions</title>
</svelte:head>

<div class="p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Lens on Emissions</h1>
		<p class="text-sm text-mid-warm-grey">{dateRangeTitle}</p>
	</header>

	<!-- Controls -->
	<div class="mb-6">
		<TimeRangeControls
			{intervalType}
			{showHistory}
			{showProjections}
			{isHistoryDisabled}
			onIntervalChange={handleIntervalChange}
			onHistoryChange={(show) => (showHistory = show)}
			onProjectionsChange={(show) => (showProjections = show)}
		/>
	</div>

	{#if !isDataReady}
		<!-- Loading state -->
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center gap-3 text-mid-warm-grey">
				<svg
					class="animate-spin h-5 w-5"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span>Loading emissions data...</span>
			</div>
		</div>
	{:else}
		<!-- Emissions Chart and Legend -->
		<div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
			<!-- Chart -->
			<div class="border border-light-warm-grey rounded-lg p-4">
				<StratumChart {chart} />
			</div>

			<!-- Legend -->
			<div class="border border-light-warm-grey rounded-lg">
				<EmissionsLegend
					sectors={SECTOR_ORDER}
					sectorColors={SECTOR_COLORS}
					sectorLabels={SECTOR_LABELS}
					data={legendData}
					netTotalColor={NET_TOTAL_COLOR}
				/>
			</div>
		</div>
	{/if}
</div>
