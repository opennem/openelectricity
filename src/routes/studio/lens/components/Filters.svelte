<script>
	import { getContext } from 'svelte';

	/** @type {EmberCountry[]} */
	export let countries;

	const { selectedRegion } = getContext('filters');

	$selectedRegion = 'x-WRD';

	// iso string begins with `x-` for regions
	$: regionsOnly = countries.filter((country) => country.iso.startsWith('x-'));
	$: countriesOnly = countries.filter((country) => !country.iso.startsWith('x-'));
</script>

<select
	class="flex flex-col gap-2 border-dark-grey outline-none bg-light-warm-grey p-4 rounded-lg text-sm"
	bind:value={$selectedRegion}
>
	<optgroup label="Regions">
		{#each regionsOnly as region}
			<option value={region.iso}>{region.name}</option>
		{/each}
	</optgroup>

	<optgroup label="Countries">
		{#each countriesOnly as country}
			<option value={country.iso}>{country.name}</option>
		{/each}
	</optgroup>
</select>
