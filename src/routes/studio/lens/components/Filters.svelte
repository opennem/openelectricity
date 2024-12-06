<script>
	import { getContext } from 'svelte';

	import Switch from '$lib/components/Switch.svelte';

	/** @type {EmberCountry[]} */
	export let countries;

	const { selectedRegion, selectedInterval } = getContext('filters');

	$selectedInterval = 'yearly';

	// iso string begins with `x-` for regions
	$: regionsOnly = countries.filter((country) => country.iso.startsWith('x-'));
	$: countriesOnly = countries.filter((country) => !country.iso.startsWith('x-'));
</script>

<div class="flex gap-4">
	<select
		class="flex flex-col gap-2 border-dark-grey outline-none bg-light-warm-grey p-4 rounded-lg text-sm"
		name="region"
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

	<Switch
		buttons={[
			{
				label: 'Monthly',
				value: 'monthly'
			},
			{
				label: 'Yearly',
				value: 'yearly'
			}
		]}
		selected={$selectedInterval}
		xPad={4}
		yPad={2}
		textSize="sm"
		on:change={(evt) => ($selectedInterval = evt.detail.value)}
	/>
</div>
