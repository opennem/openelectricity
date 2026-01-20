<script>
	/**
	 * Lens on AU Grid
	 *
	 * Displays power generation data for all Australian electricity regions
	 * with synchronized hover/focus interactions and a shared date brush.
	 */

	import {
		ChartStore,
		StratumChart,
		createSyncedCharts,
		DateBrush,
		IntervalSelector,
		INTERVAL_OPTIONS,
		processForChart,
		aggregateData
	} from '$lib/components/charts/v2';
	import { colourReducer } from '$lib/stores/theme';
	import { fuelTechMap, orderMap, DEFAULT_GROUP } from './helpers/groups';
	import { loadFuelTechs, fuelTechNameMap } from '$lib/fuel_techs';

	/**
	 * @typedef {Object} ProcessedChartData
	 * @property {any[]} data - Time series data
	 * @property {string[]} seriesNames - Series identifiers
	 * @property {Record<string, string>} seriesColours - Series colours
	 * @property {Record<string, string>} seriesLabels - Series labels
	 */

	/**
	 * @typedef {Object} RegionChart
	 * @property {string} region - Region code
	 * @property {string} label - Display label
	 * @property {InstanceType<typeof ChartStore>} chart - Chart store instance
	 */

	/**
	 * @typedef {Object} RegionData
	 * @property {string} region
	 * @property {string} label
	 * @property {string} path
	 * @property {{ data: Array<{ type: string, fuel_tech?: string, id: string }> } | null} dataset
	 * @property {boolean} [error]
	 */

	/** @type {{ data: { regions: RegionData[], range: string, interval: string } }} */
	let { data } = $props();

	// ============================================
	// State
	// ============================================

	/** @type {string} */
	let selectedInterval = $state('5m');

	/** @type {[Date, Date] | undefined} */
	let brushedRange = $state(undefined);

	// ============================================
	// Chart Store Instances (created once)
	// ============================================

	/**
	 * Create a chart store for a region
	 * @param {string} region
	 * @param {string} label
	 * @returns {InstanceType<typeof ChartStore>}
	 */
	function createRegionChart(region, label) {
		const chart = new ChartStore({
			key: Symbol(`chart-${region}`),
			title: label,
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: 'Australia/Sydney'
		});
		chart.chartStyles.chartHeightClasses = 'h-[250px]';
		return chart;
	}

	// Create chart stores once on component initialization
	/** @type {Map<string, InstanceType<typeof ChartStore>>} */
	const chartStores = new Map();

	for (const regionData of data.regions) {
		chartStores.set(regionData.region, createRegionChart(regionData.region, regionData.label));
	}

	// Brush chart for the DateBrush component
	const brushChart = new ChartStore({
		key: Symbol('brush-chart'),
		title: 'Brush',
		prefix: 'M',
		displayPrefix: 'M',
		baseUnit: 'W',
		timeZone: 'Australia/Sydney'
	});

	// ============================================
	// Derived Data
	// ============================================

	let regionCharts = $derived(
		data.regions.map((regionData) => ({
			region: regionData.region,
			label: regionData.label,
			chart: /** @type {InstanceType<typeof ChartStore>} */ (chartStores.get(regionData.region))
		}))
	);

	// Sync controller for coordinated hover/focus
	let sync = $derived(createSyncedCharts(regionCharts.map((rc) => rc.chart)));

	/**
	 * Process raw data for a region into chart format
	 * @param {RegionData} regionData
	 * @returns {ProcessedChartData | null}
	 */
	function processRegionData(regionData) {
		if (!regionData.dataset?.data) return null;

		/** @type {Array<{ type: string, fuel_tech?: string, id: string }>} */
		const dataArray = regionData.dataset.data;
		const powerData = dataArray.filter((d) => d.type === 'power');
		if (!powerData.length) return null;

		return processForChart(powerData, 'W', {
			groupMap: fuelTechMap[DEFAULT_GROUP],
			groupOrder: orderMap[DEFAULT_GROUP],
			loadsToInvert: loadFuelTechs,
			labelReducer: (
				/** @type {Record<string, string>} */ acc,
				/** @type {{ fuel_tech?: string, id: string, label?: string }} */ d
			) => {
				const id = d.fuel_tech || d.id;
				acc[id] = fuelTechNameMap[id] || d.label || id;
				return acc;
			},
			colourReducer: $colourReducer
		});
	}

	// Process data for all regions
	/** @type {Map<string, ProcessedChartData | null>} */
	let processedData = $derived.by(() => {
		const map = new Map();
		for (const regionData of data.regions) {
			map.set(regionData.region, processRegionData(regionData));
		}
		return map;
	});

	// Check if any data is ready
	let isDataReady = $derived(
		Array.from(processedData.values()).some((processed) => processed !== null)
	);

	// ============================================
	// Effects - Update Charts
	// ============================================

	// Update all charts when data or filters change
	$effect(() => {
		for (const { region, chart } of regionCharts) {
			const processed = processedData.get(region);
			if (!processed) continue;

			let seriesData = processed.data;

			// Aggregate to 30m if needed
			if (selectedInterval === '30m' && data.interval === '5m') {
				seriesData = aggregateData(seriesData, '30m', processed.seriesNames);
			}

			// Filter by brush range
			if (brushedRange) {
				const [start, end] = brushedRange;
				const startTime = start.getTime();
				const endTime = end.getTime();
				seriesData = seriesData.filter((d) => {
					const time = d.date?.getTime?.() ?? d.time;
					return time >= startTime && time <= endTime;
				});
			}

			// Update chart store
			chart.seriesData = seriesData;
			chart.seriesNames = processed.seriesNames;
			chart.seriesColours = processed.seriesColours;
			chart.seriesLabels = processed.seriesLabels;
			chart.formatTickX = formatXAxis;
		}
	});

	// Update brush chart (uses first region's data, not filtered by brush)
	$effect(() => {
		const firstProcessed = Array.from(processedData.values()).find((p) => p !== null);
		if (!firstProcessed) return;

		let seriesData = firstProcessed.data;

		if (selectedInterval === '30m' && data.interval === '5m') {
			seriesData = aggregateData(seriesData, '30m', firstProcessed.seriesNames);
		}

		brushChart.seriesData = seriesData;
		brushChart.seriesNames = firstProcessed.seriesNames;
		brushChart.seriesColours = firstProcessed.seriesColours;
		brushChart.seriesLabels = firstProcessed.seriesLabels;
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
		return d.toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	/**
	 * Format date for brush ticks
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatBrushTick(d) {
		if (!(d instanceof Date)) return String(d);
		const day = d.getDate();
		const month = d.toLocaleDateString('en-AU', { month: 'short' });
		return `${day} ${month}`;
	}

	// ============================================
	// Event Handlers
	// ============================================

	/**
	 * Handle interval change from selector
	 * @param {string} interval
	 */
	function handleIntervalChange(interval) {
		selectedInterval = interval;
	}

	/**
	 * Handle brush selection change
	 * @param {[Date, Date] | undefined} range
	 */
	function handleBrush(range) {
		brushedRange = range;
	}

	/** Clear the brush selection */
	function clearBrush() {
		brushedRange = undefined;
	}

	/**
	 * Handle hover event and sync across charts
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		sync.setHover(time, key);
	}

	/** Handle hover end and clear sync */
	function handleHoverEnd() {
		sync.clearHover();
	}

	/**
	 * Handle focus (click) and sync across charts
	 * @param {number} time
	 */
	function handleFocus(time) {
		sync.toggleFocus(time);
	}

	// ============================================
	// Derived for Template
	// ============================================

	// NEM chart (full width at top)
	let nemChart = $derived(regionCharts.find((r) => r.region === 'NEM'));

	// Other region charts (in grid)
	let otherCharts = $derived(regionCharts.filter((r) => r.region !== 'NEM'));
</script>

<svelte:head>
	<title>Lens on AU Grid</title>
</svelte:head>

<div class="p-4">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Lens on AU Grid</h1>
		<p class="text-sm text-mid-warm-grey">All regions overview</p>
	</header>

	<!-- Controls -->
	<div class="flex items-center justify-between mb-4">
		<IntervalSelector
			options={INTERVAL_OPTIONS}
			selected={selectedInterval}
			onchange={handleIntervalChange}
		/>

		{#if brushedRange}
			<button class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer" onclick={clearBrush}>
				Clear zoom
			</button>
		{/if}
	</div>

	<!-- Shared Date Brush -->
	{#if isDataReady}
		<div class="mb-6">
			<DateBrush
				chart={brushChart}
				{brushedRange}
				onbrush={handleBrush}
				formatTick={formatBrushTick}
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
				<span>Loading regions...</span>
			</div>
		</div>
	{:else}
		<!-- NEM Chart (full width) -->
		{#if nemChart}
			<div class="border border-light-warm-grey rounded-lg p-4 mb-6">
				<StratumChart
					chart={nemChart.chart}
					onhover={handleHover}
					onhoverend={handleHoverEnd}
					onfocus={handleFocus}
				/>
			</div>
		{/if}

		<!-- Other Region Charts (2-column grid) -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each otherCharts as { region, chart } (region)}
				<div class="border border-light-warm-grey rounded-lg p-4">
					<StratumChart
						{chart}
						onhover={handleHover}
						onhoverend={handleHoverEnd}
						onfocus={handleFocus}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>
