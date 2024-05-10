<script>
	import { startOfYear, format } from 'date-fns';
	import deepCopy from '$lib/utils/deep-copy';
	import {
		modelSelections,
		scenarios,
		scenarioLabels,
		scenarioDescriptions,
		selectedPathway,
		scenarioYDomain,
		modelXTicks,
		modelSparklineXTicks
	} from './scenarios';
	import { explorerGroups as ftGroupSelections, groupMap, orderMap } from './explorer-ft-groups';
	import { formatFyTickX } from './helpers';
	import { fuelTechNameReducer, fuelTechReducer } from '$lib/fuel_techs.js';
	import { colourReducer } from '$lib/stores/theme';

	import Icon from '$lib/components/Icon.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import OverviewChart from './OverviewChart.svelte';
	import SparkLineArea from './SparkLineArea.svelte';
	import ChartTooltip from './ChartTooltip.svelte';

	import parseInterval from '$lib/utils/intervals';
	import Statistic from '$lib/utils/Statistic';
	import TimeSeries from '$lib/utils/TimeSeries';

	/** @type {{ ispData: *, outlookEnergyNem: Stats, historyEnergyNemData: StatsData[]  }} */
	export let data;

	const xKey = 'date';

	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});

	let selectedModel = modelSelections[0];
	let selectedScenario = scenarios[selectedModel.value][0];

	let selectedFtGroup = ftGroupSelections[0];

	$: group = groupMap[selectedFtGroup.value];
	$: order = orderMap[selectedFtGroup.value];

	// $: aemo2022 = data.ispData.aemo2022;
	// $: aemo2024 = data.ispData.aemo2024;
	// $: console.log(aemo2022, aemo2024);

	$: selectedModelScenarioDescriptions = scenarioDescriptions[selectedModel.value];
	$: selectedModelScenarioLabels = scenarioLabels[selectedModel.value];
	$: selectedModelPathway = selectedPathway[selectedModel.value];
	$: selectedModelYDomain = scenarioYDomain[selectedModel.value];
	$: selectedModelXTicks = modelXTicks[selectedModel.value];
	$: selectedModelData = data.ispData[selectedModel.value];
	$: selectedModelScenarios = scenarios[selectedModel.value].map((s) => ({
		value: s,
		label: s.split('_').join(' ')
	}));

	$: outlookData = selectedModelData.outlookEnergyNem.data;
	$: console.log('outlookData', outlookData);

	$: filteredWithScenario = outlookData.filter((d) => d.scenario === selectedScenario);

	$: filteredWithPathwayScenario = filteredWithScenario.filter(
		(d) => d.pathway === selectedModelPathway
	);

	$: yDomain = selectedModelYDomain[selectedScenario];

	$: projectionStatsDatasets = new Statistic(filteredWithPathwayScenario, 'projection')
		.group(group)
		.reorder(order);

	$: projectionTimeSeriesDatasets = new TimeSeries(
		projectionStatsDatasets.data,
		parseInterval('1Y'),
		'projection',
		fuelTechNameReducer,
		$colourReducer
	)
		.transform()
		.updateMinMax();

	$: projectionSeriesNames = projectionTimeSeriesDatasets.seriesNames;
	$: console.log('projectionTimeSeriesDatasets', projectionTimeSeriesDatasets);

	/** @type {Object.<string, string>} */
	$: projectionSeriesLabels = projectionTimeSeriesDatasets.seriesLabels;

	/** @type {Object.<string, string>} */
	$: projectionSeriesColours = projectionTimeSeriesDatasets.seriesColours;

	$: projectionFuelTechIds = projectionStatsDatasets.data.reduce(fuelTechReducer, {});

	// Convert historical data to TWh to match ISP
	$: historicalData = deepCopy(data.historyEnergyNemData).map((/** @type {StatsData} */ d) => {
		const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
		d.history = { ...d.history, data: historyData };
		d.units = 'TWh';
		return d;
	});

	$: historicalStatsDatasets = new Statistic(historicalData, 'history').group(group).reorder(order);

	$: historicalTimeSeriesDatasets = new TimeSeries(
		historicalStatsDatasets.data,
		parseInterval('1M'),
		'history',
		fuelTechNameReducer,
		$colourReducer
	)
		.transform()
		.rollup(parseInterval('FY'))
		.updateMinMax();

	// update historical date to match ISP
	$: updatedHistoricalTimeSeriesDatasets = historicalTimeSeriesDatasets.data.map((d) => {
		const date = startOfYear(d.date, 1);
		return { ...d, date, time: date.getTime() };
	});

	$: filteredHistoricalTimeSeriesDatasets = updatedHistoricalTimeSeriesDatasets.filter(
		(d) => d.date.getFullYear() < 2024 && d.date.getFullYear() > 2009
	);

	$: sparkLineXTicks = modelSparklineXTicks[selectedModel.value];

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {TimeSeriesData | undefined} */
	let historicalHoverData = undefined;

	let generatedCsv = '';
	$: {
		generatedCsv = '';
		generatedCsv +=
			[
				'date',
				...projectionTimeSeriesDatasets.seriesNames.map(
					(d) => projectionTimeSeriesDatasets.seriesLabels[d]
				)
			].join(',') + '\n';

		projectionTimeSeriesDatasets.data.forEach((d) => {
			const date = format(d.date, 'yyyy');
			const row = [date];
			projectionTimeSeriesDatasets.seriesNames.forEach((key) => {
				row.push(auNumber.format(d[key]));
			});
			generatedCsv += row.join(',') + '\n';
		});
	}

	$: file = new Blob([generatedCsv], { type: 'text/plain' });
	$: fileUrl = URL.createObjectURL(file);

	function handleModelChange(evt) {
		if (selectedModel.value === evt.detail.value) return;
		selectedModel = evt.detail;
		selectedScenario = scenarios[selectedModel.value][0];
	}

	function handleGroupChange(evt) {
		if (selectedFtGroup.value === evt.detail.value) return;
		selectedFtGroup = evt.detail;
	}

	function handleScenarioChange(evt) {
		if (selectedScenario === evt.detail.value) return;
		selectedScenario = evt.detail.value;
	}

	/** @type {string | undefined} */
	let hoverKey;

	const handleMousemove = (/** @type {*} */ e) => {
		if (e.detail.key) {
			hoverKey = e.detail.key;
			hoverData = /** @type {TimeSeriesData} */ (e.detail.data);
		} else {
			hoverKey = undefined;
			hoverData = /** @type {TimeSeriesData} */ (e.detail);
		}
	};

	const handleHistoricalMousemove = (/** @type {*} */ e) => {
		if (e.detail.key) {
			historicalHoverData = /** @type {TimeSeriesData} */ (e.detail.data);
		} else {
			historicalHoverData = /** @type {TimeSeriesData} */ (e.detail);
		}
	};
</script>

<!-- container max-w-none lg:container -->

<header class="container max-w-none lg:container flex gap-2 mb-12 divide-x divide-warm-grey">
	<div>
		<p class="mb-0">Model:</p>

		<div class="w-[240px]">
			<FormSelect
				options={modelSelections}
				selected={selectedModel}
				on:change={handleModelChange}
			/>
		</div>
	</div>

	<div class="px-6">
		<p class="mb-0">Scenarios:</p>

		<div class="w-[280px]">
			<FormSelect
				options={selectedModelScenarios}
				selected={selectedScenario}
				on:change={handleScenarioChange}
			/>
		</div>
	</div>

	<div class="px-6">
		<p class="mb-0">View:</p>

		<div class="w-[280px]">
			<FormSelect
				options={ftGroupSelections}
				selected={selectedFtGroup}
				on:change={handleGroupChange}
			/>
		</div>
	</div>

	<!-- <div class="hidden md:block">
		<a
			class="whitespace-nowrap flex gap-6 justify-between items-center rounded-lg font-space border border-black border-solid bg-white p-6 transition-all text-black hover:text-white hover:bg-black hover:no-underline"
			href={fileUrl}
			download="{selectedModelScenarioLabels[selectedScenario]}.csv"
			target="_download"
		>
			<span>Download Data</span>
			<Icon icon="arrow-down-tray" size={24} />
		</a>
	</div> -->
</header>
<div class="px-6">
	<div class="grid grid-cols-6 gap-10 mt-6 mb-6 md:mb-0 relative">
		<div class="absolute -right-8 hidden md:block">
			<ChartTooltip
				{hoverData}
				{hoverKey}
				defaultText="Energy Generation (TWh) by Financial Year"
				seriesColours={projectionSeriesColours}
				seriesLabels={projectionSeriesLabels}
			/>
		</div>

		<div class="text-dark-grey col-span-6 md:col-span-2 relative">
			<div class="absolute -right-8 mt-10 block md:hidden">
				<ChartTooltip
					{hoverData}
					{hoverKey}
					seriesColours={projectionSeriesColours}
					seriesLabels={projectionSeriesLabels}
				/>
			</div>

			<div class="invisible absolute md:visible md:relative">
				<OverviewChart
					dataset={filteredHistoricalTimeSeriesDatasets}
					{xKey}
					xTicks={[startOfYear(new Date('2010-01-01')), startOfYear(new Date('2023-01-01'))]}
					yKey={[0, 1]}
					yTicks={0}
					{yDomain}
					zKey="key"
					seriesNames={historicalTimeSeriesDatasets.seriesNames}
					seriesColours={historicalTimeSeriesDatasets.seriesColours}
					formatTickX={formatFyTickX}
					hoverData={historicalHoverData}
					id="historical-chart"
					on:mousemove={handleHistoricalMousemove}
					on:mouseout={() => (historicalHoverData = undefined)}
				/>
			</div>
		</div>

		<div class="col-span-6 md:col-span-4">
			{#if filteredWithPathwayScenario.length === 0}
				<p class="mt-6">No data for this scenario and pathway</p>
			{:else}
				<div class="relative">
					<div class="block md:hidden w-[300px] absolute -left-[305px]">
						<OverviewChart
							dataset={filteredHistoricalTimeSeriesDatasets}
							{xKey}
							xTicks={[startOfYear(new Date('2010-01-01')), startOfYear(new Date('2023-01-01'))]}
							yKey={[0, 1]}
							yTicks={0}
							{yDomain}
							zKey="key"
							seriesNames={historicalTimeSeriesDatasets.seriesNames}
							seriesColours={historicalTimeSeriesDatasets.seriesColours}
							formatTickX={formatFyTickX}
							hoverData={historicalHoverData}
							id="historical-chart"
							clip={false}
							on:mousemove={handleHistoricalMousemove}
							on:mouseout={() => (historicalHoverData = undefined)}
						/>
					</div>
					<div class="w-full">
						<OverviewChart
							title={`Energy Generation (TWh) by Financial Year`}
							scenarioTitle={selectedModelScenarioLabels[selectedScenario]}
							description={selectedModelScenarioDescriptions[selectedScenario]}
							dataset={projectionTimeSeriesDatasets.data}
							{xKey}
							xTicks={selectedModelXTicks}
							yKey={[0, 1]}
							yTicks={2}
							{yDomain}
							zKey="key"
							seriesNames={projectionTimeSeriesDatasets.seriesNames}
							seriesColours={projectionTimeSeriesDatasets.seriesColours}
							{hoverData}
							overlay={true}
							bgClass="bg-light-warm-grey"
							id="projection-chart"
							formatTickX={formatFyTickX}
							on:mousemove={handleMousemove}
							on:mouseout={() => {
								hoverKey = undefined;
								hoverData = undefined;
							}}
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<div class="max-w-none lg:container">
	<div
		class="grid grid-cols-2 grid-flow-dense gap-3"
		class:md:grid-cols-6={projectionSeriesNames.length === 6}
		class:md:grid-cols-2={projectionSeriesNames.length === 2}
		class:md:grid-cols-4={projectionSeriesNames.length !== 2 && projectionSeriesNames.length !== 6}
	>
		{#each [...projectionSeriesNames].reverse() as key}
			<SparkLineArea
				class="p-8 border border-mid-warm-grey"
				dataset={projectionTimeSeriesDatasets.data}
				{key}
				fuelTechId={projectionFuelTechIds[key]}
				xTicks={sparkLineXTicks}
				title={projectionSeriesLabels[key]}
				colour={projectionSeriesColours[key]}
				{hoverData}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>
		{/each}
	</div>

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
