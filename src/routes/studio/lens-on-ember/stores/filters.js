import { derived, writable } from 'svelte/store';

export default function () {
	/** @type {import('svelte/store').Writable<EmberCountry[]>} */
	const countries = writable([]);
	const selectedRegion = writable('');
	const selectedRange = writable('');
	const selectedInterval = writable('');
	const selectedFuelTechGroup = writable('rvf');

	// Derived store
	const selectedRegionLabel = derived(
		[countries, selectedRegion],
		([$countries, $selectedRegion]) => {
			const find = $countries.find((country) => country.iso === $selectedRegion);
			return find ? find.name : '';
		}
	);

	const is12MthRollingSum = derived(
		selectedRange,
		($selectedRange) => $selectedRange === '12-month-rolling'
	);

	return {
		countries,
		selectedRegion,
		selectedRegionLabel,
		selectedRange,
		selectedInterval,
		is12MthRollingSum,
		selectedFuelTechGroup
	};
}
