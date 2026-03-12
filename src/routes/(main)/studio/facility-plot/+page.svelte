<script>
	import { getContext, onMount, onDestroy, untrack } from 'svelte';
	import { bisector } from 'd3-array';
	import Meta from '$lib/components/Meta.svelte';
	import PlotChart from '$lib/components/charts/plot/PlotChart.svelte';
	import {
		createStackedAreaOptions,
		createLineOptions,
		capacityMarks
	} from '$lib/components/charts/plot/plot-configs.js';
	import {
		timeToPx,
		computeNightPeriods,
		shouldShowNightShading
	} from '$lib/components/charts/plot/plot-overlays.js';
	import { computePlotGridlines } from '$lib/components/charts/plot/plot-gridlines.js';
	import { analyzeUnits } from '$lib/components/charts/facility/unit-analysis.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import chroma from 'chroma-js';
	import Select from '$lib/components/form-elements/Select.svelte';
	import { formatSI, convert } from '$lib/utils/si-units';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { getIntervalForDuration } from '$lib/components/charts/v2/intervalConfig.js';
	import { aggregateToInterval } from '$lib/components/charts/v2/dataProcessing.js';
	import PlotChartOptions from '$lib/components/charts/plot/PlotChartOptions.svelte.js';
	import PlotChartTheme from '$lib/components/charts/plot/PlotChartTheme.svelte.js';
	import PlotInteraction from '$lib/components/charts/plot/PlotInteraction.svelte.js';
	import PlotSync from '$lib/components/charts/plot/PlotSync.svelte.js';

	const layout = getContext('layout-fullscreen');
	onMount(() => layout.setFullscreen(true));
	onDestroy(() => layout.setFullscreen(false));

	/** @type {{ data: { facilities: Array<{ facility: any, powerData: any, timeZone: string, error: string | null }> } }} */
	let { data } = $props();

	// Filter to facilities that loaded successfully
	let validFacilities = $derived(data.facilities.filter((f) => f.facility));

	// ── Shared Chart Options, Theme & Sync ───────────────────────
	const chartOpts = new PlotChartOptions();
	const chartTheme = new PlotChartTheme();
	const sync = new PlotSync();

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	// ── Per-Chart State ──────────────────────────────────────────
	// Each chart gets its own interaction, data manager, and derived state.
	// We use a class to encapsulate per-chart reactive state.

	class ChartState {
		/** @type {any} */
		facilityEntry;

		interaction;

		/** @type {Map<string, ChartDataManager>} */
		managerCache = new Map();

		/** @type {ChartDataManager | null} */
		dataManager = $state(null);

		/** @type {number} */
		containerWidth = $state(0);

		/** @type {number} */
		containerHeight = $state(0);

		/**
		 * @param {any} facilityEntry
		 * @param {PlotChartOptions} opts
		 */
		constructor(facilityEntry, opts) {
			this.facilityEntry = facilityEntry;
			this.interaction = new PlotInteraction(opts);
		}
	}

	/** @type {ChartState[]} */
	let charts = $state([]);

	// Create chart states for each valid facility
	$effect(() => {
		const facilities = validFacilities;
		if (!facilities.length) return;

		// Only create once
		if (charts.length > 0) return;

		const newCharts = facilities.map((entry) => new ChartState(entry, chartOpts));
		charts = newCharts;

		// Register all charts with sync controller
		for (const chart of newCharts) {
			sync.addChart(chart.interaction, () => chart.containerWidth);
		}
	});

	// ── Interval / Metric (derived from first chart's viewport) ──
	let primaryInteraction = $derived(charts[0]?.interaction);

	let intervalConfig = $derived(
		primaryInteraction
			? getIntervalForDuration(primaryInteraction.viewEnd - primaryInteraction.viewStart)
			: getIntervalForDuration(7 * 86_400_000)
	);
	let currentInterval = $derived(intervalConfig.id);
	let currentMetric = $derived(intervalConfig.metric);

	// Power display interval: 5m when zoomed in (<=3 days), 30m otherwise
	let viewportDays = $derived(
		primaryInteraction
			? (primaryInteraction.viewEnd - primaryInteraction.viewStart) / 86_400_000
			: 7
	);
	let powerDisplayInterval = $derived(viewportDays <= 3 ? '5m' : '30m');
	let energyDisplayInterval = $derived(intervalConfig.label);
	let displayInterval = $derived(
		currentMetric === 'power' ? powerDisplayInterval : energyDisplayInterval
	);
	let isEnergyMetric = $derived(currentMetric === 'energy');
	let fetchBufferMultiplier = $derived(isEnergyMetric ? 3 : 1);
	let displayPrefix = $state('M');
	let baseUnit = $derived(isEnergyMetric ? 'Wh' : 'W');
	let unitLabel = $derived(displayPrefix + baseUnit);
	let prefixOptions = $derived(
		['k', 'M', 'G'].map((p) => ({ label: p + baseUnit, value: p }))
	);

	// Auto-set curve type when metric changes
	$effect(() => {
		const curveType = intervalConfig.curveType;
		if (curveType === 'step') {
			chartOpts.setCurve('step-after');
		} else {
			chartOpts.setCurve('linear');
		}
	});

	// ── Helpers ──────────────────────────────────────────────────

	/**
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	const bisect = bisector((/** @type {any} */ d) => d.time).left;

	// ── Per-Chart Reactive Derivations ───────────────────────────
	// These need to be computed per chart. We use $derived.by() with
	// chart index access since Svelte 5 runes work at the component level.

	/**
	 * Get analysis for a chart's facility
	 * @param {ChartState} chart
	 */
	function getAnalysis(chart) {
		if (!chart.facilityEntry.facility) return null;
		return analyzeUnits(chart.facilityEntry.facility, getFuelTechColor);
	}

	/**
	 * Get label function for a chart
	 * @param {any} analysis
	 * @returns {(unitCode: string, fuelTech: string) => string}
	 */
	function getLabelFn(analysis) {
		const displayMap = analysis?.unitCodeDisplayMap ?? {};
		return (unitCode, fuelTech) => {
			const displayCode = displayMap[unitCode] ?? unitCode;
			return `${displayCode} (${fuelTechNameMap[fuelTech] || fuelTech})`;
		};
	}

	/**
	 * Get colour function for a chart
	 * @param {any} analysis
	 * @returns {(unitCode: string, fuelTech: string) => string}
	 */
	function getColourFn(analysis) {
		const colourMap = analysis?.unitColours ?? {};
		const loadIds = analysis?.loadIds ?? [];
		return (unitCode, fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = loadIds.includes(`power_${unitCode}`);
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	}

	/**
	 * Create a data manager for a chart
	 * @param {ChartState} chart
	 * @param {any} analysis
	 * @param {string} interval
	 * @param {string} metric
	 * @returns {ChartDataManager}
	 */
	function createManager(chart, analysis, interval, metric) {
		const facility = chart.facilityEntry.facility;
		return new ChartDataManager({
			facilityCode: facility.code,
			networkId: facility.network_id,
			interval,
			metric,
			unitFuelTechMap: analysis?.unitFuelTechMap ?? {},
			unitOrder: analysis?.unitOrder ?? [],
			loadsToInvert: analysis?.loadIds ?? [],
			getLabel: getLabelFn(analysis),
			getColour: getColourFn(analysis)
		});
	}

	// ── Per-Chart Data Manager Setup ─────────────────────────────
	// Set up data managers and interaction callbacks for each chart

	$effect(() => {
		if (!charts.length) return;

		// Power: always fetch 5m (API returns sums for coarser intervals).
		// Energy: use the interval from intervalConfig (API returns correct aggregates).
		const interval = currentMetric === 'power' ? '5m' : currentInterval;
		const metric = currentMetric;
		const isEnergy = isEnergyMetric;
		const bufferMult = fetchBufferMultiplier;

		for (const chart of charts) {
			const analysis = getAnalysis(chart);
			if (!analysis) continue;

			const key = `${interval}-${metric}`;

			// Skip if already using this interval/metric
			const existing = chart.dataManager;
			if (existing && existing.interval === interval && existing.metric === metric) continue;

			let manager = chart.managerCache.get(key);
			if (!manager) {
				manager = createManager(chart, analysis, interval, metric);
				chart.managerCache.set(key, manager);

				// Seed initial 5m-power manager with server data
				if (interval === '5m' && metric === 'power' && chart.facilityEntry.powerData) {
					manager.seedCache(chart.facilityEntry.powerData);
				}
			}

			chart.dataManager = manager;

			// When switching to power with a wide viewport (from energy), snap to last 7 days
			const interaction = chart.interaction;
			let start = interaction.viewStart;
			let end = interaction.viewEnd;
			if (start && end) {
				const MAX_POWER_VIEWPORT_MS = 7 * 86_400_000;
				if (!isEnergy && (end - start) > MAX_POWER_VIEWPORT_MS) {
					end = Math.min(end, Date.now());
					start = end - MAX_POWER_VIEWPORT_MS;
					interaction.setViewport(start, end);
				}

				const duration = end - start;
				const buffer = duration * bufferMult;
				manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), {
					immediate: true
				});
			}
		}
	});

	// Initialise viewport from first chart's cache extent (one-time seed)
	$effect(() => {
		if (!charts.length) return;
		const chart = charts[0];
		const manager = chart.dataManager;
		if (!manager || !manager.initialLoadComplete) return;
		if (chart.interaction.viewStart !== 0 || chart.interaction.viewEnd !== 0) return;

		if (manager.cacheStart !== null && manager.cacheEnd !== null) {
			const start = manager.cacheStart;
			const end = Math.min(manager.cacheEnd, Date.now());

			// Set viewport on all charts
			for (const c of charts) {
				c.interaction.setViewport(start, end);
			}
		}
	});

	// Background prefetch: energy data for each chart
	$effect(() => {
		for (const chart of charts) {
			const manager = chart.dataManager;
			if (!manager || !manager.initialLoadComplete) continue;
			if (!chart.facilityEntry.facility) continue;
			if (manager.metric !== 'power') continue;

			untrack(() => {
				const energyKey = '1d-energy';
				if (chart.managerCache.has(energyKey)) return;

				const analysis = getAnalysis(chart);
				if (!analysis) return;

				const energyManager = createManager(chart, analysis, '1d', 'energy');
				const now = Date.now();
				const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
				energyManager.requestRange(oneYearAgo, now);
				chart.managerCache.set(energyKey, energyManager);
			});
		}
	});

	// Wire up interaction callbacks for each chart
	$effect(() => {
		const isEnergy = isEnergyMetric;
		const bufferMult = fetchBufferMultiplier;

		for (const chart of charts) {
			const interaction = chart.interaction;

			interaction.getMinViewport = () => (isEnergy ? 5 * 86_400_000 : 3_600_000);
			interaction.getMaxViewport = () =>
				isEnergy ? 50 * 365 * 86_400_000 : 16 * 86_400_000;

			interaction.onViewportChange = (start, end) => {
				const buffer = (end - start) * bufferMult;
				chart.dataManager?.requestRange(start - buffer, end + buffer);
			};

			interaction.onPanEnd = (panDelta) => {
				const viewportWidth = interaction.viewEnd - interaction.viewStart;
				const prefetch = viewportWidth * bufferMult;
				const now = Date.now();
				if (panDelta < 0 && interaction.viewEnd < now) {
					chart.dataManager?.requestRange(
						interaction.viewEnd,
						Math.min(interaction.viewEnd + prefetch, now)
					);
				} else if (panDelta > 0) {
					chart.dataManager?.requestRange(
						interaction.viewStart - prefetch,
						interaction.viewStart
					);
				}
			};

			interaction.findNearest = (timeAtCursor) => {
				if (!chart.dataManager) return null;
				const allData = chart.dataManager.getDataForRange(
					interaction.viewStart,
					interaction.viewEnd
				);
				if (!allData.length) return null;

				const isStep = chartOpts.curve === 'step-after';
				const idx = bisect(allData, timeAtCursor);

				/** @type {any} */
				let nearest;
				let nearestIdx;

				if (isStep) {
					// Step-after: floor — snap to the point at or before cursor
					nearestIdx = Math.max(0, idx - 1);
					nearest = allData[nearestIdx];
				} else {
					// Continuous: snap to nearest by distance
					const d0 = allData[idx - 1];
					const d1 = allData[idx];
					if (!d0) {
						nearest = d1;
						nearestIdx = idx;
					} else if (!d1) {
						nearest = d0;
						nearestIdx = idx - 1;
					} else if (timeAtCursor - d0.time < d1.time - timeAtCursor) {
						nearest = d0;
						nearestIdx = idx - 1;
					} else {
						nearest = d1;
						nearestIdx = idx;
					}
				}

				if (!nearest) return null;

				// For step-band: include next data point's time
				const nextPoint = allData[nearestIdx + 1];
				let nextTime;
				if (nextPoint) {
					nextTime = nextPoint.time;
				} else if (nearestIdx > 0) {
					// Extrapolate from previous interval
					const prevPoint = allData[nearestIdx - 1];
					nextTime = nearest.time + (nearest.time - prevPoint.time);
				}

				return { data: nearest, time: nearest.time, nextTime };
			};
		}
	});
</script>

<Meta title="Facility Plot" description="Observable Plot facility power chart" />

{#if mounted && charts.length > 0}
	<div
		class="flex flex-col h-dvh overflow-hidden"
		style="{chartTheme.cssVars}; font-family: var(--plot-font-family);"
	>
		<!-- Shared Header -->
		<div
			class="flex items-center justify-between gap-3 px-4 py-2 border-b shrink-0"
			style="border-color: var(--plot-header-border); background: var(--plot-header-bg);"
		>
			<div class="flex items-center gap-3">
				<span
					class="text-[11px] font-medium tracking-wide uppercase"
					style="color: var(--plot-title-colour);"
				>
					Facility Plot
				</span>
				<span class="text-[10px]" style="color: var(--plot-subtitle-colour);">
					{unitLabel} · {displayInterval} · Observable Plot
				</span>
			</div>

			<div class="flex items-center gap-2">
				<Select
					selected={chartOpts.selectedChartType}
					options={PlotChartOptions.chartTypeOptions}
					onchange={(opt) => (chartOpts.selectedChartType = opt)}
					widthClass="w-auto"
					paddingX="px-1"
					paddingY="py-0.5"
					selectedLabelClass="text-[11px] font-medium"
				/>
				<Select
					selected={chartOpts.selectedCurve}
					options={PlotChartOptions.curveOptions}
					onchange={(opt) => (chartOpts.selectedCurve = opt)}
					widthClass="w-auto"
					paddingX="px-1"
					paddingY="py-0.5"
					selectedLabelClass="text-[11px] font-medium"
				/>
				<Select
					selected={displayPrefix}
					options={prefixOptions}
					onchange={(opt) => (displayPrefix = opt.value)}
					widthClass="w-auto"
					paddingX="px-1"
					paddingY="py-0.5"
					selectedLabelClass="text-[11px] font-medium"
				/>
				<button
					class="text-[10px] px-2 py-0.5 rounded"
					style="border: 1px solid var(--plot-header-border); color: var(--plot-subtitle-colour);"
					onclick={() => chartTheme.toggle()}
				>
					{chartTheme.selectedTheme === 'terminal' ? 'OE' : 'Terminal'}
				</button>
			</div>
		</div>

		<!-- Charts -->
		<div class="flex-1 min-h-0 overflow-y-auto">
			{#each charts as chart, chartIndex (chart.facilityEntry.facility.code)}
				{@const facility = chart.facilityEntry.facility}
				{@const interaction = chart.interaction}
				{@const analysis = getAnalysis(chart)}
				{@const processedCache = chart.dataManager?.processedCache}
				{@const ianaTimeZone =
					chart.facilityEntry.timeZone === '+08:00'
						? 'Australia/Perth'
						: 'Australia/Brisbane'}
				{@const rawVisibleData = chart.dataManager
					? chart.dataManager.getDataForRange(interaction.viewStart, interaction.viewEnd)
					: []}
				{@const visibleData = (() => {
					if (!rawVisibleData.length || !processedCache) return rawVisibleData;
					if (!isEnergyMetric && powerDisplayInterval === '30m') {
						return aggregateToInterval(rawVisibleData, '30m', processedCache.seriesNames, 'mean');
					}
					return rawVisibleData;
				})()}

				{@const capacitySums = analysis?.capacitySums ?? { positive: 0, negative: 0 }}

				{@const gridlines =
					visibleData.length > 1
						? computePlotGridlines(
								visibleData,
								interaction.viewStart,
								interaction.viewEnd,
								ianaTimeZone,
								chart.facilityEntry.timeZone,
								isEnergyMetric
							)
						: undefined}

				{@const extraMarks = capacityMarks(capacitySums, {
					isLine: chartOpts.isLine,
					isEnergyMetric
				})}

				{@const nightPeriods = shouldShowNightShading(interaction.viewStart, interaction.viewEnd)
					? computeNightPeriods(interaction.viewStart, interaction.viewEnd, chart.facilityEntry.timeZone)
					: []}

				{@const plotOptions = (() => {
					if (!processedCache || visibleData.length === 0) return null;

					// Read displayPrefix eagerly so Svelte tracks it as a dependency
					const prefix = displayPrefix;

					const xDomain = /** @type {[Date, Date]} */ ([
						new Date(interaction.viewStart),
						new Date(interaction.viewEnd)
					]);
					const opts = {
						curve: chartOpts.curve,
						xDomain,
						xType: 'utc',
						style: chartTheme.plotStyle,
						marginLeft: chartOpts.marginLeft,
						marginRight: chartOpts.marginRight,
						legend: false,
						gridlines,
						extraMarks,
						yTickFormat: (/** @type {number} */ d) => {
							const converted = convert('M', prefix, d);
							const abs = Math.abs(converted);
							const digits = abs < 10 ? 2 : abs < 100 ? 1 : 0;
							return new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits }).format(converted);
						}
					};

					const configFn = chartOpts.isLine
						? createLineOptions
						: createStackedAreaOptions;
					return configFn(
						visibleData,
						processedCache.seriesNames,
						processedCache.seriesColours,
						processedCache.seriesLabels,
						opts
					);
				})()}

				{@const formattedDate = (() => {
					if (!interaction.hoverData) return '';
					return new Intl.DateTimeFormat('en-AU', {
						timeZone: ianaTimeZone,
						day: 'numeric',
						month: 'short',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					}).format(interaction.hoverData.date);
				})()}

				{@const hoverTotal = (() => {
					if (!interaction.hoverData || !processedCache) return 0;
					return processedCache.seriesNames.reduce(
						(/** @type {number} */ sum, /** @type {string} */ name) =>
							sum + (Number(interaction.hoverData[name]) || 0),
						0
					);
				})()}

				{@const isStepCurve = chartOpts.curve === 'step-after'}
				{@const bandWidth = (() => {
					if (
						!isStepCurve ||
						!interaction.hoverBandEnd ||
						!interaction.hoverData ||
						chart.containerWidth === 0
					)
						return 0;
					const plotWidth =
						chart.containerWidth - chartOpts.marginLeft - chartOpts.marginRight;
					const endRatio =
						(interaction.hoverBandEnd - interaction.viewStart) /
						(interaction.viewEnd - interaction.viewStart);
					const endPx = chartOpts.marginLeft + endRatio * plotWidth;
					return Math.max(0, endPx - interaction.hoverX);
				})()}

				<div
					class="border-b"
					style="border-color: var(--plot-header-border);"
				>
					<!-- Chart Header -->
					<div
						class="flex items-center justify-between px-4 py-1.5"
						style="background: var(--plot-header-bg);"
					>
						<span
							class="text-[11px] font-medium tracking-wide"
							style="color: var(--plot-title-colour);"
						>
							{facility.name}
						</span>
						{#if analysis && !isEnergyMetric && capacitySums.positive > 0}
							<span class="text-[10px]" style="color: var(--plot-subtitle-colour);">
								Capacity: {formatSI(capacitySums.positive, { fromPrefix: 'M', toPrefix: displayPrefix, baseUnit })}
							</span>
						{/if}
					</div>

					<!-- Tooltip -->
					<div class="h-[21px] shrink-0">
						{#if interaction.hoverData && processedCache}
							<div class="h-full flex items-center justify-end text-xs">
								<span
									class="px-3 py-1 font-light"
									style="background: var(--plot-tooltip-date-bg);"
								>
									{formattedDate}
								</span>
								<div
									class="px-4 py-1 flex gap-4 items-center overflow-x-auto"
									style="background: var(--plot-tooltip-bg);"
								>
									{#each processedCache.seriesNames as name (name)}
										{#if interaction.hoverData[name] != null}
											<div class="flex items-center gap-1.5 shrink-0">
												<span
													class="w-2.5 h-2.5 rounded-sm shrink-0"
													style="background-color: {processedCache.seriesColours[name]}"
												></span>
												<span
													class="whitespace-nowrap"
													style="color: var(--plot-tooltip-text-colour);"
												>
													{processedCache.seriesLabels[name]}
												</span>
												<strong class="font-semibold whitespace-nowrap">
													{formatSI(interaction.hoverData[name], { fromPrefix: 'M', toPrefix: displayPrefix, baseUnit })}
												</strong>
											</div>
										{/if}
									{/each}
									<span class="flex items-center gap-1.5 shrink-0">
										<span style="color: var(--plot-tooltip-text-colour);">
											Total
										</span>
										<strong class="font-semibold">
											{formatSI(hoverTotal, { fromPrefix: 'M', toPrefix: displayPrefix, baseUnit })}
										</strong>
									</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Chart -->
					<div class="px-4 py-2 overflow-hidden" style="height: calc(50vh - 80px); min-height: 250px;">
						<div
							use:interaction.bindWheel
							class="relative h-full select-none"
							style="cursor: {interaction.isPanning ? 'grabbing' : 'crosshair'};"
							role="img"
							bind:clientWidth={chart.containerWidth}
							bind:clientHeight={chart.containerHeight}
						>
							{#if plotOptions && chart.containerHeight > 0}
								<PlotChart
									options={plotOptions}
									height={chart.containerHeight}
									class="pointer-events-none"
								/>
							{/if}

							<!-- Night shading overlay -->
							{#each nightPeriods as [nightStart, nightEnd]}
								{@const left = timeToPx(nightStart.getTime(), interaction.viewStart, interaction.viewEnd, chartOpts.marginLeft, chart.containerWidth, chartOpts.marginRight)}
								{@const right = timeToPx(nightEnd.getTime(), interaction.viewStart, interaction.viewEnd, chartOpts.marginLeft, chart.containerWidth, chartOpts.marginRight)}
								<div
									class="absolute top-0 bottom-0 pointer-events-none"
									style="left: {Math.max(left, chartOpts.marginLeft)}px; width: {Math.min(right, chart.containerWidth - chartOpts.marginRight) - Math.max(left, chartOpts.marginLeft)}px; background: rgba(0,0,0,0.04);"
								></div>
							{/each}

							<!-- Loading overlay -->
							{#if chart.dataManager?.loadingRanges.length}
								<div
									class="absolute top-0 left-0 right-0 flex items-center justify-center py-1 pointer-events-none"
								>
									<div
										class="flex items-center gap-2 px-3 py-1 bg-white/80 rounded text-[10px] text-mid-grey"
									>
										<svg
											class="animate-spin h-3 w-3"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Loading data...
									</div>
								</div>
							{/if}

							<!-- Interaction overlay -->
							<div
								class="absolute inset-0"
								style="touch-action: none;"
								role="application"
								onpointerdown={interaction.handlePointerDown}
								onpointermove={interaction.handlePointerMove}
								onpointerup={interaction.handlePointerUp}
								onpointerleave={interaction.handlePointerLeave}
							></div>

							<!-- Crosshair / Step Band -->
							{#if interaction.hoverData && !interaction.isPanning}
								{#if isStepCurve && bandWidth > 0}
									<div
										class="absolute top-0 bottom-0 pointer-events-none"
										style="left: {interaction.hoverX}px; width: {bandWidth}px; background: rgba(0,0,0,0.06); border-left: 1px solid var(--plot-crosshair-colour);"
									></div>
								{:else}
									<div
										class="absolute top-0 bottom-0 w-px pointer-events-none"
										style="left: {interaction.hoverX}px; background: var(--plot-crosshair-colour);"
									></div>
								{/if}
							{/if}
						</div>
					</div>

					<!-- Legend -->
					{#if processedCache}
						<div
							class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t"
							style="border-color: var(--plot-legend-border); background: var(--plot-legend-bg);"
						>
							{#each processedCache.seriesNames as name (name)}
								<div class="flex items-center gap-1.5">
									<span
										class="w-2.5 h-2.5 rounded-sm"
										style="background-color: {processedCache.seriesColours[name]}"
									></span>
									<span
										class="text-[10px]"
										style="color: var(--plot-legend-text-colour);"
									>
										{processedCache.seriesLabels[name]}
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{:else if data.facilities.every((f) => f.error)}
	<div class="flex items-center justify-center h-dvh">
		<p class="text-mid-grey text-sm">{data.facilities[0].error}</p>
	</div>
{:else}
	<div class="flex items-center justify-center h-dvh">
		<div class="flex items-center gap-3 text-mid-warm-grey">
			<svg
				class="animate-spin h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm">Loading data...</span>
		</div>
	</div>
{/if}
