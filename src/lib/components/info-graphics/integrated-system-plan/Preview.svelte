<script>
	import { run } from 'svelte/legacy';

	import { startOfYear, format } from 'date-fns';
	import deepCopy from '$lib/utils/deep-copy';
	import {
		modelSelections,
		scenarios,
		scenarioLabels,
		scenarioDescriptions,
		defaultPathway as selectedPathway,
		scenarioYDomain,
		modelXTicks,
		modelSparklineXTicks
	} from './scenarios';
	import { groups as ftGroupSelections, groupMap, orderMap } from './preview-ft-groups';
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

	
	/**
	 * @typedef {Object} Props
	 * @property {{ ispData: *, outlookEnergyNem: Stats, historyEnergyNemData: StatsData[]  }} data
	 */

	/** @type {Props} */
	let { data } = $props();

	const xKey = 'date';

	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});

	let selectedModel = $state(modelSelections[0]);
	let selectedScenario = $state(scenarios[selectedModel.value][0]);

	let selectedFtGroup = $state(ftGroupSelections[0]);

	let group = $derived(groupMap[selectedFtGroup.value]);
	let order = $derived(orderMap[selectedFtGroup.value]);

	// $: aemo2022 = data.ispData.aemo2022;
	// $: aemo2024 = data.ispData.aemo2024;
	// $: console.log(aemo2022, aemo2024);

	let selectedModelScenarioDescriptions = $derived(scenarioDescriptions[selectedModel.value]);
	let selectedModelScenarioLabels = $derived(scenarioLabels[selectedModel.value]);
	let selectedModelPathway = $derived(selectedPathway[selectedModel.value]);
	let selectedModelYDomain = $derived(scenarioYDomain[selectedModel.value]);
	let selectedModelXTicks = $derived(modelXTicks[selectedModel.value]);
	let selectedModelData = $derived(data.ispData[selectedModel.value]);

	let outlookData = $derived(selectedModelData.outlookEnergyNem.data);
	let filteredWithScenario = $derived(outlookData.filter((d) => d.scenario === selectedScenario));

	let filteredWithPathwayScenario = $derived(filteredWithScenario.filter(
		(d) => d.pathway === selectedModelPathway
	));

	let yDomain = $derived(selectedModelYDomain[selectedScenario]);

	let projectionStatsDatasets = $derived(new Statistic(filteredWithPathwayScenario, 'projection')
		.group(group)
		.reorder(order));

	let projectionTimeSeriesDatasets = $derived(new TimeSeries(
		projectionStatsDatasets.data,
		parseInterval('1Y'),
		'projection',
		fuelTechNameReducer,
		$colourReducer
	)
		.transform()
		.updateMinMax());

	let projectionSeriesNames = $derived(projectionTimeSeriesDatasets.seriesNames);

	/** @type {Object.<string, string>} */
	let projectionSeriesLabels = $derived(projectionTimeSeriesDatasets.seriesLabels);

	/** @type {Object.<string, string>} */
	let projectionSeriesColours = $derived(projectionTimeSeriesDatasets.seriesColours);

	let projectionFuelTechIds = $derived(projectionStatsDatasets.data.reduce(fuelTechReducer, {}));

	// Convert historical data to TWh to match ISP
	let historicalData = $derived(deepCopy(data.historyEnergyNemData).map((/** @type {StatsData} */ d) => {
		const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
		d.history = { ...d.history, data: historyData };
		d.units = 'TWh';
		return d;
	}));

	let historicalStatsDatasets = $derived(new Statistic(historicalData, 'history').group(group).reorder(order));

	let historicalTimeSeriesDatasets = $derived(new TimeSeries(
		historicalStatsDatasets.data,
		parseInterval('1M'),
		'history',
		fuelTechNameReducer,
		$colourReducer
	)
		.transform()
		.rollup(parseInterval('FY'))
		.updateMinMax());

	// update historical date to match ISP
	let updatedHistoricalTimeSeriesDatasets = $derived(historicalTimeSeriesDatasets.data.map((d) => {
		const date = startOfYear(d.date, 1);
		return { ...d, date, time: date.getTime() };
	}));

	let filteredHistoricalTimeSeriesDatasets = $derived(updatedHistoricalTimeSeriesDatasets.filter(
		(d) => d.date.getFullYear() > 2009
	));

	let sparkLineXTicks = $derived(modelSparklineXTicks[selectedModel.value]);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = $state(undefined);

	/** @type {TimeSeriesData | undefined} */
	let historicalHoverData = $state(undefined);

	let generatedCsv = $state('');
	run(() => {
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
	});

	let file = $derived(new Blob([generatedCsv], { type: 'text/plain' }));
	let fileUrl = $derived(URL.createObjectURL(file));

	function handleModelChange(evt) {
		if (selectedModel.value === evt.detail.value) return;
		selectedModel = evt.detail;
		selectedScenario = scenarios[selectedModel.value][0];
	}

	function handleGroupChange(evt) {
		if (selectedFtGroup.value === evt.detail.value) return;
		selectedFtGroup = evt.detail;
	}

	/** @type {string | undefined} */
	let hoverKey = $state();

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

<div class="container max-w-none lg:container">
	<header class="flex justify-between gap-24 mb-12">
		<h1 class="text-3xl leading-[3.7rem] mb-4 md:mb-6 md:text-5xl md:leading-5xl md:max-w-[600px]">
			Explore the future of Australia's national electricity market
		</h1>

		<div class="hidden md:block">
			<a
				class="whitespace-nowrap flex gap-6 justify-between items-center rounded-lg font-space border border-black border-solid bg-white p-6 transition-all text-black hover:text-white hover:bg-black hover:no-underline"
				href={fileUrl}
				download="{selectedModelScenarioLabels[selectedScenario]}.csv"
				target="_download"
			>
				<span>Download Data</span>
				<Icon icon="arrow-down-tray" size={24} />
			</a>
		</div>
	</header>

	<div class="grid grid-cols-6 gap-10 mt-6 mb-6 md:mb-0 relative">
		<div class="absolute -top-9 right-8 hidden md:block">
			<ChartTooltip
				{hoverData}
				{hoverKey}
				defaultText="Energy Generation (TWh) by Financial Year"
				seriesColours={projectionSeriesColours}
				seriesLabels={projectionSeriesLabels}
			/>
		</div>

		<div class="text-dark-grey col-span-6 md:col-span-2 relative">
			<div class="static md:absolute top-0 z-10 text-sm pb-5">
				<div class="md:mr-16 mb-8">
					<p>
						A range of modelled scenarios exist which envision the evolution of Australia's National
						Electricity Market (NEM) over the coming decades.
					</p>
					<p>
						These scenarios aim to steer Australia towards a cost-effective, reliable and safe
						energy system en route to a zero-emissions electricity network.
					</p>

					<p class="mb-0">Explore the scenarios:</p>
					<FormSelect
						options={modelSelections}
						selected={selectedModel}
						on:change={handleModelChange}
					/>
				</div>

				<div
					class="grid gap-3"
					class:grid-cols-3={scenarios[selectedModel.value].length === 3}
					class:grid-cols-2={scenarios[selectedModel.value].length !== 3}
				>
					{#each scenarios[selectedModel.value] as scenario}
						<button
							class="w-full rounded-lg border hover:bg-light-warm-grey px-6 py-4 capitalize text-left leading-sm"
							class:border-mid-warm-grey={selectedScenario !== scenario}
							class:text-mid-grey={selectedScenario !== scenario}
							class:border-dark-grey={selectedScenario === scenario}
							class:bg-light-warm-grey={selectedScenario === scenario}
							value={scenario}
							onclick={() => {
								selectedScenario = scenario;
							}}
						>
							{scenario.split('_').join(' ')}
						</button>
					{/each}
				</div>
			</div>

			<div class="absolute block right-0 md:hidden">
				<ChartTooltip
					{hoverData}
					{hoverKey}
					defaultText="Energy Generation (TWh) by Financial Year"
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
							xAnnotationLines={[{ date: selectedModelXTicks[0] }]}
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

<div class="container max-w-none lg:container mb-6">
	<div class="flex items-center gap-2">
		<p class="mb-0">View:</p>

		<div class="w-[280px]">
			<FormSelect
				options={ftGroupSelections}
				selected={selectedFtGroup}
				on:change={handleGroupChange}
			/>
		</div>
	</div>
</div>

<div class="max-w-none lg:container">
	<div
		class="grid grid-cols-2 grid-flow-dense md:divide-x divide-mid-warm-grey border-t border-b md:border-x border-mid-warm-grey"
		class:md:grid-cols-6={projectionSeriesNames.length === 6}
		class:md:grid-cols-2={projectionSeriesNames.length === 2}
	>
		{#each [...projectionSeriesNames].reverse() as key}
			<SparkLineArea
				class="p-8 even:border-l border-t [&:nth-child(-n+2)]:border-t-0 md:border-0 border-mid-warm-grey"
				dataset={projectionTimeSeriesDatasets.data}
				{key}
				fuelTechId={projectionFuelTechIds[key]}
				xTicks={sparkLineXTicks}
				title={projectionSeriesLabels[key]}
				colour={projectionSeriesColours[key]}
				{hoverData}
				showIcon={true}
				isTechnologyDisplay={true}
				displayUnit="TWh"
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
