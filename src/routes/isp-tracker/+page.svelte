<script>
	import { getContrastedTextColour } from '$lib/colours.js';
	import {
		fuelTechNames,
		fuelTechName,
		fuelTechColour,
		fuelTechGroups,
		fuelTechGroup
	} from '$lib/fuel_techs.js';
	import IspChart from '$lib/components/homepage/IspChart.svelte';
	import { transformToTimeSeriesDataset } from '$lib/utils/time-series-helpers';

	export let data;

	let selectedPathway = data.pathways[0];
	let selectedScenario = data.scenarios[0];
	let selectedFuelTech = data.fuelTechs[0];

	$: outlookData = data.outlookEnergyNem.data;
	// $: console.log(outlookData);

	$: pathways = data.pathways;
	$: scenarios = data.scenarios;
	$: fuelTechs = data.fuelTechs;
	$: console.log(
		'fuel techs',
		fuelTechs,
		fuelTechs.map((d) => fuelTechName(d))
	);

	$: filteredWithPathwayScenario = outlookData.filter(
		(d) => d.pathway === selectedPathway && d.scenario === selectedScenario
	);
	$: console.log('filteredWithPathwayScenario', filteredWithPathwayScenario);

	let groupedFilteredWithPathwayScenario = [];
	let orderedFilteredWithPathwayScenario = [];
	let seriesColours = [];
	$: {
		orderedFilteredWithPathwayScenario = [];
		seriesColours = [];
		fuelTechNames.forEach((code) => {
			const filtered = filteredWithPathwayScenario.filter((d) => d.fuel_tech === code);
			if (filtered.length > 0) {
				orderedFilteredWithPathwayScenario.push(filtered[0]);
				seriesColours.push(fuelTechColour(code));
			}
		});
	}
	$: {
		groupedFilteredWithPathwayScenario = [];
		fuelTechGroups.forEach((code) => {
			const codes = fuelTechGroup(code);
			const filtered = filteredWithPathwayScenario.filter((d) => codes.includes(d.fuel_tech));

			console.log('fuelTechGroup', code, fuelTechGroup(code), filtered);
			if (filtered.length > 0) {
				const projection = filtered[0].projection;
				const groupObject = {
					...filtered[0],
					fuel_tech: code,
					id: `${code}.${filtered[0].scenario}.${filtered[0].pathway.toLowerCase()}`,
					projection: { ...projection }
				};

				// reset the projection.data array to all zeros
				groupObject.projection.data = groupObject.projection.data.map((d) => 0);

				// sum the projection.data array inside each filtered projection.data array
				filtered.forEach((d) => {
					d.projection.data.forEach((d, i) => {
						groupObject.projection.data[i] += d;
					});

					if (code === 'exports' || code === 'battery_charging' || code === 'demand_response') {
						d.projection.data.forEach((d, i) => {
							groupObject.projection.data[i] = -groupObject.projection.data[i];
						});
					}
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
	$: console.log(
		'groupedFilteredWithPathwayScenario',
		groupedFilteredWithPathwayScenario,
		groupedTsData
	);

	$: filteredWithAll = outlookData.filter(
		(d) =>
			d.pathway === selectedPathway &&
			d.scenario === selectedScenario &&
			d.fuel_tech === selectedFuelTech
	);
	// $: console.log(filteredWithPathwayScenario);
	// $: console.log(filteredWithAll);

	$: tsData = transformToTimeSeriesDataset(orderedFilteredWithPathwayScenario);
	$: console.log('tsData', tsData);

	const xKey = 'date';
	$: seriesNames =
		tsData && tsData.length ? Object.keys(tsData[0]).filter((d) => d !== xKey && d !== 'time') : [];
	// $: seriesColours = fuelTechNames.map((d) => fuelTechColour(d));
	$: console.log('seriesNames', seriesNames, seriesColours);

	$: fuelTechGroupNames = fuelTechGroups.map((d) => fuelTechName(d));
	$: fuelTechGroupColours = fuelTechGroups.map((d) => fuelTechColour(d));
	$: console.log('fuelTechGroupNames', fuelTechGroupNames, fuelTechGroupColours);
</script>

<section class="p-4">
	<div>
		<select bind:value={selectedPathway} class="text-sm">
			{#each pathways as pathway}
				<option value={pathway}>{pathway}</option>
			{/each}
		</select>

		<select bind:value={selectedScenario} class="text-sm">
			{#each scenarios as scenario}
				<option value={scenario}>{scenario}</option>
			{/each}
		</select>

		<!-- <select bind:value={selectedFuelTech} class="text-sm">
		{#each fuelTechs as fuelTech}
			<option value={fuelTech}>{fuelTech}</option>
		{/each}
	</select> -->
	</div>

	{#if filteredWithPathwayScenario.length === 0}
		<p>No data for this scenario and pathway</p>
	{:else}
		<IspChart
			data={groupedTsData}
			{xKey}
			yKey={[0, 1]}
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

		<hr class="my-10" />

		<IspChart data={tsData} {xKey} yKey={[0, 1]} zKey="key" {seriesNames} {seriesColours} />

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
</section>
