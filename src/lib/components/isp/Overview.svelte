<script>
	import { formatInTimeZone } from 'date-fns-tz';
	import { rollup } from 'd3-array';
	import {
		fuelTechNames,
		fuelTechName,
		fuelTechColour,
		fuelTechGroups,
		historicalEnergyGroups
	} from '$lib/fuel_techs.js';
	import { transform as transformEnergy } from '$lib/utils/time-series-helpers/transform/energy';
	import withMinMax from '$lib/utils/time-series-helpers/with-min-max';
	import deepCopy from '$lib/utils/deep-copy';
	import { groupedIspData, groupedStatsData } from './helpers';

	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Select from '$lib/components/form-elements/Select.svelte';

	import OverviewChart from './OverviewChart.svelte';
	import SparkBar from './SparkBar.svelte';
	import SparkLineArea from './SparkLineArea.svelte';
	import DashboardViewOptions from './DashboardViewOptions.svelte';

	/** @type {{ fuelTechs: string[], outlookEnergyNem: Isp, historyEnergyNemData: StatsData[]  }} */
	export let data;

	const xKey = 'date';

	let ftGroups = ['Custom', 'Detailed'];
	/** @type {ScenarioKey[]} */
	let scenarios = ['step_change', 'progressive_change', 'slow_change', 'hydrogen_superpower']; // scenarios in display order
	let scenarioLabels = {
		step_change: 'Step Change',
		progressive_change: 'Progressive Change',
		slow_change: 'Slow Change',
		hydrogen_superpower: 'Hydrogen Superpower'
	};
	let scenarioDescriptions = {
		step_change:
			'The Step Change scenario is considered the most likely future for the National Electricity Market (NEM). This scenario takes into account various factors such as ageing generation plants, technical innovation, economics, government policies, energy security, and consumer choice.',
		progressive_change:
			'The Progressive Change scenario is designed to assess the potential impact of a gradual and evolving transition toward a low-carbon energy system, taking into account the complexities and challenges associated with achieving decarbonization goals.',
		slow_change:
			'The Slow Change scenario is an unlikely transition scenario that does not meet carbon reduction targets. It takes into account the difficult economic environment following the COVID-19 pandemic, reflecting a slower economy and falling short of the targets.',
		hydrogen_superpower:
			'The Hydrogen Superpower scenario is a highly ambitious scenario that includes strong global action, significant technological breakthroughs, and a near quadrupling of National Electricity Market (NEM) energy consumption to support a hydrogen export industry. '
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
	let selectedPathway;
	/** @type {ScenarioKey} */
	let selectedScenario = scenarios[0];
	let selectedFtGroup = ftGroups[0];

	$: scenarioPathways = [...new Set(filteredWithScenario.map((d) => d.pathway))].sort(); // get all pathways for selected scenario
	$: if (selectedPathway === undefined) {
		selectedPathway = scenarioPathways[0]; // initialise selected pathway to first pathway in scenario
	}

	$: outlookData = data.outlookEnergyNem.data;
	$: filteredWithScenario = outlookData.filter((d) => d.scenario === selectedScenario);
	$: filteredWithPathwayScenario = filteredWithScenario.filter(
		(d) => d.pathway === selectedPathway
	);
	$: yDomain = selectedScenario === 'hydrogen_superpower' ? [0, 1550000] : [0, 550000];

	/** @type {IspData[]} */
	let orderedFilteredWithPathwayScenario = [];
	$: {
		orderedFilteredWithPathwayScenario = [];
		fuelTechNames.forEach((/** @type {*} */ code) => {
			const filtered = filteredWithPathwayScenario.filter((d) => d.fuel_tech === code);
			if (filtered.length > 0) {
				const copy = deepCopy(filtered[0]);
				copy.colour = fuelTechColour(code);
				orderedFilteredWithPathwayScenario.push(copy);
			}
		});

		orderedFilteredWithPathwayScenario.forEach((d) => {
			const code = d.fuel_tech;
			// invert load fuel techs so it displays below the zero x axis in the stacked area chart
			if (loadFts.includes(code)) {
				d.projection.data.forEach((value, i) => {
					d.projection.data[i] = value ? value * -1 : null;
				});
			}
		});
	}

	/** @type {IspData[]} */
	let dataset = [];

	/** @type {TimeSeriesData[] | []} */
	let tsData = [];

	/** @type {TimeSeriesData[] | []} */
	let tsData2 = [];

	/** @type {string[]} */
	let seriesNames = [];

	/** @type {string[]} */
	let seriesColours = [];

	$: isCustomGroup = selectedFtGroup === 'Custom';

	$: if (selectedFtGroup === 'Custom') {
		let groupedDatasets = groupedIspData(fuelTechGroups, orderedFilteredWithPathwayScenario);
		let transformedFiltered = transformEnergy(groupedDatasets, 'projection', '1Y');
		seriesColours = fuelTechGroups.map((d) => fuelTechColour(d));
		seriesNames =
			transformedFiltered && transformedFiltered.length
				? Object.keys(transformedFiltered[0]).filter((d) => d !== xKey && d !== 'time')
				: [];

		const loadSeries = seriesNames.filter((d) => loadFts.find((l) => d.includes(l)));
		tsData = withMinMax(transformedFiltered, seriesNames, loadSeries);
		dataset = groupedDatasets;
	} else if (selectedFtGroup === 'Detailed') {
		let transformedFiltered = transformEnergy(
			orderedFilteredWithPathwayScenario,
			'projection',
			'1Y'
		);
		let transformedFiltered2 = transformEnergy(filteredWithPathwayScenario, 'projection', '1Y');

		seriesColours = orderedFilteredWithPathwayScenario.map((d) => fuelTechColour(d.fuel_tech));
		seriesNames =
			transformedFiltered && transformedFiltered.length
				? Object.keys(transformedFiltered[0]).filter((d) => d !== xKey && d !== 'time')
				: [];
		const loadSeries = seriesNames.filter((d) => loadFts.find((l) => d.includes(l)));
		tsData = withMinMax(transformedFiltered, seriesNames, loadSeries);
		tsData2 = withMinMax(transformedFiltered2, seriesNames, []);
		dataset = orderedFilteredWithPathwayScenario;
	}

	$: fuelTechLabelDict = dataset.reduce((/** @type {Object.<string, string>} */ acc, curr) => {
		acc[curr.id] = fuelTechName(curr.fuel_tech);
		return acc;
	}, {});
	$: fuelTechColourDict = dataset.reduce((/** @type {Object.<string, string>} */ acc, curr) => {
		acc[curr.id] = fuelTechColour(curr.fuel_tech);
		return acc;
	}, {});

	const trackYears = [2024, 2030, 2051];
	const startEndYears = [2024, 2051];

	$: startEndXTicks = startEndYears.map((year) => new Date(`${year}-01-01`));

	/** @type {TimeSeriesData[]} */
	let sparklineDataset = [];

	$: if (selectedFtGroup === 'Custom') {
		updateSparklineDataset(tsData);
	} else if (selectedFtGroup === 'Detailed') {
		updateSparklineDataset(tsData2);
	}

	/** @param {TimeSeriesData[]} dataset */
	function updateSparklineDataset(dataset) {
		sparklineDataset = [];
		trackYears.forEach((year) => {
			const data = dataset.find((d) => +formatInTimeZone(d.date, '+10:00', 'yyyy') === year);
			if (data) {
				sparklineDataset.push(data);
			} else {
				console.warn('no data for year', year, dataset);
			}
		});
	}

	$: sparklineXTicks = sparklineDataset.map(
		(d) => new Date(`${formatInTimeZone(d.date, '+10:00', 'yyyy')}-01-01`)
	);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	const historicalData = data.historyEnergyNemData;
	$: console.log('historicalData', historicalData);

	/** @type {StatsData[]} */
	let historicalDataset = [];

	/** @type {TimeSeriesData[] | []} */
	let historicalTsData = [];

	/** @type {string[]} */
	let historicalSeriesNames = [];

	/** @type {string[]} */
	let historicalSeriesColours = [];
	$: {
		let ordered = [];

		fuelTechNames.forEach((/** @type {*} */ code) => {
			const filtered = historicalData.filter((d) => d.fuel_tech === code);
			if (filtered.length > 0) {
				const copy = deepCopy(filtered[0]);
				copy.colour = fuelTechColour(code);
				ordered.push(copy);
			}
		});
		let groupedDatasets = groupedStatsData(historicalEnergyGroups, ordered);

		let transformed = transformEnergy(groupedDatasets, 'history', '1M');

		historicalSeriesColours = fuelTechGroups.map((d) => fuelTechColour(d));
		historicalSeriesNames =
			transformed && transformed.length
				? Object.keys(transformed[0]).filter((d) => d !== xKey && d !== 'time')
				: [];

		const groupByYearDate = rollup(
			transformed,
			(v) => {
				const obj = {
					date: v[0].date,
					time: v[0].time
				};

				v.forEach((d) => {
					historicalSeriesNames.forEach((key) => {
						if (obj[key] === undefined) {
							obj[key] = 0;
						}
						obj[key] += d[key];
					});
				});

				return obj;
			},
			(d) => d.date.getFullYear()
		);

		const groupBy = [...groupByYearDate.values()];

		const loadSeries = seriesNames.filter((d) => loadFts.find((l) => d.includes(l)));
		historicalTsData = withMinMax(groupBy, historicalSeriesNames, loadSeries);
		historicalDataset = groupedDatasets;
	}
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

	<div class="grid grid-cols-6 gap-12 my-6">
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
					<p>Explore the <strong>2022 AEMO</strong> future scenarios below.</p>
				</div>

				<div class="grid grid-cols-2 gap-6">
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

				<!-- <div
					class="border-t-1 border-mid-warm-grey pt-6 mt-12 mr-12 flex gap-6 text-sm text-alert-yellow"
				>
					<label for="pathway-select">
						<span>Pathways</span>
						<Select bind:value={selectedPathway} options={scenarioPathways} id="pathway-select" />
					</label>

					<label for="ft-group-select">
						<span>Fuel Technology Group</span>
						<Select bind:value={selectedFtGroup} options={ftGroups} id="ft-group-select" />
					</label>
				</div> -->
			</div>

			<OverviewChart
				dataset={historicalTsData}
				{xKey}
				xTicks={[new Date('1999-01-01'), new Date('2023-01-01')]}
				yKey={[0, 1]}
				yTicks={0}
				{yDomain}
				zKey="key"
				seriesNames={historicalSeriesNames}
				seriesColours={historicalSeriesColours}
			/>
		</div>

		<div class="col-span-4">
			{#if filteredWithPathwayScenario.length === 0}
				<p class="mt-6">No data for this scenario and pathway</p>
			{:else}
				<OverviewChart
					title={`Energy Generation (GWh) under AEMO ${scenarioLabels[selectedScenario]} 2022`}
					description={scenarioDescriptions[selectedScenario]}
					dataset={tsData}
					{xKey}
					xTicks={[
						new Date('2050-01-01'),
						new Date('2040-01-01'),
						new Date('2030-01-01'),
						new Date('2024-01-01')
					]}
					yKey={[0, 1]}
					yTicks={2}
					{yDomain}
					zKey="key"
					{seriesNames}
					{seriesColours}
					overlay={true}
					on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
					on:mouseout={() => (hoverData = undefined)}
				/>

				<!-- <div class="flex gap-2 flex-wrap justify-end text-xs">
					{#each dataset as row}
						<span
							class="py-1 px-3 rounded"
							style={`
								background-color: ${fuelTechColour(row.fuel_tech)}; 
								color: ${getContrastedTextColour(fuelTechColour(row.fuel_tech))}
							`}
						>
							{fuelTechName(row.fuel_tech)}
						</span>
					{/each}
				</div> -->
			{/if}
		</div>
	</div>

	<!-- <div class="mt-12">
		<Gauges
			dataset={tsData}
			keys={seriesNames}
			labelDict={fuelTechLabelDict}
			colourDict={fuelTechColourDict}
		/>
	</div> -->

	<div class="mt-6 grid grid-cols-6 gap-6">
		{#if dashboard === 'line'}
			{#each seriesNames as key}
				<SparkLineArea
					dataset={isCustomGroup ? tsData : tsData2}
					{key}
					xTicks={startEndXTicks}
					title={fuelTechLabelDict[key]}
					colour={fuelTechColourDict[key]}
					{hoverData}
					on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
					on:mouseout={() => (hoverData = undefined)}
				/>
			{/each}
		{:else}
			{#each seriesNames as key}
				<SparkBar
					dataset={sparklineDataset}
					{key}
					xTicks={sparklineXTicks}
					title={fuelTechLabelDict[key]}
					colour={fuelTechColourDict[key]}
					{hoverData}
				/>
			{/each}
		{/if}
	</div>

	<div class="mx-auto w-[130px] mt-6">
		<DashboardViewOptions current={dashboard} on:change={(evt) => (dashboard = evt.detail)} />
	</div>
</section>
