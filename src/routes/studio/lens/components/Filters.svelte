<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	/** @type {EmberCountry[]} */
	export let countries;

	const { selectedRegion } = getContext('ember-filters');

	$: countryOptions = countries.map((country) => ({
		label: country.name,
		value: country.iso
	}));
</script>

<FormSelect
	formLabel="Region / Country"
	options={countryOptions}
	selected={$selectedRegion}
	paddingX="px-7"
	paddingY="py-3"
	on:change={(evt) => ($selectedRegion = evt.detail.value)}
/>
