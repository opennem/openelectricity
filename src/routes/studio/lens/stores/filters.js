import { derived, writable } from 'svelte/store';

export default function () {
	/** @type {import('svelte/store').Writable<EmberCountry[]>} */
	const countries = writable([]);
	const selectedRegion = writable('');
	const selectedRange = writable('');

	// Derived store
	const selectedRegionLabel = derived(
		[countries, selectedRegion],
		([$countries, $selectedRegion]) => {
			const find = $countries.find((country) => country.iso === $selectedRegion);
			return find ? find.name : '';
		}
	);

	return {
		countries,
		selectedRegion,
		selectedRegionLabel,
		selectedRange
	};
}
