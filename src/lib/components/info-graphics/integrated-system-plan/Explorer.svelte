<script>
	import { run } from 'svelte/legacy';

	import { startOfYear, format } from 'date-fns';
	import deepCopy from '$lib/utils/deep-copy';
	import {
		modelSelections,
		scenarios,
		scenarioLabels,
		scenarioDescriptions,
		defaultPathway,
		scenarioYDomain,
		modelXTicks,
		modelSparklineXTicks
	} from './scenarios';
	import { explorerGroups as ftGroupSelections, groupMap, orderMap } from './explorer-ft-groups';
	import { formatFyTickX, formatValue } from './helpers';
	import { fuelTechNameReducer, fuelTechReducer, isLoad, loadFuelTechs } from '$lib/fuel_techs.js';
	import { colourReducer } from '$lib/stores/theme';

	import Icon from '$lib/components/Icon.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import ExplorerChart from './Explorer/Chart.svelte';
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
	let selectedPathway = $state('');

	let selectedFtGroup = $state(ftGroupSelections[0]);

	let ispData = $derived(data.ispData);

	let group = $derived(groupMap[selectedFtGroup.value]);
	let order = $derived(orderMap[selectedFtGroup.value]);

	// $: aemo2022 = data.ispData.aemo2022;
	// $: aemo2024 = data.ispData.aemo2024;
	// $: console.log(aemo2022, aemo2024);

	let selectedModelScenarioDescriptions = $derived(scenarioDescriptions[selectedModel.value]);
	let selectedModelScenarioLabels = $derived(scenarioLabels[selectedModel.value]);
	// $: selectedModelPathway = selectedPathway[selectedModel.value];
	let selectedModelYDomain = $derived(scenarioYDomain[selectedModel.value]);
	let selectedModelXTicks = $derived(modelXTicks[selectedModel.value]);
	let selectedModelData = $derived(ispData[selectedModel.value]);
	let selectedModelPathways = $derived(
		selectedModelData.pathways.map((p) => ({
			value: p,
			label: p.split('_').join(' ')
		}))
	);
	run(() => {
		selectedPathway = defaultPathway[selectedModel.value];
	});
	let selectedModelScenarios = $derived(
		scenarios[selectedModel.value].map((s) => ({
			value: s,
			label: s.split('_').join(' ')
		}))
	);

	let outlookData = $derived(selectedModelData.outlookEnergyNem.data);

	let filteredWithScenario = $derived(outlookData.filter((d) => d.scenario === selectedScenario));

	let filteredWithPathwayScenario = $derived(
		filteredWithScenario.filter((d) => d.pathway === selectedPathway)
	);

	run(() => {
		console.log('filteredWithPathwayScenario', filteredWithPathwayScenario);
	});

	// $: yDomain = selectedModelYDomain[selectedScenario];

	let projectionStatsDatasets = $derived(
		filteredWithPathwayScenario.length
			? new Statistic(filteredWithPathwayScenario, 'projection').group(group).reorder(order)
			: null
	);

	let projectionTimeSeriesDatasets = $derived(
		projectionStatsDatasets
			? new TimeSeries(
					projectionStatsDatasets.data,
					parseInterval('1Y'),
					'projection',
					fuelTechNameReducer,
					$colourReducer
				)
					.transform()
					.updateMinMax()
			: null
	);

	let projectionSeriesNames = $derived(
		projectionTimeSeriesDatasets ? projectionTimeSeriesDatasets.seriesNames : []
	);

	let projectionStatsCharts = $derived(
		filteredWithPathwayScenario
			? new Statistic(filteredWithPathwayScenario, 'projection')
					.invertValues(loadFuelTechs)
					.group(group, loadFuelTechs)
					.reorder(order)
			: null
	);

	let loadData = $derived(
		projectionStatsCharts ? projectionStatsCharts.data.filter((d) => d.isLoad) : []
	);
	let loadSeries = $derived(loadData.map((d) => d.id));
	run(() => {
		console.log('loadloadDataSeries', loadData);
	});

	let projectionTimeSeriesCharts = $derived(
		projectionStatsCharts
			? new TimeSeries(
					projectionStatsCharts.data,
					parseInterval('1Y'),
					'projection',
					fuelTechNameReducer,
					$colourReducer
				)
					.transform()
					.updateMinMax(loadSeries)
			: null
	);

	run(() => {
		console.log(
			'projectionTimeSeriesCharts',
			projectionTimeSeriesCharts?.data,
			projectionStatsCharts?.data,
			filteredWithPathwayScenario
		);
	});

	let maxY = $derived(
		projectionTimeSeriesCharts ? [...projectionTimeSeriesCharts.data.map((d) => d._max)] : []
	);
	// @ts-ignore
	let datasetMax = $derived(maxY ? Math.max(...maxY) : 0);
	let minY = $derived(
		projectionTimeSeriesCharts ? [...projectionTimeSeriesCharts.data.map((d) => d._min)] : []
	);
	// @ts-ignore
	let datasetMin = $derived(minY ? Math.min(...minY) : 0);

	run(() => {
		console.log('datasetMax', datasetMax, datasetMin);
	});
	let yDomain = $derived([datasetMin, datasetMax]);

	/** @type {Object.<string, string>} */
	let projectionSeriesLabels = $derived(
		projectionTimeSeriesDatasets ? projectionTimeSeriesDatasets.seriesLabels : {}
	);

	/** @type {Object.<string, string>} */
	let projectionSeriesColours = $derived(
		projectionTimeSeriesDatasets ? projectionTimeSeriesDatasets.seriesColours : {}
	);

	let projectionFuelTechIds = $derived(
		projectionStatsDatasets ? projectionStatsDatasets.data.reduce(fuelTechReducer, {}) : {}
	);

	// Convert historical data to TWh to match ISP
	let historicalData = $derived(
		deepCopy(data.historyEnergyNemData).map((/** @type {StatsData} */ d) => {
			const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
			d.history = { ...d.history, data: historyData };
			d.units = 'TWh';
			return d;
		})
	);

	let historicalStatsDatasets = $derived(
		new Statistic(historicalData, 'history').group(group).reorder(order)
	);

	let historicalTimeSeriesDatasets = $derived(
		new TimeSeries(
			historicalStatsDatasets.data,
			parseInterval('1M'),
			'history',
			fuelTechNameReducer,
			$colourReducer
		)
			.transform()
			.rollup(parseInterval('FY'))
			.updateMinMax()
	);

	// update historical date to match ISP
	let updatedHistoricalTimeSeriesDatasets = $derived(
		historicalTimeSeriesDatasets.data.map((d) => {
			const date = startOfYear(d.date, 1);
			return { ...d, date, time: date.getTime() };
		})
	);

	let filteredHistoricalTimeSeriesDatasets = $derived(
		updatedHistoricalTimeSeriesDatasets.filter(
			(d) => d.date.getFullYear() < 2024 && d.date.getFullYear() > 2009
		)
	);

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

	function handleScenarioChange(evt) {
		if (selectedScenario === evt.detail.value) return;
		selectedScenario = evt.detail.value;
	}

	function handlePathwayChange(evt) {
		if (selectedPathway === evt.detail.value) return;
		selectedPathway = evt.detail.value;
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

<!-- container max-w-none lg:container -->

<header
	class="container max-w-none lg:container flex flex-wrap gap-2 mb-12 divide-x divide-warm-grey"
>
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
		<p class="mb-0">Pathways:</p>

		<div class="w-[280px]">
			<FormSelect
				options={selectedModelPathways}
				selected={selectedPathway}
				on:change={handlePathwayChange}
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
	<div class="grid grid-cols-12 gap-10 mt-6 mb-6 md:mb-0 relative">
		<div class="absolute -top-8 -right-8 hidden md:block">
			<ChartTooltip
				{hoverData}
				{hoverKey}
				defaultText="Energy Generation (TWh) by Financial Year"
				seriesColours={projectionSeriesColours}
				seriesLabels={projectionSeriesLabels}
			/>
		</div>

		<div class="text-dark-grey col-span-12 md:col-span-2 relative">
			<div class="absolute -top-8 -right-8 mt-10 block md:hidden">
				<ChartTooltip
					{hoverData}
					{hoverKey}
					seriesColours={projectionSeriesColours}
					seriesLabels={projectionSeriesLabels}
				/>
			</div>

			<div class="invisible absolute md:visible md:relative">
				<ExplorerChart
					dataset={filteredHistoricalTimeSeriesDatasets}
					{xKey}
					xTicks={[startOfYear(new Date('2010-01-01')), startOfYear(new Date('2023-01-01'))]}
					yKey={[0, 1]}
					yTicks={10}
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

		<div class="col-span-12 md:col-span-7">
			{#if filteredWithPathwayScenario.length === 0}
				<p class="mt-6">No data for this scenario and pathway</p>
			{:else}
				<div class="relative">
					<div class="block md:hidden w-[300px] absolute -left-[305px]">
						<ExplorerChart
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
						<ExplorerChart
							title={`Energy Generation (TWh) by Financial Year`}
							dataset={projectionTimeSeriesCharts.data}
							{xKey}
							xTicks={selectedModelXTicks}
							yKey={[0, 1]}
							yTicks={10}
							{yDomain}
							zKey="key"
							seriesNames={projectionTimeSeriesCharts.seriesNames}
							seriesColours={projectionTimeSeriesCharts.seriesColours}
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

		<div class="col-span-12 md:col-span-3">
			<table class="md:table-fixed w-full text-xs">
				<thead>
					<tr>
						<th class="text-left w-1/2">All tech</th>
						<th class="text-right">Energy</th>
						<th class="text-right">Contribution to demand</th>
					</tr>
				</thead>

				<!-- <thead>
					<tr>
						<th colspan="3" class="text-left">Sources</th>
					</tr>
				</thead> -->

				<tbody>
					{#each [...projectionTimeSeriesCharts.seriesNames].reverse() as key}
						<tr>
							<td class="text-left">{projectionTimeSeriesCharts.seriesLabels[key]}</td>
							<td class="text-right">
								{hoverData && hoverData[key] !== 0 ? formatValue(hoverData[key]) : '—'}
							</td>
							<td class="text-right">
								{hoverData && hoverData[key] !== 0 && hoverData._max
									? formatValue((hoverData[key] / hoverData._max) * 100) + '%'
									: '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
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
