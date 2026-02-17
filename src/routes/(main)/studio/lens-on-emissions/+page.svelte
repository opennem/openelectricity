<script>
	/**
	 * Lens on Emissions
	 *
	 * Displays Australian emissions data by sector with options to toggle
	 * historical data (FY 1990-2004) and future projections (FY 2026-2040).
	 */

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { aggregateToYearly, filterByFYRange, mergeData } from './helpers/csv-parser.js';
	import { SECTOR_ORDER, SECTOR_COLORS, SECTOR_LABELS, TIME_RANGES } from './helpers/config.js';
	import { getFinancialYear, fyStartDate } from './helpers/financial-year.js';
	import TimeRangeControls from './components/TimeRangeControls.svelte';
	import EmissionsLegend from './components/EmissionsLegend.svelte';
	import SectorSparklines from './components/SectorSparklines.svelte';
	import EmissionsDataTable from './components/EmissionsDataTable.svelte';
	import SectorComparisonBars from './components/SectorComparisonBars.svelte';
	import CategoryBrush from './components/CategoryBrush.svelte';
	import { NET_TOTAL_COLOR } from './helpers/config.js';

	/**
	 * @typedef {import('./helpers/csv-parser.js').EmissionsDataPoint} EmissionsDataPoint
	 */

	/** @type {{ data: { quarterlyData: EmissionsDataPoint[], projectionsData: EmissionsDataPoint[] } }} */
	let { data } = $props();

	// ============================================
	// URL Query Parameter Helpers
	// ============================================

	/**
	 * Parse initial state from URL query parameters
	 */
	function getInitialInterval() {
		const param = $page.url.searchParams.get('interval');
		return param === 'quarter' ? 'quarter' : 'year';
	}

	function getInitialHistory() {
		return $page.url.searchParams.get('history') === 'true';
	}

	function getInitialProjections() {
		return $page.url.searchParams.get('projections') === 'true';
	}

	function getInitialRollingSum() {
		const param = $page.url.searchParams.get('rolling');
		// Default to true in quarter mode (unless explicitly set to false)
		if (param === null) return true;
		return param === 'true';
	}

	/**
	 * Update URL with current state (without navigation)
	 * Uses untrack to avoid reactive dependency on $page
	 */
	function updateURL() {
		untrack(() => {
			const url = new URL($page.url);

			// Set interval (only if not default)
			if (intervalType === 'quarter') {
				url.searchParams.set('interval', 'quarter');
			} else {
				url.searchParams.delete('interval');
			}

			// Set history (only if true)
			if (showHistory) {
				url.searchParams.set('history', 'true');
			} else {
				url.searchParams.delete('history');
			}

			// Set projections (only if true)
			if (showProjections) {
				url.searchParams.set('projections', 'true');
			} else {
				url.searchParams.delete('projections');
			}

			// Set rolling sum (in quarter mode: omit if true/default, set false if off)
			if (intervalType === 'quarter') {
				if (useRollingSum) {
					url.searchParams.delete('rolling'); // true is default, omit from URL
				} else {
					url.searchParams.set('rolling', 'false');
				}
			} else {
				url.searchParams.delete('rolling');
			}

			goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
		});
	}

	// ============================================
	// State (initialized from URL query parameters)
	// ============================================

	// Get initial values from URL
	const initialInterval = getInitialInterval();

	/** @type {'quarter' | 'year'} */
	let intervalType = $state(initialInterval);

	// History and projections are only valid in year mode
	/** @type {boolean} */
	let showHistory = $state(initialInterval === 'year' && getInitialHistory());

	/** @type {boolean} */
	let showProjections = $state(initialInterval === 'year' && getInitialProjections());

	// Rolling sum is only valid in quarter mode
	/** @type {boolean} */
	let useRollingSum = $state(initialInterval === 'quarter' && getInitialRollingSum());

	// Brush zoom state (index range)
	/** @type {[number, number] | undefined} */
	let brushedRange = $state(undefined);

	// Toggle between chart and table view
	/** @type {'chart' | 'table'} */
	let viewMode = $state('chart');

	// Hidden sectors (toggled via legend)
	/** @type {Set<string>} */
	let hiddenSectors = $state(new Set());

	/**
	 * Toggle a sector's visibility
	 * @param {string} sector
	 */
	function toggleSector(sector) {
		const newHidden = new Set(hiddenSectors);
		if (newHidden.has(sector)) {
			newHidden.delete(sector);
		} else {
			newHidden.add(sector);
		}
		hiddenSectors = newHidden;
	}

	// Visible sectors (sectors not hidden)
	let visibleSectors = $derived(SECTOR_ORDER.filter((s) => !hiddenSectors.has(s)));

	// Sync URL when state changes (using untrack to avoid circular updates)
	$effect(() => {
		// Track all state variables
		const _interval = intervalType;
		const _history = showHistory;
		const _projections = showProjections;
		const _rolling = useRollingSum;

		// Update URL with current state
		updateURL();
	});

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

	// Set the curve type to step
	chart.chartOptions.selectedCurveType = 'step';

	// Use divergent stacking for positive/negative values
	chart.useDivergingStack = true;

	// Set chart height
	chart.chartStyles.chartHeightClasses = 'h-[400px]';

	// ============================================
	// Derived Data
	// ============================================

	/**
	 * Format a date as quarter label (e.g., "Q1 06", "Q2 06")
	 * Calendar year quarters: Mar=Q1, Jun=Q2, Sep=Q3, Dec=Q4
	 * @param {Date} date
	 * @returns {string}
	 */
	function formatQuarterLabel(date) {
		const month = date.getMonth(); // 0-indexed
		// Map month to calendar quarter number
		// Mar (2) = Q1, Jun (5) = Q2, Sep (8) = Q3, Dec (11) = Q4
		/** @type {Record<number, number>} */
		const quarterMap = { 2: 1, 5: 2, 8: 3, 11: 4 };
		const quarter = quarterMap[month] ?? 1;
		const year = String(date.getFullYear()).slice(-2);
		return `Q${quarter} ${year}`;
	}

	/**
	 * Calculate rolling 4-quarter (yearly) sum for each data point
	 * @param {EmissionsDataPoint[]} quarterlyData - Sorted quarterly data
	 * @returns {EmissionsDataPoint[]}
	 */
	function calculateRollingYearlySum(quarterlyData) {
		if (quarterlyData.length < 4) return quarterlyData;

		return quarterlyData.map((current, index) => {
			if (index < 3) {
				// Not enough previous quarters for a full year
				return current;
			}

			// Sum current + previous 3 quarters for each sector
			const rollingPoint = { ...current };

			for (const sector of SECTOR_ORDER) {
				let sum = 0;
				for (let i = 0; i < 4; i++) {
					sum += Number(quarterlyData[index - i][sector]) || 0;
				}
				// @ts-ignore - dynamic sector assignment
				rollingPoint[sector] = sum;
			}

			// Recalculate net total
			rollingPoint.net_total = SECTOR_ORDER.reduce(
				(sum, sector) => sum + (Number(rollingPoint[sector]) || 0),
				0
			);

			return rollingPoint;
		});
	}

	/**
	 * Process quarterly data based on interval type
	 */
	let processedQuarterlyData = $derived.by(() => {
		const quarterly = data.quarterlyData;

		if (intervalType === 'quarter') {
			// Filter to current period
			const filtered = filterByFYRange(
				quarterly,
				TIME_RANGES.CURRENT_START_FY,
				TIME_RANGES.CURRENT_END_FY
			);

			// Apply rolling sum if enabled
			const processed = useRollingSum ? calculateRollingYearlySum(filtered) : filtered;

			// Skip first 3 quarters if rolling sum (incomplete data)
			const startIndex = useRollingSum ? 3 : 0;
			return processed.slice(startIndex);
		}

		// Aggregate to yearly (exclude incomplete years)
		const yearly = aggregateToYearly(quarterly, { completeYearsOnly: true });
		return filterByFYRange(yearly, TIME_RANGES.CURRENT_START_FY, TIME_RANGES.CURRENT_END_FY);
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
	 * Merge all data sources (full unfiltered data for brush)
	 * In quarter mode, skip merging since it deduplicates by FY (losing 3 of 4 quarters)
	 */
	let fullChartData = $derived.by(() => {
		if (intervalType === 'quarter') {
			// In quarter mode, just return the quarterly data directly
			return processedQuarterlyData;
		}
		return mergeData(historicalData, processedQuarterlyData, projectionData);
	});

	/**
	 * Apply brush filter to get zoomed chart data
	 */
	let chartData = $derived.by(() => {
		if (!brushedRange || brushedRange[0] === brushedRange[1]) {
			return fullChartData;
		}
		const [startIdx, endIdx] = brushedRange;
		return fullChartData.slice(startIdx, endIdx + 1);
	});

	/**
	 * Calculate the date range for display
	 */
	let dateRangeTitle = $derived.by(() => {
		let startFY = TIME_RANGES.CURRENT_START_FY;
		// Use 2025 as end year (last complete year) unless projections enabled
		let endFY = 2025;

		if (showHistory && intervalType === 'year') {
			startFY = TIME_RANGES.HISTORY_START_FY;
		}

		if (showProjections) {
			endFY = TIME_RANGES.PROJECTION_END_FY;
		}

		// Year view: "FY 2005 – 2025", Quarter view: "2005 – 2025"
		const range =
			intervalType === 'year' ? `FY ${startFY} \u2014 ${endFY}` : `${startFY} \u2014 ${endFY}`;

		// Add rolling year indicator for quarter view
		if (useRollingSum && intervalType === 'quarter') {
			return `${range} · Rolling Year`;
		}

		return range;
	});

	// ============================================
	// Effects - Update Chart
	// ============================================

	/**
	 * Extend data with a phantom point one interval after the last data point.
	 * This ensures curveStepAfter draws the final bar.
	 */
	let extendedChartData = $derived.by(() => {
		if (chartData.length < 2) return chartData;
		const last = chartData[chartData.length - 1];
		const prev = chartData[chartData.length - 2];
		const interval = last.time - prev.time;
		return [
			...chartData,
			{
				...last,
				date: new Date(last.time + interval),
				time: last.time + interval
			}
		];
	});

	$effect(() => {
		if (!extendedChartData.length) return;

		// Update chart store with data
		chart.seriesData = extendedChartData;
		chart.seriesNames = visibleSectors;
		chart.seriesColours = SECTOR_COLORS;
		chart.seriesLabels = SECTOR_LABELS;

		// Set formatter based on interval type (xScale is scaleTime, ticks are Date objects)
		if (intervalType === 'quarter') {
			chart.formatTickX = (/** @type {Date} */ d) => formatQuarterLabel(d);
			chart.formatX = useRollingSum
				? (/** @type {Date} */ d) => `Year to ${formatQuarterLabel(d)}`
				: (/** @type {Date} */ d) => formatQuarterLabel(d);
		} else {
			chart.formatTickX = (/** @type {Date} */ d) => `FY ${getFinancialYear(d)}`;
			chart.formatX = (/** @type {Date} */ d) => `FY ${getFinancialYear(d)}`;
		}
	});

	// ============================================
	// Event Handlers
	// ============================================

	/**
	 * Handle interval type change
	 * @param {'quarter' | 'year'} type
	 */
	function handleIntervalChange(type) {
		intervalType = type;
		// Reset brush when changing intervals
		brushedRange = undefined;
		// Clear focus when changing intervals
		chart.clearFocus();
		// Reset options based on mode
		if (type === 'quarter') {
			// History and projections only available in year mode
			showHistory = false;
			showProjections = false;
			// Default rolling sum ON in quarter mode
			useRollingSum = true;
		} else {
			// Rolling sum only available in quarter mode
			useRollingSum = false;
		}
	}

	/**
	 * Handle brush change
	 * @param {[number, number] | undefined} range
	 */
	function handleBrushChange(range) {
		brushedRange = range;
	}

	// Reset brush when data source changes (history/projections toggled)
	$effect(() => {
		// Track these values to reset brush when they change
		const _history = showHistory;
		const _projections = showProjections;
		const _rolling = useRollingSum;

		// Reset brush (use untrack to avoid circular dependency)
		untrack(() => {
			brushedRange = undefined;
		});
	});

	// Check if data is ready
	let isDataReady = $derived(chartData.length > 0);

	/**
	 * Calculate summed emissions for all sectors across all data points
	 * @type {Record<string, number>}
	 */
	let summedData = $derived.by(() => {
		if (chartData.length === 0) return {};

		/** @type {Record<string, number>} */
		const sums = {};
		for (const sector of SECTOR_ORDER) {
			sums[sector] = chartData.reduce(
				(sum, d) => sum + (Number(/** @type {any} */ (d)[sector]) || 0),
				0
			);
		}
		return sums;
	});

	/**
	 * Get the data for the legend (focused > hovered > summed totals)
	 * Focus takes precedence to maintain persistence when clicking
	 * @type {Record<string, number> | null}
	 */
	let legendData = $derived.by(() => {
		// Focus takes precedence (persists after click)
		if (chart.focusData) return /** @type {Record<string, number>} */ (chart.focusData);

		// Then hover
		if (chart.hoverData) return /** @type {Record<string, number>} */ (chart.hoverData);

		// Fall back to summed data across all years
		if (Object.keys(summedData).length > 0) {
			return summedData;
		}
		return null;
	});

	/**
	 * Get the label for the currently focused/hovered/total period
	 */
	let legendLabel = $derived.by(() => {
		const time = chart.focusTime ?? chart.hoverTime;
		if (time !== undefined) {
			const d = new Date(time);
			if (intervalType === 'quarter') return formatQuarterLabel(d);
			return `FY ${getFinancialYear(d)}`;
		}
		return 'Total';
	});

	/**
	 * Whether the legend is showing focused data
	 */
	let isFocused = $derived(chart.focusTime !== undefined);

	/**
	 * Clear the focus
	 */
	function clearFocus() {
		chart.clearFocus();
	}
</script>

<svelte:head>
	<title>Lens on Emissions</title>
</svelte:head>

<div class="p-4">
	<!-- Header Filter Bar -->
	<div
		class="mb-4 flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-light-warm-grey rounded-lg"
	>
		<TimeRangeControls
			{intervalType}
			{showHistory}
			{showProjections}
			{useRollingSum}
			onIntervalChange={handleIntervalChange}
			onHistoryChange={(show) => (showHistory = show)}
			onProjectionsChange={(show) => (showProjections = show)}
			onRollingSumChange={(show) => (useRollingSum = show)}
		/>
		<span class="text-lg font-semibold text-dark-grey">{dateRangeTitle}</span>
	</div>

	<!-- Zoom Brush -->
	{#if fullChartData.length > 0}
		<div class="mb-6">
			<CategoryBrush
				data={fullChartData}
				xKey={intervalType === 'quarter' ? 'date' : 'fy'}
				formatLabel={intervalType === 'quarter' ? (d) => formatQuarterLabel(d) : (d) => `FY ${d}`}
				{brushedRange}
				onbrush={handleBrushChange}
			/>
		</div>
	{/if}

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
		<!-- Chart/Table Toggle -->
		<div class="flex items-center justify-end mb-4">
			<div class="flex rounded-full bg-light-warm-grey p-0.5">
				<button
					type="button"
					class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {viewMode ===
					'chart'
						? 'bg-dark-grey text-white'
						: 'text-dark-grey hover:bg-warm-grey'}"
					onclick={() => (viewMode = 'chart')}
				>
					Chart
				</button>
				<button
					type="button"
					class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer {viewMode ===
					'table'
						? 'bg-dark-grey text-white'
						: 'text-dark-grey hover:bg-warm-grey'}"
					onclick={() => (viewMode = 'table')}
				>
					Table
				</button>
			</div>
		</div>

		<!-- Chart or Table View -->
		{#if viewMode === 'chart'}
			<div class="border border-light-warm-grey rounded-lg p-4 mb-6">
				<StratumChart
					{chart}
					netTotalKey="net_total"
					netTotalColor={NET_TOTAL_COLOR}
					overlayStart={showProjections ? fyStartDate(TIME_RANGES.PROJECTION_START_FY).getTime() : null}
				/>
			</div>
		{:else}
			<div class="mb-6">
				<EmissionsDataTable
					{chartData}
					sectors={SECTOR_ORDER}
					sectorColors={SECTOR_COLORS}
					sectorLabels={SECTOR_LABELS}
					{intervalType}
					initiallyOpen={true}
					{hiddenSectors}
				/>
			</div>
		{/if}

		<!-- Legend and Sector Comparison (side by side) -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
			<div class="border border-light-warm-grey rounded-lg">
				<EmissionsLegend
					sectors={SECTOR_ORDER}
					sectorColors={SECTOR_COLORS}
					sectorLabels={SECTOR_LABELS}
					data={legendData}
					netTotalColor={NET_TOTAL_COLOR}
					{hiddenSectors}
					ontoggle={toggleSector}
					label={legendLabel}
					{isFocused}
					onclearfocus={clearFocus}
				/>
			</div>

			<div class="border border-light-warm-grey rounded-lg">
				<SectorComparisonBars
					data={legendData}
					sectors={SECTOR_ORDER}
					sectorColors={SECTOR_COLORS}
					sectorLabels={SECTOR_LABELS}
					{hiddenSectors}
					label={legendLabel}
				/>
			</div>
		</div>

		<!-- Sector Sparklines -->
		<SectorSparklines
			{chartData}
			sectors={SECTOR_ORDER}
			sectorColors={SECTOR_COLORS}
			sectorLabels={SECTOR_LABELS}
			{hiddenSectors}
		/>
	{/if}
</div>
