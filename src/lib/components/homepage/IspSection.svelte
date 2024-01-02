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
	import IspChart from '$lib/components/homepage/IspChart.svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let data;

	let scenarios = ['step_change', 'progressive_change', 'slow_change', 'hydrogen_superpower'];
	let ftGroups = ['Custom', 'Detailed'];

	let selectedPathway = null;
	let selectedScenario = scenarios[0];
	let selectedFuelTech = data.fuelTechs[0];
	let selectedFtGroup = ftGroups[0];

	function deepCopy(original) {
		if (Array.isArray(original)) {
			return original.map((elem) => deepCopy(elem));
		} else if (typeof original === 'object' && original !== null) {
			return Object.fromEntries(Object.entries(original).map(([k, v]) => [k, deepCopy(v)]));
		} else {
			// Primitive value: atomic, no need to copy
			return original;
		}
	}

	$: outlookData = data.outlookEnergyNem.data;
	// $: console.log(outlookData);

	// $: pathways = data.pathways;
	// $: scenarios = data.scenarios;
	$: fuelTechs = data.fuelTechs;

	$: filteredWithScenario = outlookData.filter((d) => d.scenario === selectedScenario);
	$: scenarioPathways = [...new Set(filteredWithScenario.map((d) => d.pathway))].sort();
	$: if (selectedPathway === null) {
		selectedPathway = scenarioPathways[0];
	}

	$: filteredWithPathwayScenario = filteredWithScenario.filter(
		(d) => d.pathway === selectedPathway
	);

	let groupedFilteredWithPathwayScenario = [];
	let orderedFilteredWithPathwayScenario = [];
	let seriesColours = [];
	$: {
		orderedFilteredWithPathwayScenario = [];
		seriesColours = [];
		fuelTechNames.forEach((code) => {
			const filtered = filteredWithPathwayScenario.filter((d) => d.fuel_tech === code);
			if (filtered.length > 0) {
				orderedFilteredWithPathwayScenario.push(deepCopy(filtered[0]));
				seriesColours.push(fuelTechColour(code));
			}
		});

		orderedFilteredWithPathwayScenario.forEach((d) => {
			const code = d.fuel_tech;
			// invert fuel techs that are exports, battery charging or demand response
			if (
				code === 'exports' ||
				code === 'battery_charging' ||
				code === 'battery_VPP_charging' ||
				code === 'battery_distributed_charging' ||
				code === 'demand_response'
			) {
				d.projection.data.forEach((value, i) => {
					d.projection.data[i] = value * -1;
				});
			}
		});
	}
	$: {
		groupedFilteredWithPathwayScenario = [];
		fuelTechGroups.forEach((code) => {
			const codes = fuelTechGroup(code);
			const filtered = orderedFilteredWithPathwayScenario.filter((d) =>
				codes.includes(d.fuel_tech)
			);

			if (filtered.length > 0) {
				const projection = filtered[0].projection;
				const groupObject = {
					...filtered[0],
					fuel_tech: code,
					id: `${code}.${filtered[0].scenario}.${filtered[0].pathway.toLowerCase()}`,
					projection: { ...projection }
				};
				// const groupObject = filtered[0];
				// groupObject.fuel_tech = code;
				// groupObject.id = `${code}.${filtered[0].scenario}.${filtered[0].pathway.toLowerCase()}`;

				// set the group projection.data array to all zeros
				groupObject.projection.data = groupObject.projection.data.map((d) => 0);

				// sum each filtered projection.data array into group projection data
				filtered.forEach((d) => {
					d.projection.data.forEach((d, i) => {
						groupObject.projection.data[i] += d;
					});

					// invert fuel techs that are exports, battery charging or demand response
					// if (code === 'exports' || code === 'battery_charging' || code === 'demand_response') {
					// 	groupObject.projection.data.forEach((value, i) => {
					// 		groupObject.projection.data[i] = value * -1;
					// 	});
					// }
				});

				groupedFilteredWithPathwayScenario.push(groupObject);
			}
		});
	}
	$: groupedTsData = transformToTimeSeriesDataset(groupedFilteredWithPathwayScenario);
	$: groupedSeriesNames =
		groupedTsData && groupedTsData.length
			? Object.keys(groupedTsData[0]).filter((d) => d !== xKey && d !== 'time')
			: [];

	$: filteredWithAll = outlookData.filter(
		(d) =>
			d.pathway === selectedPathway &&
			d.scenario === selectedScenario &&
			d.fuel_tech === selectedFuelTech
	);
	// $: console.log(filteredWithPathwayScenario);
	// $: console.log(filteredWithAll);

	$: tsData = transformToTimeSeriesDataset(orderedFilteredWithPathwayScenario);

	const xKey = 'date';
	$: seriesNames =
		tsData && tsData.length ? Object.keys(tsData[0]).filter((d) => d !== xKey && d !== 'time') : [];
	// $: seriesColours = fuelTechNames.map((d) => fuelTechColour(d));

	$: fuelTechGroupNames = fuelTechGroups.map((d) => fuelTechName(d));
	$: fuelTechGroupColours = fuelTechGroups.map((d) => fuelTechColour(d));
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
			{:else if selectedFtGroup === 'Custom'}
				<IspChart
					data={groupedTsData}
					{xKey}
					yKey={[0, 1]}
					yDomain={selectedScenario === 'hydrogen_superpower' ? undefined : [-150000, 500000]}
					zKey="key"
					seriesNames={groupedSeriesNames}
					seriesColours={fuelTechGroupColours}
				/>

				<div class="flex gap-2 flex-wrap text-xs">
					{#each groupedFilteredWithPathwayScenario as row}
						<span
							class="py-1 px-3 rounded"
							style={`background-color: ${fuelTechColour(row.fuel_tech)}; 
							color: ${getContrastedTextColour(fuelTechColour(row.fuel_tech))}`}
						>
							{fuelTechName(row.fuel_tech)}
						</span>
					{/each}
				</div>
			{:else if selectedFtGroup === 'Detailed'}
				<IspChart
					data={tsData}
					{xKey}
					yKey={[0, 1]}
					yDomain={selectedScenario === 'hydrogen_superpower' ? undefined : [-150000, 500000]}
					zKey="key"
					{seriesNames}
					{seriesColours}
				/>

				<div class="flex gap-2 flex-wrap text-xs">
					{#each orderedFilteredWithPathwayScenario as row}
						<span
							class="py-1 px-3 rounded"
							style={`background-color: ${fuelTechColour(row.fuel_tech)}; 
							color: ${getContrastedTextColour(fuelTechColour(row.fuel_tech))}`}
						>
							{fuelTechName(row.fuel_tech)}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>
