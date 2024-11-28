<script>
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	export let countries;

	$: countryOptions = countries.map((country) => ({
		label: country.name,
		value: country.iso
	}));

	let selectedCountry = '';
</script>

<FormSelect
	formLabel="Region / Country"
	options={countryOptions}
	selected={selectedCountry}
	paddingX="px-7"
	paddingY="py-3"
	on:change={(evt) => (selectedCountry = evt.detail.value)}
/>
