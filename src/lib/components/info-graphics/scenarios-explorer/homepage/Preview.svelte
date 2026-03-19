<script>
	import { setContext, getContext } from 'svelte';
	import { browser } from '$app/environment';

	import { colourReducer } from '$lib/stores/theme';

	import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';
	import { createSyncedCharts } from '$lib/components/charts/v2/sync.js';
	import StratumChart from '$lib/components/charts/v2/StratumChart.svelte';

	import { fetchTechnologyViewData } from '../../../../../routes/(main)/scenarios/page-data-options/fetch.js';
	import processTechnology from '../../../../../routes/(main)/scenarios/page-data-options/process-technology.js';
	import {
		modelOptions,
		modelScenarios,
		defaultModelPathway
	} from '../../../../../routes/(main)/scenarios/page-data-options/models.js';
	import Tooltip from '../../../../../routes/(main)/scenarios/components/Tooltip.svelte';
	import { formatFyTickX } from '$lib/utils/formatters';
	import {
		chartXHighlightTicks,
		chartXMobileHiddenTicks
	} from '../../../../../routes/(main)/scenarios/page-data-options/chart-ticks.js';

	import Filters from './Filters.svelte';
	import DetailedBreakdown from './DetailedBreakdown.svelte';
	import ScenarioDescription from './ScenarioDescription.svelte';

	import filtersStore from '../stores/filters';

	// Keep filters context for ScenarioDescription to read from
	setContext('scenario-filters', filtersStore());

	const { selectedModel, selectedScenario, selectedRegion, scenarioOptions } =
		getContext('scenario-filters');

	// --- ChartStore v2 ---
	const generationChart = new ChartStore({
		key: Symbol('homepage-generation'),
		title: 'Generation',
		chartType: 'stacked-area',
		chartStyles: {
			chartHeightClasses: 'h-[400px] md:h-[680px]',
			snapTicks: true,
			xAxisStroke: 'transparent',
			yAxisStroke: 'transparent',
			zeroValueStroke: 'transparent'
		}
	});
	generationChart.yTicks = 3;
	generationChart.chartOptions.allowHoverHighlight = false;
	generationChart.formatTickX = formatFyTickX;

	const sync = createSyncedCharts([generationChart]);

	// --- Local state ---
	let selectedGroup = $state('homepage_preview');
	/** @type {FuelTechCode[] | undefined} */
	let seriesLoadsIds = $state([]);
	let isFetching = $state(false);

	// Data cache — plain variable (NOT $state) to avoid deep proxy overhead
	/** @type {*} */
	let cachedData;
	let dataVersion = $state(0);

	// Overlay start time derived from processed data
	let overlayStartTime = $state(/** @type {number | undefined} */ (undefined));

	// --- Derive default pathway and scenario options from selected model ---
	let defaultPathway = $derived(defaultModelPathway[$selectedModel]);
	let currentModelScenarios = $derived(
		/** @type {Record<string, any>} */ (modelScenarios)[$selectedModel] || []
	);

	// Update scenario options when model changes
	$effect(() => {
		const scenarios = currentModelScenarios;
		scenarioOptions.set(scenarios.map((/** @type {any} */ s) => ({ label: s.label, value: s.id })));

		// Always reset to first scenario when model changes
		$selectedScenario = scenarios[0]?.id || 'step_change';
	});

	// --- updateChart helper (same as scenarios page) ---
	/**
	 * @param {ChartStore} chart
	 * @param {ProcessedDataViz} processed
	 */
	function updateChart(chart, processed) {
		chart.seriesData = processed.seriesData;
		chart.seriesNames = processed.seriesNames;
		chart.seriesColours = processed.seriesColours;
		chart.seriesLabels = processed.seriesLabels;
		chart.chartOptions.baseUnit = processed.baseUnit || '';
		chart.chartOptions.prefix = processed.prefix || /** @type {SiPrefix} */ ('');
		chart.chartOptions.displayPrefix =
			processed.displayPrefix || processed.prefix || /** @type {SiPrefix} */ ('');
		chart.chartOptions.allowedPrefixes = processed.allowedPrefixes || [];

		const chartType = processed.chartType === 'area' ? 'stacked-area' : processed.chartType;
		chart.chartOptions.selectedChartType =
			/** @type {import('$lib/components/charts/v2/ChartOptions.svelte.js').ChartType} */ (
				chartType
			);

		if (
			processed.yDomain &&
			processed.yDomain[0] !== undefined &&
			processed.yDomain[1] !== undefined
		) {
			const yMax = /** @type {number} */ (processed.yDomain[1]);
			chart.setYDomain(/** @type {[number, number]} */ ([processed.yDomain[0], yMax * 1.15]));
		} else {
			chart.setYDomain(undefined);
		}
	}

	// --- Process cached data with current group ---
	function processAndUpdate() {
		if (!cachedData) return;

		const processed = processTechnology.generation({
			projection: cachedData.projectionEnergyData,
			history: cachedData.historyEnergyData,
			group: selectedGroup,
			colourReducer: $colourReducer,
			includeBatteryAndLoads: false
		});

		updateChart(generationChart, processed);
		seriesLoadsIds = /** @type {FuelTechCode[] | undefined} */ (processed.seriesLoadsIds);

		// Derive overlay position from processed data's projection start time
		const overlayDate = processed.projectionStartTime
			? new Date(processed.projectionStartTime)
			: null;

		if (overlayDate) {
			overlayStartTime = +overlayDate;
			const endDate = processed.projectionEndTime
				? new Date(processed.projectionEndTime)
				: undefined;

			generationChart.chartStyles.chartOverlayLine = { date: overlayDate };
			if (endDate) {
				generationChart.chartStyles.chartOverlay = { xStartValue: overlayDate, xEndValue: endDate };
				// Background fill for the projection region
				generationChart.bgShadingData = [[overlayDate, endDate]];
				generationChart.bgShadingFill = '#FAF9F6';
			}

			// Foreground shading for the derived (interpolated) region
			if (processed.derivedStartTime && processed.derivedEndTime) {
				generationChart.fgShadingData = [
					[new Date(processed.derivedStartTime), new Date(processed.derivedEndTime)]
				];
				generationChart.fgShadingFill = 'rgba(255, 255, 255, 0.24)';

				const midTime =
					processed.derivedStartTime + (processed.derivedEndTime - processed.derivedStartTime) / 2;
				generationChart.annotations = [
					{
						type: 'text',
						x: midTime,
						y: 0,
						text: 'DERIVED',
						dy: -6,
						textAnchor: 'middle',
						fill: '#999',
						fontSize: '8px'
					}
				];
			} else {
				generationChart.fgShadingData = [];
				generationChart.annotations = [];
			}

			// Show only key years + projection start on x-axis
			const lastTick = endDate || new Date('2050-01-01');
			const highlights = chartXHighlightTicks[$selectedModel] || [overlayDate];
			const baseTicks = [new Date('2010-01-01'), new Date('2040-01-01'), lastTick];
			// Merge highlight ticks into x ticks (deduplicated)
			const allTicks = [...baseTicks, ...highlights];
			const seen = new Set();
			generationChart.xTicks = allTicks
				.filter((d) => {
					const key = d.getTime();
					if (seen.has(key)) return false;
					seen.add(key);
					return true;
				})
				.sort((a, b) => a.getTime() - b.getTime());
			generationChart.xHighlightTicks = highlights;
			generationChart.xMobileHiddenTicks = chartXMobileHiddenTicks[$selectedModel] || [];
			generationChart.chartStyles.yLabelStartPos = overlayDate;
		}
	}

	// --- Fetch data when model/scenario/pathway changes ---
	let fetchCacheKey = $state('');
	/** @type {AbortController | null} */
	let abortController = null;

	$effect(() => {
		if (browser) {
			const key = `${$selectedModel}-${$selectedScenario}-${defaultPathway}-${$selectedRegion}`;
			if (key === fetchCacheKey) return;
			fetchCacheKey = key;

			// Cancel any in-flight fetch
			abortController?.abort();
			const controller = new AbortController();
			abortController = controller;
			isFetching = true;

			fetchTechnologyViewData({
				model: $selectedModel,
				region: $selectedRegion,
				scenario: $selectedScenario,
				pathway: defaultPathway,
				signal: controller.signal
			})
				.then((/** @type {*} */ data) => {
					cachedData = data;
					dataVersion++;
					isFetching = false;
				})
				.catch((/** @type {any} */ err) => {
					// Ignore aborted fetches
					if (err?.name === 'AbortError') return;
					console.error('Failed to fetch scenario data:', err);
					isFetching = false;
				});
		}
	});

	// --- Re-process when data arrives or group changes ---
	$effect(() => {
		if (dataVersion > 0) {
			// Access selectedGroup to track it as dependency
			const _group = selectedGroup;
			processAndUpdate();
		}
	});

	// --- Interaction handlers ---
	/**
	 * @param {number | undefined} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		sync.setHover(time, key);
	}

	function handleHoverEnd() {
		sync.clearHover();
	}

	/**
	 * @param {string} newGroup
	 */
	function handleGroupChange(newGroup) {
		selectedGroup = newGroup;
	}
</script>

<div class="container max-w-none lg:container relative">
	<header class="sm:flex justify-between gap-12 mb-8 sm:mb-12">
		<h1 class="text-3xl leading-[3.7rem] mb-6 md:mb-6 md:text-5xl md:leading-5xl md:max-w-[600px]">
			Explore the future of Australia's national electricity market
		</h1>

		<div class="hidden md:block">
			<a
				href="/scenarios"
				class="text-base mt-6 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View scenario explorer
			</a>
		</div>
	</header>

	<Filters {isFetching} {selectedGroup} ongroupchange={handleGroupChange} />
</div>

<div class="max-w-none lg:container relative">
	<div
		class="z-10 rounded bg-white/40 p-8 hidden sm:block sm:absolute sm:max-w-[30%] sm:ml-36 top-12 left-12"
	>
		<ScenarioDescription />
	</div>

	{#if generationChart.seriesData.length > 0}
		<StratumChart
			chart={generationChart}
			showHeader={false}
			overlayStart={overlayStartTime}
			clampHoverLine={true}
			animate={true}
			hideAnnotationsOnMobile={true}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
		>
			{#snippet tooltip()}
				<div class="mb-2">
					<Tooltip
						hoverData={generationChart.hoverData}
						hoverKey={generationChart.hoverKey}
						seriesColours={generationChart.seriesColours}
						seriesLabels={generationChart.seriesLabels}
						convertAndFormatValue={generationChart.convertAndFormatValue}
						defaultText="Energy Generation (TWh) by Financial Year"
						showTotal={true}
					/>
				</div>
			{/snippet}
		</StratumChart>
	{:else}
		<div class="h-[400px] md:h-[680px] rounded-lg bg-warm-grey animate-pulse"></div>
	{/if}
</div>

<div class="max-w-none lg:container">
	<DetailedBreakdown
		chart={generationChart}
		{selectedGroup}
		{seriesLoadsIds}
		onhover={handleHover}
		onhoverend={handleHoverEnd}
	/>

	<p class="text-xs text-mid-grey px-3 pt-12">
		Data source:
		<a
			href="https://aemo.com.au/energy-systems/electricity/national-electricity-market-nem/nem-forecasting-and-planning/integrated-system-plan-isp"
			class="text-mid-grey underline"
		>
			AEMO Integrated System Plan for the National Electricity Market
		</a>
	</p>

	<div class="block sm:hidden container mt-12">
		<a
			href="/scenarios"
			class="text-base mt-6 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
		>
			View scenario explorer
		</a>
	</div>
</div>
