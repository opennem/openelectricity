<script>
	import { getContrastedTextColour } from '$lib/colours.js';
	import {
		fuelTechNames,
		fuelTechName,
		fuelTechColour,
		fuelTechGroups,
		fuelTechGroup
	} from '$lib/fuel_techs.js';
	import { transformToTimeSeriesDataset } from '$lib/utils/time-series-helpers';
	import deepCopy from '$lib/utils/deep-copy';

	import IspChart from '$lib/components/homepage/IspChart.svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';

	/** @typedef {import('$lib/types/fuel_tech.types').FuelTechCode} FuelTechCode */
	/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */
	/** @typedef {import('$lib/types/isp.types').IspData} IspData */

	/** @type {{ fuelTechs: string[], outlookEnergyNem: import('$lib/types/isp.types').Isp }} */
	export let data;

	const xKey = 'date';

	let ftGroups = ['Custom', 'Detailed'];
	let scenarios = ['step_change', 'progressive_change', 'slow_change', 'hydrogen_superpower']; // scenarios in display order
	/** @type {FuelTechCode[]} */
	let loadFts = [
		'exports',
		'battery_charging',
		'battery_VPP_charging',
		'battery_distributed_charging',
		'demand_response'
	];

	/** @type {string|null} */
	let selectedPathway = null;
	let selectedScenario = scenarios[0];
	let selectedFtGroup = ftGroups[0];

	$: scenarioPathways = [...new Set(filteredWithScenario.map((d) => d.pathway))].sort(); // get all pathways for selected scenario
	$: if (selectedPathway === null) {
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
				orderedFilteredWithPathwayScenario.push(deepCopy(filtered[0]));
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
	/** @type {string[]} */
	let seriesNames = [];
	/** @type {string[]} */
	let seriesColours = [];

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
		seriesColours = orderedFilteredWithPathwayScenario.map((d) => fuelTechColour(d.fuel_tech));
		seriesNames =
			transformedFiltered && transformedFiltered.length
				? Object.keys(transformedFiltered[0]).filter((d) => d !== xKey && d !== 'time')
				: [];
		const loadSeries = seriesNames.filter((d) => loadFts.find((l) => d.includes(l)));
		tsData = updateWithMinMaxValues(transformedFiltered, seriesNames, loadSeries);
		dataset = orderedFilteredWithPathwayScenario;
	}

	/**
	 * @param {TimeSeriesData[]} dataset
	 * @param {string[]} seriesNames
	 * @param {string[]} loadSeries
	 * @returns {TimeSeriesData[]}
	 */
	function updateWithMinMaxValues(dataset, seriesNames, loadSeries) {
		return dataset.map((d) => {
			/** @type {TimeSeriesData} */
			const newObj = { ...d };
			// get min and max values for each time series
			newObj._max = 0;
			newObj._min = 0;
			seriesNames.forEach((l) => {
				const value = d[l] || 0;
				if (newObj._max || newObj._max === 0) newObj._max += +value;
			});
			loadSeries.forEach((l) => {
				const value = d[l] || 0;
				if (newObj._min || newObj._min === 0) newObj._min += +value;
			});

			return newObj;
		});
	}

	/**
	 * @param {FuelTechCode[]} groups
	 * @param {IspData[]} originalData
	 * @returns {IspData[]}
	 */
	function groupedIspData(groups, originalData) {
		/** @type {IspData[]} */
		let grouped = [];

		groups.forEach((code) => {
			const codes = fuelTechGroup(code);
			const filtered = originalData.filter((d) => codes.includes(d.fuel_tech));

			if (filtered.length > 0) {
				const projection = filtered[0].projection;
				const groupObject = {
					...filtered[0],
					fuel_tech: code,
					id: `${code}.${filtered[0].scenario}.${filtered[0].pathway.toLowerCase()}`,
					projection: { ...projection }
				};

				// set the group projection.data array to all zeros
				groupObject.projection.data = groupObject.projection.data.map(() => 0);

				// sum each filtered projection.data array into group projection data
				filtered.forEach((d) => {
					d.projection.data.forEach((d, i) => {
						groupObject.projection.data[i] += d;
					});
				});

				grouped.push(groupObject);
			}
		});

		return grouped;
	}
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

	<div class="flex">
		<div class="text-dark-grey max-w-[450px] text-sm">
			<div class="pr-12">
				<p>
					A range of modelled scenarios exist which envision the evolution of Australia's National
					Electricity Market (NEM) over the coming decades.
				</p>
				<p>
					These scenarios aim to steer Australia towards a cost-effective, reliable and safe energy
					system en route to a zero-emissions electricity network.
				</p>
				<p>Explore the <strong>2022 AEMO</strong> future scenarios below.</p>

				<div class="flex flex-wrap gap-6">
					{#each scenarios as scenario}
						<button
							class="rounded-lg border border-mid-warm-grey hover:bg-light-warm-grey px-8 py-4 capitalize"
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
		</div>

		<div class="w-full">
			<div class="flex gap-6 text-sm text-alert-yellow">
				<label>
					<span>Pathways</span>

					<select
						bind:value={selectedPathway}
						class="w-full block rounded-md text-base border-0 py-4 pl-4 pr-12 text-dark-grey ring-1 ring-mid-warm-grey focus:ring-dark-grey"
					>
						{#each scenarioPathways as pathway}
							<option value={pathway}>{pathway}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Fuel Technology Group</span>

					<select
						bind:value={selectedFtGroup}
						class="w-full block rounded-md text-base border-0 py-4 pl-4 pr-12 text-dark-grey ring-1 ring-mid-warm-grey focus:ring-dark-grey"
					>
						{#each ftGroups as ftGroup}
							<option value={ftGroup}>
								{ftGroup}
							</option>
						{/each}
					</select>
				</label>
			</div>

			{#if filteredWithPathwayScenario.length === 0}
				<p class="mt-6">No data for this scenario and pathway</p>
			{:else}
				<IspChart
					dataset={tsData}
					{xKey}
					yKey={[0, 1]}
					yDomain={selectedScenario === 'hydrogen_superpower' ? undefined : [-150000, 500000]}
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
</section>
