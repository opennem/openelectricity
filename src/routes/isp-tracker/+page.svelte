<script>
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

	$: filteredWithPathwayScenario = outlookData.filter(
		(d) => d.pathway === selectedPathway && d.scenario === selectedScenario
	);
	$: filteredWithAll = outlookData.filter(
		(d) =>
			d.pathway === selectedPathway &&
			d.scenario === selectedScenario &&
			d.fuel_tech === selectedFuelTech
	);
	// $: console.log(filteredWithPathwayScenario);
	// $: console.log(filteredWithAll);

	$: tsData = transformToTimeSeriesDataset(filteredWithPathwayScenario);
	$: console.log('tsData', tsData);
</script>

<h1>ISP tracker</h1>

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
	<table>
		<thead />
		<tbody>
			{#each filteredWithPathwayScenario as row}
				<tr>
					<td>{row.fuel_tech}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
