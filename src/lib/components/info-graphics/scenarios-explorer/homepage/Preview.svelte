<script>
	import { setContext, getContext } from 'svelte';
	import { startOfYear, format } from 'date-fns';

	import { browser } from '$app/environment';

	import selectOptionsMap from '$lib/utils/select-options-map';
	import { getScenarioJson } from '$lib/scenarios';
	import { getHistory } from '$lib/opennem';

	import filtersStore from '../stores/filters';
	import dataStore from '../stores/data';
	import cacheStore from '../stores/cache';

	import {
		allScenarios,
		defaultModelPathway,
		dataViewUnits,
		dataViewLongLabel,
		dataViewIntervalLabel
	} from '../options';
	import { covertHistoryDataToTWh, processTechnologyData, formatFyTickX } from '../helpers';

	import Icon from '$lib/components/Icon.svelte';

	import Filters from './Filters.svelte';
	import ExplorerChart from './Chart.svelte';
	import DetailedBreakdown from './DetailedBreakdown.svelte';
	import ScenarioDescription from './ScenarioDescription.svelte';
	import ExplorerTooltip from '../Tooltip.svelte';

	setContext('scenario-filters', filtersStore());
	setContext('scenario-data', dataStore());
	setContext('scenario-cache', cacheStore());

	const {
		selectedDisplayView,
		selectedModel,
		selectedScenario,
		selectedPathway,
		selectedRegion,
		selectedDataView,
		selectedChartType,

		scenarioOptions,
		pathwayOptions,

		selectedMultipleScenarios,
		showScenarioOptions
	} = getContext('scenario-filters');

	const {
		selectedGroup,
		projectionStats,
		projectionData,
		historicalData,
		projectionTimeSeries,
		historicalTimeSeries
	} = getContext('scenario-data');

	const { cachedDisplayData } = getContext('scenario-cache');

	let seriesNames = $state([]);
	let seriesItems = $state([]);
	let seriesColours = $state();
	let seriesLabels = $state();
	let seriesData = $state([]);
	let seriesLoadsIds = $state([]);
	/** @type {Array.<number | null>} */
	let yDomain = $state([0, null]);
	/** @type {TimeSeriesData | undefined} */
	let hoverData = $state(undefined);
	/** @type {string | undefined} */
	let hoverKey = $state();

	const handleMousemove = (/** @type {*} */ e) => {
		if (e.detail?.key) {
			hoverKey = e.detail.key;
			hoverData = /** @type {TimeSeriesData} */ (e.detail.data);
		} else {
			hoverKey = undefined;
			hoverData = /** @type {TimeSeriesData} */ (e.detail);
		}
	};

	/**
	 * Get data for by technology view
	 * @param {*} param0
	 */
	async function getTechnologyData({ model, region, scenario, pathway, dataView }) {
		const [historyData, scenarioData] = await Promise.all([
			getHistory(region),
			getScenarioJson(model, scenario)
		]);
		const scenarios = allScenarios.filter((d) => d.model === model);

		updateScenarios(scenarios.map((d) => d.scenarioId));

		const filteredScenarioData = scenarioData.data.filter(
			(d) =>
				d.pathway === pathway &&
				d.region.toLowerCase() === region.toLowerCase() &&
				d.type === dataView
		);

		$projectionData = filteredScenarioData.map((d) => {
			return {
				...d,
				model: model
			};
		});

		$historicalData = covertHistoryDataToTWh(historyData);
	}

	/**
	 *
	 * @param {*[]} scenarios
	 */
	function updateScenarios(scenarios) {
		scenarioOptions.set(selectOptionsMap(scenarios));

		/**
		 * set default values if the selected value is not in the updated list
		 */
		if (!scenarios.find((d) => d === $selectedScenario)) selectedScenario.set(scenarios[0]);
	}

	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});
	let generatedCsv = $state('');
	let defaultPathway = $derived(defaultModelPathway[$selectedModel]);

	$selectedGroup = 'homepage_preview';

	$effect(() => {
		if (browser) {
			getTechnologyData({
				model: $selectedModel,
				region: $selectedRegion,
				scenario: $selectedScenario,
				pathway: defaultPathway,
				dataView: $selectedDataView
			});
		}
	});
	$effect(() => {
		if ($projectionTimeSeries.data.length > 0 && $historicalTimeSeries.data.length > 0) {
			const processed = processTechnologyData({
				projectionTimeSeries: $projectionTimeSeries,
				historicalTimeSeries: $historicalTimeSeries,
				selectedDataView: $selectedDataView,
				selectedModel: $selectedModel
			});

			console.log('processed', processed);

			if (processed) {
				update(processed);
			}
		}
	});

	function update(processed) {
		seriesData = processed.data;
		seriesNames = processed.names;
		seriesColours = processed.colours;
		seriesLabels = processed.labels;
		seriesItems = processed.nameOptions;

		const minMaxY = [
			$projectionTimeSeries.minY,
			$projectionTimeSeries.maxY + ($projectionTimeSeries.maxY * 15) / 100
		];
		yDomain = minMaxY;

		const loadIds = $projectionStats.data.filter((d) => d.isLoad).map((d) => d.id);
		seriesLoadsIds = loadIds;

		$cachedDisplayData[$selectedDisplayView] = {
			data: processed.data,
			names: processed.names,
			colours: processed.colours,
			labels: processed.labels,
			items: processed.nameOptions,
			loadIds: loadIds,
			yDomain: minMaxY
		};
	}

	let xTicks = $derived(
		$selectedModel === 'aemo2024'
			? [
					startOfYear(new Date('2010-01-01')),
					startOfYear(new Date('2024-01-01')),
					startOfYear(new Date('2040-01-01')),
					startOfYear(new Date('2052-01-01'))
				]
			: [
					startOfYear(new Date('2010-01-01')),
					startOfYear(new Date('2023-01-01')),
					startOfYear(new Date('2040-01-01')),
					startOfYear(new Date('2051-01-01'))
				]
	);
	let overlay = $derived(
		$selectedModel === 'aemo2024'
			? {
					xStartValue: startOfYear(new Date('2024-01-01')),
					xEndValue: startOfYear(new Date('2052-01-01'))
				}
			: {
					xStartValue: startOfYear(new Date('2023-01-01')),
					xEndValue: startOfYear(new Date('2051-01-01'))
				}
	);
	let overlayLine = $derived(
		$selectedModel === 'aemo2024'
			? { date: startOfYear(new Date('2024-01-01')) }
			: { date: startOfYear(new Date('2023-01-01')) }
	);
	let defaultText = $derived(
		dataViewLongLabel[$selectedDataView] +
			` (${dataViewUnits[$selectedDataView]}) ` +
			dataViewIntervalLabel[$selectedDataView]
	);
	$effect(() => {
		generatedCsv = '';
		let newGeneratedCsv = ['date', ...seriesNames.map((d) => seriesLabels[d])].join(',') + '\n';

		seriesData.forEach((d) => {
			const date = format(d.date, 'yyyy');
			const row = [date];
			seriesNames.forEach((key) => {
				row.push(auNumber.format(d[key]));
			});
			newGeneratedCsv += row.join(',') + '\n';
		});
		generatedCsv = newGeneratedCsv;
	});
	let file = $derived(new Blob([generatedCsv], { type: 'text/plain' }));
	let fileUrl = $derived(URL.createObjectURL(file));
	let fileName = $derived(`${$selectedModel}-${$selectedScenario}.csv`);
</script>

<div class="container max-w-none lg:container relative">
	<header class="flex justify-between gap-24 mb-12">
		<h1 class="text-3xl leading-[3.7rem] mb-4 md:mb-6 md:text-5xl md:leading-5xl md:max-w-[600px]">
			Explore the future of Australia's national electricity market
		</h1>

		<div class="hidden md:block">
			<!-- <a
				class="whitespace-nowrap flex gap-6 justify-between items-center rounded-lg font-space border border-black border-solid bg-white p-6 transition-all text-black hover:text-white hover:bg-black hover:no-underline"
				href={fileUrl}
				download={fileName}
				target="_download"
			>
				<span>Download Data</span>
				<Icon icon="arrow-down-tray" size={24} />
			</a> -->

			<a
				href="/scenarios"
				class="text-base mt-12 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View scenario explorer
			</a>
		</div>
	</header>

	<div class="md:absolute z-50 md:flex md:mt-12 gap-36">
		<div class="md:w-[28%]">
			<Filters />
		</div>

		<div class="md:w-[40%]">
			<ScenarioDescription />
		</div>
	</div>
</div>

<div class="max-w-none lg:container">
	{#if seriesData.length > 0}
		<div class="relative">
			<ExplorerTooltip
				{hoverData}
				{hoverKey}
				{defaultText}
				{seriesColours}
				{seriesLabels}
				showTotal={true}
			/>
		</div>

		<ExplorerChart
			id="scenarios-preview-chart"
			dataset={seriesData}
			xKey="date"
			yKey={[0, 1]}
			zKey="key"
			{xTicks}
			yTicks={3}
			{yDomain}
			{seriesNames}
			{seriesColours}
			formatTickX={formatFyTickX}
			display="area"
			{overlay}
			{overlayLine}
			{hoverData}
			yLabelStartPos={startOfYear(new Date('2024-01-01'))}
			on:mousemove={handleMousemove}
			on:mouseout={() => {
				hoverKey = undefined;
				hoverData = undefined;
			}}
		/>
	{/if}
</div>

<div class="max-w-none lg:container">
	<DetailedBreakdown
		{hoverData}
		on:mousemove={handleMousemove}
		on:mouseout={() => {
			hoverKey = undefined;
			hoverData = undefined;
		}}
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
