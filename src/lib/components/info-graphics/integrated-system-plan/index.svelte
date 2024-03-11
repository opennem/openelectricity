<script>
	import { formatInTimeZone } from 'date-fns-tz';

	import deepCopy from '$lib/utils/deep-copy';
	import {
		domainGroups,
		domainOrder,
		labelReducer,
		colourReducer,
		formatTickX,
		formatFyTickX
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

	/** @type {{ fuelTechs: string[], outlookEnergyNem: Isp, historyEnergyNemData: StatsData[]  }} */
	export let data;

	const xKey = 'date';

	/** @type {ScenarioKey[]} */
	let scenarios = ['step_change', 'progressive_change', 'green_energy_exports']; // scenarios in display order

	let scenarioLabels = {
		step_change: 'Step Change',
		progressive_change: 'Progressive Change',
		// slow_change: 'Slow Change',
		green_energy_exports: 'Green Energy Exports'
		// hydrogen_superpower: 'Hydrogen Superpower'
	};
	let scenarioDescriptions = {
		step_change:
			'The Step Change scenario is considered the most likely future for the National Electricity Market (NEM). This scenario takes into account various factors such as ageing generation plants, technical innovation, economics, government policies, energy security, and consumer choice.',
		progressive_change:
			'The Progressive Change scenario is designed to assess the potential impact of a gradual and evolving transition toward a low-carbon energy system, taking into account the complexities and challenges associated with achieving decarbonization goals.',
		slow_change:
			'The Slow Change scenario is an unlikely transition scenario that does not meet carbon reduction targets. It takes into account the difficult economic environment following the COVID-19 pandemic, reflecting a slower economy and falling short of the targets.',
		green_energy_exports:
			'The Green Energy Exports scenario is a highly ambitious scenario that includes strong global action, significant technological breakthroughs, and a near quadrupling of National Electricity Market (NEM) energy consumption to support a hydrogen export industry. '
	};

	/** @type {'line'|'bar'} */
	let dashboard = 'line'; // bar

	/** @type {FuelTechCode[]} */
	let loadFts = [
		'exports',
		'battery_charging',
		'battery_VPP_charging',
		'battery_distributed_charging',
		'demand_response',
		'pumps'
	];

	/** @type {string|undefined} */
	let selectedPathway = 'CDP11 (ODP)';

	/** @type {ScenarioKey} */
	let selectedScenario = scenarios[0];

	$: outlookData = data.outlookEnergyNem.data;

	$: filteredWithScenario = outlookData.filter((d) => d.scenario === selectedScenario);
	$: filteredWithPathwayScenario = filteredWithScenario.filter(
		(d) => d.pathway === selectedPathway
	);
	$: yDomain =
		selectedScenario === 'green_energy_exports' ? [0, 1250000 / 1000] : [0, 500000 / 1000];

	$: projectionStatsDatasets = new StatsDatasets(filteredWithPathwayScenario, 'projection')
		.invertLoadValues(loadFts)
		.group(domainGroups)
		.reorder(domainOrder);

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
	$: projectionSeriesLabels = projectionTimeSeriesDatasets.seriesLabels2;
	$: projectionSeriesColours = projectionTimeSeriesDatasets.seriesColours2;

	// Convert historical data to TWh to match ISP
	const historicalData = deepCopy(data.historyEnergyNemData).map((d) => {
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

	$: filteredHistoricalTimeSeriesDatasets = historicalTimeSeriesDatasets.data.filter(
		(d) => d.date.getFullYear() < 2023 && d.date.getFullYear() > 1998
	);

	const trackYears = [2025, 2031, 2051];
	const startEndYears = [2025, 2052];

	$: startEndXTicks = startEndYears.map((year) => new Date(`${year}-01-01`));

	/** @type {TimeSeriesData[]} */
	let sparkbarDataset = [];

	$: {
		sparkbarDataset = [];
		trackYears.forEach((year) => {
			const data = projectionTimeSeriesDatasets.data.find(
				(d) => +formatInTimeZone(d.date, '+10:00', 'yyyy') === year
			);
			if (data) {
				sparkbarDataset.push(data);
			} else {
				console.warn('no data for year', year, projectionTimeSeriesDatasets.data);
			}
		});
	}

	$: sparklineXTicks = sparkbarDataset.map(
		(d) => new Date(`${formatInTimeZone(d.date, '+10:00', 'yyyy')}-01-01`)
	);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;
</script>

<section class="p-4">
	<header class="grid grid-cols-5">
		<h1 class="col-span-4">Explore the future of Australia's national electricity market</h1>

		<div>
			<ButtonLink href="/isp-tracker">
				<span>Download Data</span>
				<Icon icon="arrow-down-tray" size={24} />
			</ButtonLink>
		</div>
	</header>

	<div class="grid grid-cols-6 gap-3 my-6">
		<div class="text-dark-grey text-sm col-span-2 relative">
			<div class="absolute top-0 z-10">
				<div>
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

				<div class="grid grid-cols-1 gap-6 mr-36">
					{#each scenarios as scenario}
						<button
							class="rounded-lg border hover:bg-light-warm-grey px-4 py-4 capitalize"
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

			<OverviewChart
				dataset={filteredHistoricalTimeSeriesDatasets}
				{xKey}
				xTicks={[new Date('2000-01-01'), new Date('2012-01-01')]}
				yKey={[0, 1]}
				yTicks={0}
				{yDomain}
				zKey="key"
				seriesNames={historicalTimeSeriesDatasets.seriesNames}
				seriesColours={historicalTimeSeriesDatasets.seriesColours}
				{formatTickX}
			/>
		</div>

		<div class="col-span-4">
			{#if filteredWithPathwayScenario.length === 0}
				<p class="mt-6">No data for this scenario and pathway</p>
			{:else}
				<OverviewChart
					title={`Energy Generation (TWh) under AEMO ${scenarioLabels[selectedScenario]} 2024`}
					description={scenarioDescriptions[selectedScenario]}
					dataset={projectionTimeSeriesDatasets.data}
					{xKey}
					xTicks={[
						new Date('2051-01-01'),
						new Date('2041-01-01'),
						new Date('2031-01-01'),
						new Date('2025-01-01')
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
			{/if}
		</div>
	</div>

	<div class="mt-6 grid grid-cols-5 gap-5">
		{#if dashboard === 'line'}
			{#each projectionSeriesNames as key}
				<SparkLineArea
					dataset={projectionTimeSeriesDatasets.data}
					{key}
					xTicks={startEndXTicks}
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
					dataset={sparkbarDataset}
					{key}
					xTicks={sparklineXTicks}
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
