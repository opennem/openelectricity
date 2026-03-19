<script>
	import { setContext, getContext, onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import { colourReducer } from '$lib/stores/theme';
	import { regionsNemOnlyOptions as regionOptions } from '$lib/regions';
	import { modelOptions } from './page-data-options/models';

	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';

	import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';
	import { createSyncedCharts } from '$lib/components/charts/v2/sync.js';
	import { createRequestGuard } from '$lib/utils/request-guard';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import ScenarioChart from './components/ScenarioChart.svelte';
	import TableTechnology from './components/TableTechnology.svelte';
	import TableScenario from './components/TableScenario.svelte';
	import TableRegion from './components/TableRegion.svelte';
	import DetailedTechnology from './components/DetailedTechnology.svelte';
	import DetailedScenario from './components/DetailedScenario.svelte';
	import DetailedRegion from './components/DetailedRegion.svelte';

	import filtersStore from './stores/filters';
	import byScenarioStore from './stores/by-scenario';

	import {
		fetchTechnologyViewData,
		fetchScenarioViewData,
		fetchRegionViewData
	} from './page-data-options/fetch';
	import processTechnology from './page-data-options/process-technology';
	import processScenario from './page-data-options/process-scenario';
	import processRegion from './page-data-options/process-region';

	let { data } = $props();
	let articles = $derived(data.articles);
	let filters = $derived(data.filters);

	setContext('scenario-filters', filtersStore());
	setContext('by-scenario', byScenarioStore());

	// --- ChartStore v2 instances ---
	const generationChart = new ChartStore({
		key: Symbol('generation'),
		title: 'Generation',
		chartType: 'stacked-area',
		chartStyles: { chartHeightClasses: 'h-[400px] md:h-[450px]' }
	});
	generationChart.yTicks = 2;

	const emissionsChart = new ChartStore({
		key: Symbol('emissions'),
		title: 'Emissions',
		chartType: 'stacked-area',
		chartStyles: { chartHeightClasses: 'h-[200px] md:h-[225px]' }
	});
	emissionsChart.yTicks = 2;

	const intensityChart = new ChartStore({
		key: Symbol('intensity'),
		title: 'Intensity',
		chartType: 'line',
		hideDataOptions: true,
		hideChartTypeOptions: true,
		chartStyles: { chartHeightClasses: 'h-[200px] md:h-[225px]' }
	});
	intensityChart.yTicks = 2;

	const capacityChart = new ChartStore({
		key: Symbol('capacity'),
		title: 'Capacity',
		chartType: 'stacked-area',
		chartStyles: { chartHeightClasses: 'h-[400px] md:h-[450px]' }
	});
	capacityChart.yTicks = 2;

	const charts = {
		generation: generationChart,
		emissions: emissionsChart,
		intensity: intensityChart,
		capacity: capacityChart
	};
	const chartsList = [generationChart, emissionsChart, intensityChart, capacityChart];
	const chartEntries = [
		{ key: 'generation', chart: generationChart },
		{ key: 'emissions', chart: emissionsChart },
		{ key: 'intensity', chart: intensityChart },
		{ key: 'capacity', chart: capacityChart }
	];
	const sync = createSyncedCharts(chartsList);
	setContext('scenario-charts', charts);

	const {
		isTechnologyViewSection,
		isScenarioViewSection,
		isRegionViewSection,
		selectedRegion,
		selectedDataType,
		selectedCharts,
		singleSelectionData,
		selectedFuelTechGroup,
		multiSelectionData,
		includeBatteryAndLoads,
		showScenarioOptions
	} = getContext('scenario-filters');
	const { selectionData } = getContext('by-scenario');

	// --- Fullscreen mode ---
	/** @type {{ setFullscreen: (value: boolean) => void } | undefined} */
	const layoutContext = getContext('layout-fullscreen');

	let isFullscreen = $derived($page.url.searchParams.get('fullscreen') === 'true');

	$effect(() => {
		layoutContext?.setFullscreen(isFullscreen);
	});

	onDestroy(() => {
		layoutContext?.setFullscreen(false);
	});

	function toggleFullscreen() {
		const newFullscreen = !isFullscreen;
		const url = new URL($page.url);
		if (newFullscreen) {
			url.searchParams.set('fullscreen', 'true');
		} else {
			url.searchParams.delete('fullscreen');
		}
		goto(url.toString(), { noScroll: true });
	}

	// --- Shortcuts toast ---
	let showShortcutsToast = $state(false);

	/**
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		const target = /** @type {HTMLElement} */ (e.target);
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				showShortcutsToast = false;
			} else if (isFullscreen) {
				toggleFullscreen();
			}
			return;
		}

		if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
			toggleFullscreen();
			return;
		}

		if (e.key === '?') {
			showShortcutsToast = !showShortcutsToast;
			return;
		}
	}

	/** @type {FuelTechCode[] | undefined} */
	let seriesLoadsIds = $state([]);

	/** @type {string[]} */
	let hiddenRowNames = $state([]);

	/** @type {number | undefined} */
	let projectionEndTime = $state();

	/** @type {number | undefined} */
	let projectionStartTime = $state();

	/** @type {number | undefined} */
	let derivedStartTime = $state();
	/** @type {number | undefined} */
	let derivedEndTime = $state();

	// Overlay start derived from processed data's projectionStartTime
	let overlayStartTime = $derived(projectionStartTime);

	// --- Chart update helpers ---

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
			chart.setYDomain(
				/** @type {[number, number]} */ ([processed.yDomain[0], processed.yDomain[1]])
			);
		} else {
			chart.setYDomain(undefined);
		}
	}

	/**
	 * @param {ChartStore} chart
	 */
	function resetChart(chart) {
		chart.seriesData = [];
		chart.seriesNames = [];
		chart.seriesColours = {};
		chart.seriesLabels = {};
		chart.setYDomain(undefined);
	}

	/**
	 * @param {{
	 * 		processedEnergy: ProcessedDataViz,
	 * 		processedCapacity: ProcessedDataViz,
	 * 		processedEmissions: ProcessedDataViz | undefined,
	 * 		processedIntensity: ProcessedDataViz | undefined
	 * }} param0
	 */
	function updateAllCharts({
		processedEnergy,
		processedCapacity,
		processedEmissions,
		processedIntensity
	}) {
		updateChart(generationChart, processedEnergy);
		generationChart.chartStyles.chartHeightClasses = 'h-[400px] md:h-[450px]';

		updateChart(capacityChart, processedCapacity);
		capacityChart.chartStyles.chartHeightClasses = 'h-[400px] md:h-[450px]';

		if (processedEmissions) {
			updateChart(emissionsChart, processedEmissions);
		} else {
			resetChart(emissionsChart);
		}

		if (processedIntensity) {
			updateChart(intensityChart, processedIntensity);
		} else {
			resetChart(intensityChart);
		}

		projectionStartTime = processedEnergy.projectionStartTime ?? undefined;
		projectionEndTime = processedEnergy.projectionEndTime ?? undefined;
		derivedStartTime = processedEnergy.derivedStartTime ?? undefined;
		derivedEndTime = processedEnergy.derivedEndTime ?? undefined;
	}

	// --- Sync chart overlay styling with projection start/end ---
	$effect(() => {
		if (overlayStartTime != null) {
			const startDate = new Date(overlayStartTime);
			const endDate = projectionEndTime != null ? new Date(projectionEndTime) : undefined;

			chartsList.forEach((chart) => {
				chart.chartStyles.chartOverlayLine = { date: startDate };
				if (endDate) {
					chart.chartStyles.chartOverlay = { xStartValue: startDate, xEndValue: endDate };
				}

				// Shade derived (interpolated) region with a pale overlay
				if (derivedStartTime != null && derivedEndTime != null) {
					chart.fgShadingData = [[new Date(derivedStartTime), new Date(derivedEndTime)]];
					chart.fgShadingFill = 'rgba(180, 180, 180, 0.15)';
				} else {
					chart.fgShadingData = [];
				}
			});
		}
	});

	// --- Lazy load mini charts when scrolled near ---
	let showDetailedSection = $state(false);

	/**
	 * Svelte action: renders content when the element enters the viewport.
	 * @param {HTMLElement} node
	 */
	function lazyLoad(node) {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					showDetailedSection = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}

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
	 * @param {number} time
	 */
	function handleFocus(time) {
		sync.toggleFocus(time);
	}

	/**
	 * @param {{ name: string, isMetaPressed: boolean, allNames: string[] }} param0
	 */
	function toggleRow({ name, isMetaPressed, allNames }) {
		if (isMetaPressed) {
			hiddenRowNames = allNames.filter((n) => n !== name);
		} else {
			if (hiddenRowNames.includes(name)) {
				hiddenRowNames = hiddenRowNames.filter((n) => n !== name);
			} else {
				hiddenRowNames = [...hiddenRowNames, name];

				if (hiddenRowNames.length === allNames.length) {
					hiddenRowNames = [];
				}
			}
		}
	}

	// Map generation series names to capacity series names (they differ by type suffix,
	// e.g. 'coal.energy.grouped' vs 'coal.capacity.grouped')
	let genToCapNameMap = $derived.by(() => {
		/** @type {Record<string, string>} */
		const capByCode = {};
		for (const name of capacityChart.seriesNames) {
			capByCode[name.split('.')[0]] = name;
		}
		/** @type {Record<string, string>} */
		const map = {};
		for (const name of generationChart.seriesNames) {
			const code = name.split('.')[0];
			if (capByCode[code]) map[name] = capByCode[code];
		}
		return map;
	});

	// Sync hidden row names to all charts
	$effect(() => {
		generationChart.hiddenSeriesNames = hiddenRowNames;
		emissionsChart.hiddenSeriesNames = hiddenRowNames;
		intensityChart.hiddenSeriesNames = hiddenRowNames;

		// Capacity uses different series name suffixes — translate
		capacityChart.hiddenSeriesNames = hiddenRowNames
			.map((name) => genToCapNameMap[name])
			.filter(Boolean);
	});

	// Set default focus time (2030) after mount
	onMount(() => {
		setTimeout(() => {
			chartsList.forEach((chart) => {
				chart.focusTime = 1893416400000;
			});
		}, 1500);
	});

	// --- Data fetching and processing ---

	// Data caches — plain variables (NOT $state) to avoid deep proxy overhead.
	// Reactive version counters trigger processing effects when new data arrives.
	/** @type {*} */
	let cachedTechnologyData;
	/** @type {*} */
	let cachedScenarioData;
	/** @type {*} */
	let cachedRegionsData;

	let techDataVersion = $state(0);
	let scenarioDataVersion = $state(0);
	let regionDataVersion = $state(0);

	// Cache keys to avoid re-fetching when switching views with the same params
	/** @type {string} */
	let techCacheKey = $state('');
	/** @type {string} */
	let scenarioCacheKey = $state('');
	/** @type {string} */
	let regionCacheKey = $state('');

	// Guards to discard stale fetch responses
	const techGuard = createRequestGuard();
	const scenarioGuard = createRequestGuard();
	const regionGuard = createRequestGuard();

	/**
	 * @param {{
	 * projectionEnergyData: StatsData[],
	 * projectionCapacityData: StatsData[],
	 * projectionEmissionsData: StatsData[],
	 * historyEnergyData: StatsData[],
	 * historyCapacityData: StatsData[],
	 * historyEmisssionsData: StatsData[]
	 * }} param0
	 */
	function processTechnologyData({
		projectionEnergyData,
		projectionCapacityData,
		projectionEmissionsData,
		historyEnergyData,
		historyCapacityData,
		historyEmisssionsData
	}) {
		const processedEnergy = processTechnology.generation({
			projection: projectionEnergyData,
			history: historyEnergyData,
			group: $selectedFuelTechGroup,
			colourReducer: $colourReducer,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedEmissions =
			projectionEmissionsData.length > 0
				? processTechnology.emissions({
						projection: projectionEmissionsData,
						history: historyEmisssionsData,
						includeBatteryAndLoads: $includeBatteryAndLoads
					})
				: undefined;

		const processedCapacity = processTechnology.capacity({
			projection: projectionCapacityData,
			history: historyCapacityData,
			group: $selectedFuelTechGroup,
			colourReducer: $colourReducer,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedIntensity = processedEmissions
			? processTechnology.intensity({
					processedEmissions,
					processedEnergy
				})
			: undefined;

		return {
			processedEnergy,
			processedCapacity,
			processedEmissions,
			processedIntensity
		};
	}

	$effect(() => {
		if ($isTechnologyViewSection && techDataVersion > 0) {
			const { processedEnergy, processedCapacity, processedEmissions, processedIntensity } =
				processTechnologyData(cachedTechnologyData);

			seriesLoadsIds = /** @type {FuelTechCode[] | undefined} */ (processedEnergy.seriesLoadsIds);

			updateAllCharts({
				processedEnergy,
				processedCapacity,
				processedEmissions,
				processedIntensity
			});
		}
	});

	$effect(() => {
		if ($isTechnologyViewSection) {
			const key = `${$singleSelectionData.model}-${$singleSelectionData.scenario}-${$singleSelectionData.pathway}-${$selectedRegion}`;
			if (key === techCacheKey) return;
			techCacheKey = key;

			const { isCurrent } = techGuard.next();
			fetchTechnologyViewData({
				model: $singleSelectionData.model,
				scenario: $singleSelectionData.scenario,
				pathway: $singleSelectionData.pathway,
				region: $selectedRegion
			}).then((data) => {
				if (!isCurrent()) return;
				cachedTechnologyData = data;
				techDataVersion++;
			});
		}
	});

	/**
	 * @param {{
	 * projectionsData:
	 * {
	 * 	id: string,
	 * 	model: string,
	 * 	scenario: string,
	 * 	pathway: string,
	 * 	projectionEnergyData: StatsData[],
	 * 	projectionCapacityData: StatsData[],
	 * 	projectionEmissionsData: StatsData[]
	 * }[],
	 * historyEnergyData: StatsData[],
	 * historyEmisssionsData: StatsData[],
	 * historyCapacityData: StatsData[]
	 * }} param0
	 */
	function processScenarioData({
		projectionsData,
		historyEnergyData,
		historyEmisssionsData,
		historyCapacityData
	}) {
		const processedEnergy = processScenario.generation({
			projections: projectionsData,
			history: historyEnergyData,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedCapacity = processScenario.capacity({
			projections: projectionsData,
			history: historyCapacityData,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedEmissions = processScenario.emissions({
			projections: projectionsData,
			history: historyEmisssionsData,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedIntensity = processedEmissions
			? processScenario.intensity({
					processedEmissions,
					processedEnergy
				})
			: undefined;

		// process colours
		const updatedSeriesColours = processScenario.getScenarioColours(processedEnergy.seriesNames);

		// update colours
		processedEnergy.seriesColours = updatedSeriesColours;
		processedCapacity.seriesColours = updatedSeriesColours;
		processedEmissions.seriesColours = updatedSeriesColours;
		if (processedIntensity) {
			processedIntensity.seriesColours = updatedSeriesColours;
		}

		updateAllCharts({
			processedEnergy,
			processedCapacity,
			processedEmissions,
			processedIntensity
		});
	}

	$effect(() => {
		if ($isScenarioViewSection && scenarioDataVersion > 0) {
			$selectionData = $multiSelectionData;
			processScenarioData(cachedScenarioData);
		}
	});

	$effect(() => {
		if ($isScenarioViewSection) {
			$selectionData = $multiSelectionData;

			const key = `${$multiSelectionData.map((/** @type {any} */ s) => s.id).join(',')}-${$selectedRegion}`;
			if (key === scenarioCacheKey) return;
			scenarioCacheKey = key;

			const { isCurrent } = scenarioGuard.next();
			fetchScenarioViewData({ scenarios: $multiSelectionData, region: $selectedRegion }).then(
				(data) => {
					if (!isCurrent()) return;
					cachedScenarioData = data;
					scenarioDataVersion++;
				}
			);
		}
	});

	/**
	 * @param {*} regionsData
	 */
	function processRegionData(regionsData) {
		const processedEnergy = processRegion.generation({
			regionsData,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedCapacity = processRegion.capacity({
			regionsData,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedEmissions = processRegion.emissions({
			regionsData,
			includeBatteryAndLoads: $includeBatteryAndLoads
		});

		const processedIntensity = processedEmissions
			? processRegion.intensity({
					processedEmissions,
					processedEnergy
				})
			: undefined;

		updateAllCharts({
			processedEnergy,
			processedCapacity,
			processedEmissions,
			processedIntensity
		});
	}

	$effect(() => {
		if ($isRegionViewSection && regionDataVersion > 0) {
			processRegionData(cachedRegionsData);
		}
	});

	$effect(() => {
		if ($isRegionViewSection) {
			const key = `${$singleSelectionData.model}-${$singleSelectionData.scenario}-${$singleSelectionData.pathway}`;
			if (key === regionCacheKey) return;
			regionCacheKey = key;

			const regionsOnly = regionOptions.filter((r) => r.value !== '_all');

			const { isCurrent } = regionGuard.next();
			fetchRegionViewData({
				regions: regionsOnly,
				model: $singleSelectionData.model,
				scenario: $singleSelectionData.scenario,
				pathway: $singleSelectionData.pathway
			}).then((regionsData) => {
				if (!isCurrent()) return;
				cachedRegionsData = regionsData;
				regionDataVersion++;
			});
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- TODO: Update preview image -->
<Meta
	title="Scenarios"
	description="Explore the future of Australia's national electricity market."
	image="/img/preview.jpg"
/>

{#if !isFullscreen}
	<PageHeaderSimple>
		{#snippet heading()}
			<div>
				<h1 class="tracking-widest text-center">Scenario Explorer</h1>
			</div>
		{/snippet}
		{#snippet subheading()}
			<div>
				<p class="text-sm text-center w-full md:w-[600px] mx-auto">
					Explore the future of Australia's electricity market. A range of modelled scenarios exist
					which envision the future of the NEM. These scenarios aim to steer Australia towards a
					cost-effective, reliable and safe energy system en route to a zero-emissions network
				</p>
			</div>
		{/snippet}
	</PageHeaderSimple>
{/if}

<Filters {isFullscreen} onfullscreenchange={toggleFullscreen} onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)} />

<!-- WORKAROUND: class:relative={!$showScenarioOptions} to allow Pathway dropdown to layer above -->
<div
	class="max-w-none py-10 md:p-16 md:flex gap-12 z-30 border-b border-mid-warm-grey pb-24 mb-24"
	class:relative={!$showScenarioOptions}
>
	<section class="w-full flex flex-col gap-12 md:w-[60%]">
		{#if generationChart.seriesData.length === 0}
			{#each $selectedCharts as key (key)}
				{@const isHalfHeight = key === 'emissions' || key === 'intensity'}
				<div class="relative">
					<div
						class="bg-warm-grey animate-pulse rounded-xl w-full {isHalfHeight
							? 'h-[200px] md:h-[225px]'
							: 'h-[400px] md:h-[450px]'}"
					></div>
					<div class="absolute inset-0 flex items-center justify-center">
						<LogoMarkLoader />
					</div>
				</div>
			{/each}
		{:else}
			{#each chartEntries as { key, chart } (key)}
				{#if $selectedCharts.includes(key)}
					<ScenarioChart
						{chart}
						projectionStartTime={overlayStartTime}
						{seriesLoadsIds}
						onhover={handleHover}
						onhoverend={handleHoverEnd}
						onfocus={handleFocus}
					/>
				{/if}
			{/each}
		{/if}
	</section>

	<section class="md:w-[40%]">
		{#if generationChart.seriesData.length === 0}
			<div class="flex flex-col gap-3 pt-12">
				{#each Array(8) as _}
					<Skeleton variant="text" class="h-6" />
				{/each}
			</div>
		{:else if $isTechnologyViewSection}
			<TableTechnology {seriesLoadsIds} {hiddenRowNames} onrowclick={toggleRow} />
		{:else if $isScenarioViewSection}
			<TableScenario title="Scenario" {hiddenRowNames} onrowclick={toggleRow} />
		{:else if $isRegionViewSection}
			<TableRegion title="Region" {seriesLoadsIds} {hiddenRowNames} onrowclick={toggleRow} />
		{/if}
	</section>
</div>

{#if !isFullscreen}
	<div class="text-base min-h-[600px]" use:lazyLoad>
		{#if showDetailedSection}
			{#if $isTechnologyViewSection}
				<DetailedTechnology
					{seriesLoadsIds}
					onhover={handleHover}
					onhoverend={handleHoverEnd}
					onfocus={handleFocus}
				/>
			{/if}

			{#if $isScenarioViewSection}
				<DetailedScenario
					onhover={handleHover}
					onhoverend={handleHoverEnd}
					onfocus={handleFocus}
				/>
			{/if}

			{#if $isRegionViewSection}
				<DetailedRegion
					onhover={handleHover}
					onhoverend={handleHoverEnd}
					onfocus={handleFocus}
				/>
			{/if}
		{:else}
			<div class="container max-w-none lg:container px-0 md:px-16 lg:px-40">
				<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
					{#each Array(6) as _}
						<Skeleton variant="chart" class="h-[250px] rounded-xl" />
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<ArticlesSection
		analysisArticles={articles.filter(
			(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
		)}
	/>
{/if}

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Enter / exit full screen', keys: ['F'] },
		{ label: 'Show shortcuts', keys: ['?'] },
		{ label: 'Exit', keys: ['Esc'] }
	]}
/>
