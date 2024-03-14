<script>
	import { startOfYear, format } from 'date-fns';

	import deepCopy from '$lib/utils/deep-copy';
	import {
		domainGroups,
		domainOrder,
		labelReducer,
		colourReducer,
		formatFyTickX,
		scenarios,
		scenarioLabels,
		scenarioDescriptions,
		selectedPathway
	} from './helpers';

	import {
		domainGroups as historicalDomainGroups,
		domainOrder as historicalDomainOrder,
		labelReducer as historicalLabelReducer,
		colourReducer as historicalColourReducer
	} from './historical-helpers';

	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';

	import OverviewChart from './OverviewChart.svelte';
	import SparkBar from './SparkBar.svelte';
	import SparkLineArea from './SparkLineArea.svelte';
	import DashboardViewOptions from './DashboardViewOptions.svelte';

	import parseInterval from '$lib/utils/intervals';
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';

	/** @type {{ fuelTechs: string[], outlookEnergyNem: Stats, historyEnergyNemData: StatsData[]  }} */
	export let data;

	const xKey = 'date';

	/** @type {'line'|'bar'} */
	let dashboard = 'line'; // bar

	/** @type {ScenarioKey} */
	let selectedScenario = scenarios[0];

	$: outlookData = data.outlookEnergyNem.data;
	$: console.log('outlookData', data.outlookEnergyNem);

	$: filteredWithScenario = outlookData.filter((d) => d.scenario === selectedScenario);

	$: filteredWithPathwayScenario = filteredWithScenario.filter(
		(d) => d.pathway === selectedPathway
	);

	$: yDomain =
		selectedScenario === 'green_energy_exports' ? [0, 1250000 / 1000] : [0, 500000 / 1000];

	$: projectionStatsDatasets = new StatsDatasets(filteredWithPathwayScenario, 'projection')
		.group(domainGroups)
		.reorder(domainOrder);

	$: console.log('projectionStatsDatasets', projectionStatsDatasets);

	$: projectionTimeSeriesDatasets = new TimeSeriesDatasets(
		projectionStatsDatasets.data,
		parseInterval('1Y'),
		'projection',
		labelReducer,
		colourReducer
	)
		.transform()
		.updateMinMax();

	$: projectionSeriesNames = projectionTimeSeriesDatasets.seriesNames;

	/** @type {Object.<string, string>} */
	$: projectionSeriesLabels = projectionTimeSeriesDatasets.seriesLabels;

	/** @type {Object.<string, string>} */
	$: projectionSeriesColours = projectionTimeSeriesDatasets.seriesColours;

	// Convert historical data to TWh to match ISP
	$: historicalData = deepCopy(data.historyEnergyNemData).map((/** @type {StatsData} */ d) => {
		const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
		d.history = { ...d.history, data: historyData };
		d.units = 'TWh';
		return d;
	});

	$: historicalStatsDatasets = new StatsDatasets(historicalData, 'history')
		.group(historicalDomainGroups)
		.reorder(historicalDomainOrder);

	$: historicalTimeSeriesDatasets = new TimeSeriesDatasets(
		historicalStatsDatasets.data,
		parseInterval('1M'),
		'history',
		historicalLabelReducer,
		historicalColourReducer
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
		(d) => d.date.getFullYear() < 2024 && d.date.getFullYear() > 1999
	);

	$: sparkLineXTicks = [2025, 2052].map((year) => startOfYear(new Date(`${year}-01-01`)));

	/** @type {TimeSeriesData[]} */
	let sparkBarDataset = [];

	$: {
		sparkBarDataset = [];
		[2025, 2030, 2050].forEach((year) => {
			const data = projectionTimeSeriesDatasets.data.find((d) => d.date.getFullYear() === year);
			if (data) {
				sparkBarDataset.push(data);
			} else {
				console.warn('no data for year', year, projectionTimeSeriesDatasets.data);
			}
		});
	}

	$: sparkBarXTicks = sparkBarDataset.map((d) =>
		startOfYear(new Date(`${format(d.date, 'yyyy')}-01-01`))
	);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {TimeSeriesData | undefined} */
	let historicalHoverData = undefined;
</script>

<section class="p-4">
	<header class="grid grid-cols-5">
		<h1 class="col-span-5 text-3xl leading-3xl md:text-5xl md:leading-5xl md:col-span-4">
			Explore the future of Australia's national electricity market
		</h1>

		<div class="hidden md:block">
			<ButtonLink href="/isp-tracker">
				<span>Download Data</span>
				<Icon icon="arrow-down-tray" size={24} />
			</ButtonLink>
		</div>
	</header>

	<div class="grid grid-cols-6 gap-3 my-6">
		<div class="text-dark-grey col-span-6 md:col-span-2 relative">
			<div class="static md:absolute top-0 z-10 text-sm">
				<div class="md:mr-16">
					<p>
						A range of modelled scenarios exist which envision the evolution of Australia's National
						Electricity Market (NEM) over the coming decades.
					</p>
					<p>
						These scenarios aim to steer Australia towards a cost-effective, reliable and safe
						energy system en route to a zero-emissions electricity network.
					</p>
					<p>Explore the <strong>draft 2024 AEMO</strong> future scenarios below.</p>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-1 gap-3 md:mr-48">
					{#each scenarios as scenario}
						<button
							class="rounded-lg border hover:bg-light-warm-grey px-2 py-4 capitalize"
							class:border-mid-warm-grey={selectedScenario !== scenario}
							class:border-dark-grey={selectedScenario === scenario}
							class:bg-light-warm-grey={selectedScenario === scenario}
							value={scenario}
							on:click={() => {
								selectedScenario = scenario;
							}}
						>
							{scenario.split('_').join(' ')}
						</button>
					{/each}
				</div>
			</div>

			<div class="invisible absolute md:visible md:relative">
				<OverviewChart
					dataset={filteredHistoricalTimeSeriesDatasets}
					{xKey}
					xTicks={hoverData || historicalHoverData
						? [
								startOfYear(new Date('2000-01-01')),
								startOfYear(new Date('2010-01-01')),
								startOfYear(new Date('2020-01-01'))
						  ]
						: [
								startOfYear(new Date('2000-01-01')),
								startOfYear(new Date('2010-01-01')),
								startOfYear(new Date('2020-01-01'))
						  ]}
					yKey={[0, 1]}
					yTicks={0}
					{yDomain}
					zKey="key"
					seriesNames={historicalTimeSeriesDatasets.seriesNames}
					seriesColours={historicalTimeSeriesDatasets.seriesColours}
					formatTickX={formatFyTickX}
					hoverData={historicalHoverData}
					on:mousemove={(e) => (historicalHoverData = /** @type {TimeSeriesData} */ (e.detail))}
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
							xTicks={hoverData || historicalHoverData
								? [
										startOfYear(new Date('2000-01-01')),
										startOfYear(new Date('2010-01-01')),
										startOfYear(new Date('2020-01-01'))
								  ]
								: [
										startOfYear(new Date('2000-01-01')),
										startOfYear(new Date('2010-01-01')),
										startOfYear(new Date('2020-01-01'))
								  ]}
							yKey={[0, 1]}
							yTicks={0}
							{yDomain}
							zKey="key"
							seriesNames={historicalTimeSeriesDatasets.seriesNames}
							seriesColours={historicalTimeSeriesDatasets.seriesColours}
							formatTickX={formatFyTickX}
							hoverData={historicalHoverData}
							on:mousemove={(e) => (historicalHoverData = /** @type {TimeSeriesData} */ (e.detail))}
							on:mouseout={() => (historicalHoverData = undefined)}
						/>
					</div>
					<div class="w-full">
						<OverviewChart
							title={`Energy Generation (TWh) under AEMO ${scenarioLabels[selectedScenario]} 2024`}
							description={scenarioDescriptions[selectedScenario]}
							dataset={projectionTimeSeriesDatasets.data}
							{xKey}
							xTicks={hoverData || historicalHoverData
								? [
										startOfYear(new Date('2051-01-01')),
										startOfYear(new Date('2041-01-01')),
										startOfYear(new Date('2031-01-01')),
										startOfYear(new Date('2025-01-01'))
								  ]
								: [
										startOfYear(new Date('2051-01-01')),
										startOfYear(new Date('2041-01-01')),
										startOfYear(new Date('2031-01-01')),
										startOfYear(new Date('2025-01-01'))
								  ]}
							yKey={[0, 1]}
							yTicks={2}
							{yDomain}
							zKey="key"
							seriesNames={projectionTimeSeriesDatasets.seriesNames}
							seriesColours={projectionTimeSeriesDatasets.seriesColours}
							{hoverData}
							overlay={true}
							bgClass="bg-light-warm-grey"
							formatTickX={formatFyTickX}
							on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
							on:mouseout={() => (hoverData = undefined)}
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="mt-6 grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-5">
		{#if dashboard === 'line'}
			{#each projectionSeriesNames as key}
				<SparkLineArea
					dataset={projectionTimeSeriesDatasets.data}
					{key}
					xTicks={sparkLineXTicks}
					title={projectionSeriesLabels[key]}
					colour={projectionSeriesColours[key]}
					{hoverData}
					on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
					on:mouseout={() => (hoverData = undefined)}
				/>
			{/each}
		{:else}
			{#each projectionSeriesNames as key}
				<SparkBar
					dataset={sparkBarDataset}
					{key}
					xTicks={sparkBarXTicks}
					title={projectionSeriesLabels[key]}
					colour={projectionSeriesColours[key]}
					{hoverData}
				/>
			{/each}
		{/if}
	</div>

	<div class="mx-auto w-[130px] mt-6">
		<DashboardViewOptions current={dashboard} on:change={(evt) => (dashboard = evt.detail)} />
	</div>
</section>
