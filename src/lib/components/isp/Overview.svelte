<script>
	import { getContrastedTextColour } from '$lib/colours.js';
	import { fuelTechNames, fuelTechName, fuelTechColour, fuelTechGroups } from '$lib/fuel_techs.js';
	import { transformToTimeSeriesDataset } from '$lib/utils/time-series-helpers';
	import deepCopy from '$lib/utils/deep-copy';
	import { updateWithMinMaxValues, groupedIspData } from './helpers';

	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Select from '$lib/components/form-elements/Select.svelte';

	import OverviewChart from './OverviewChart.svelte';
	import Gauges from './Gauges.svelte';
	import Sparklines from './Sparklines.svelte';
	import SparkLineArea from './SparkLineArea.svelte';

	/** @typedef {import('$lib/types/fuel_tech.types').FuelTechCode} FuelTechCode */
	/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */
	/** @typedef {import('$lib/types/isp.types').IspData} IspData */

	/** @type {{ fuelTechs: string[], outlookEnergyNem: import('$lib/types/isp.types').Isp }} */
	export let data;

	const xKey = 'date';

	let ftGroups = ['Custom', 'Detailed'];
	let scenarios = ['step_change', 'progressive_change', 'slow_change', 'hydrogen_superpower']; // scenarios in display order
	let metricKeys = ['wind', 'solar', 'coal']; // gauge metrics in display order

	/** @type {FuelTechCode[]} */
	let loadFts = [
		'exports',
		'battery_charging',
		'battery_VPP_charging',
		'battery_distributed_charging',
		'demand_response'
	];

	/** @type {string|undefined} */
	let selectedPathway;
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
					d.projection.data[i] = value * -1;
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
		let transformedFiltered = transformToTimeSeriesDataset(groupedDatasets);
		seriesColours = fuelTechGroups.map((d) => fuelTechColour(d));
		seriesNames =
			transformedFiltered && transformedFiltered.length
				? Object.keys(transformedFiltered[0]).filter((d) => d !== xKey && d !== 'time')
				: [];

		const loadSeries = seriesNames.filter((d) => loadFts.find((l) => d.includes(l)));
		tsData = updateWithMinMaxValues(transformedFiltered, seriesNames, loadSeries);
		dataset = groupedDatasets;
	} else if (selectedFtGroup === 'Detailed') {
		let transformedFiltered = transformToTimeSeriesDataset(orderedFilteredWithPathwayScenario);
		let transformedFiltered2 = transformToTimeSeriesDataset(filteredWithPathwayScenario);

		seriesColours = orderedFilteredWithPathwayScenario.map((d) => fuelTechColour(d.fuel_tech));
		seriesNames =
			transformedFiltered && transformedFiltered.length
				? Object.keys(transformedFiltered[0]).filter((d) => d !== xKey && d !== 'time')
				: [];
		const loadSeries = seriesNames.filter((d) => loadFts.find((l) => d.includes(l)));
		tsData = updateWithMinMaxValues(transformedFiltered, seriesNames, loadSeries);
		tsData2 = updateWithMinMaxValues(transformedFiltered2, seriesNames, []);
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

	$: console.log('dataset', dataset, tsData);
	$: console.log('fuelTechLabelDict', fuelTechLabelDict, fuelTechColourDict);

	const trackYears = [2024, 2030, 2051];
	const startEndYears = [2024, 2051];

	$: startEndXTicks = startEndYears.map((year) => new Date(`${year}-01-01`));
	$: sparklineXTicks = trackYears.map((year) => new Date(`${year}-01-01`));

	/** @type {TimeSeriesData[]} */
	$: sparklineDataset = isCustomGroup
		? trackYears.map((year) => tsData.find((d) => d.date.getFullYear() === year))
		: trackYears.map((year) => tsData2.find((d) => d.date.getFullYear() === year));
	$: console.log('sparklineDataset', sparklineDataset);
</script>

<section class="p-4">
	<header class="flex justify-between gap-6 items-start">
		<h3 class="text-4xl font-semibold max-w-4xl leading-4xl">
			Explore the future of Australia's national electricity market
		</h3>

		<ButtonLink href="/isp-tracker">
			Download Data <Icon icon="arrow-down-tray" size={24} />
		</ButtonLink>
	</header>

	<div class="flex gap-12">
		<div class="text-dark-grey max-w-[450px] w-2/5 text-sm">
			<div>
				<p>
					A range of modelled scenarios exist which envision the evolution of Australia's National
					Electricity Market (NEM) over the coming decades.
				</p>
				<p>
					These scenarios aim to steer Australia towards a cost-effective, reliable and safe energy
					system en route to a zero-emissions electricity network.
				</p>
				<p>Explore the <strong>2022 AEMO</strong> future scenarios below.</p>
			</div>

			<div class="grid grid-cols-2 gap-6">
				{#each scenarios as scenario}
					<button
						class="rounded-lg border border-mid-warm-grey hover:bg-light-warm-grey px-6 py-4 capitalize"
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

			<div
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
			</div>
		</div>

		<!-- yDomain={selectedScenario === 'hydrogen_superpower' ? undefined : [0, 500000]} -->

		<div class="w-3/5">
			{#if filteredWithPathwayScenario.length === 0}
				<p class="mt-6">No data for this scenario and pathway</p>
			{:else}
				<OverviewChart
					dataset={tsData}
					{xKey}
					yKey={[0, 1]}
					yDomain={selectedScenario === 'hydrogen_superpower' ? [0, 1550000] : [0, 550000]}
					zKey="key"
					{seriesNames}
					{seriesColours}
				/>

				<div class="flex gap-2 flex-wrap text-xs">
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
				</div>
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

	<div class="mt-6">
		<SparkLineArea
			dataset={isCustomGroup ? tsData : tsData2}
			keys={seriesNames}
			xTicks={startEndXTicks}
			labelDict={fuelTechLabelDict}
			colourDict={fuelTechColourDict}
		/>
	</div>

	<div class="mt-6">
		<Sparklines
			dataset={sparklineDataset}
			keys={seriesNames}
			xTicks={sparklineXTicks}
			labelDict={fuelTechLabelDict}
			colourDict={fuelTechColourDict}
		/>
	</div>
</section>
