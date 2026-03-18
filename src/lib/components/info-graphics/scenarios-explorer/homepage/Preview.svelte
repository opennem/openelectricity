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
	import { chartXHighlightTicks } from '../../../../../routes/(main)/scenarios/page-data-options/chart-ticks.js';

	import Filters from './Filters.svelte';
	import DetailedBreakdown from './DetailedBreakdown.svelte';
	import ScenarioDescription from './ScenarioDescription.svelte';

	import filtersStore from '../stores/filters';

	// Keep filters context for ScenarioDescription to read from
	setContext('scenario-filters', filtersStore());

	const {
		selectedModel,
		selectedScenario,
		selectedRegion,
		scenarioOptions
	} = getContext('scenario-filters');

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
	generationChart.formatTickX = (/** @type {any} */ d) => {
		if (d instanceof Date) return String(d.getFullYear());
		return String(d);
	};

	const sync = createSyncedCharts([generationChart]);

	// --- Local state ---
	let selectedGroup = $state('homepage_preview');
	/** @type {FuelTechCode[] | undefined} */
	let seriesLoadsIds = $state([]);

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
		scenarioOptions.set(
			scenarios.map((/** @type {any} */ s) => ({ label: s.label, value: s.id }))
		);

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
			chart.setYDomain(
				/** @type {[number, number]} */ ([processed.yDomain[0], yMax * 1.15])
			);
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

		// Use the canonical projection start year from chart-ticks (e.g. 2024 for aemo2024)
		const highlightDates = chartXHighlightTicks[$selectedModel] || [];
		const overlayDate = highlightDates[0];

		if (overlayDate) {
			overlayStartTime = +overlayDate;
			const endDate = processed.projectionEndTime
				? new Date(processed.projectionEndTime)
				: undefined;

			generationChart.chartStyles.chartOverlayLine = { date: overlayDate };
			if (endDate) {
				generationChart.chartStyles.chartOverlay = { xStartValue: overlayDate, xEndValue: endDate };
				// Use Shading component for projection background fill
				generationChart.shadingData = [[overlayDate, endDate]];
				generationChart.shadingFill = '#FAF9F6';
			}

			// Show only key years + projection start on x-axis
			const lastTick = endDate || new Date('2050-01-01');
			generationChart.xTicks = [
				new Date('2010-01-01'),
				overlayDate,
				new Date('2040-01-01'),
				lastTick
			];
			generationChart.xHighlightTicks = [overlayDate];
			generationChart.chartStyles.yLabelStartPos = overlayDate;
		}
	}

	// --- Fetch data when model/scenario/pathway changes ---
	let fetchCacheKey = $state('');

	$effect(() => {
		if (browser) {
			const key = `${$selectedModel}-${$selectedScenario}-${defaultPathway}-${$selectedRegion}`;
			if (key === fetchCacheKey) return;
			fetchCacheKey = key;

			fetchTechnologyViewData({
				model: $selectedModel,
				region: $selectedRegion,
				scenario: $selectedScenario,
				pathway: defaultPathway
			}).then((/** @type {*} */ data) => {
				cachedData = data;
				dataVersion++;
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
	<header class="flex justify-between gap-24 mb-12">
		<h1 class="text-3xl leading-[3.7rem] mb-4 md:mb-6 md:text-5xl md:leading-5xl md:max-w-[600px]">
			Explore the future of Australia's national electricity market
		</h1>

		<div class="hidden md:block">
			<a
				href="/scenarios"
				class="text-base mt-12 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View scenario explorer
			</a>
		</div>
	</header>

	<div class="md:absolute z-50 md:flex md:mt-12 gap-36">
		<div class="md:w-[28%] bg-white/30 backdrop-blur-sm rounded-lg p-4 -m-4">
			<Filters />
		</div>

		<div class="md:w-[40%]">
			<ScenarioDescription />
		</div>
	</div>
</div>

<div class="max-w-none lg:container">
	<p class="text-xs text-mid-grey text-right mb-2 px-6 lg:px-0">Energy Generation (TWh) by Financial Year</p>
	{#if generationChart.seriesData.length > 0}
		<StratumChart
			chart={generationChart}
			showHeader={false}
			overlayStart={overlayStartTime}
			clampHoverLine={true}
			animate={true}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
		>
			{#snippet tooltip()}
				<Tooltip
					hoverData={generationChart.hoverData}
					hoverKey={generationChart.hoverKey}
					seriesColours={generationChart.seriesColours}
					seriesLabels={generationChart.seriesLabels}
					convertAndFormatValue={generationChart.convertAndFormatValue}
					showTotal={true}
				/>
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
		ongroupchange={handleGroupChange}
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
</div>
