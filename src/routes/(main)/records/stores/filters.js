import { derived, writable } from 'svelte/store';

export default function () {
	const selectedView = writable('list');
	/** @type {import('svelte/store').Writable<string[]>} */
	const selectedRegions = writable([]);
	/** @type {import('svelte/store').Writable<string[]>} */
	const selectedFuelTechs = writable([]);
	/** @type {import('svelte/store').Writable<string[]>} */
	const selectedMetrics = writable([]);
	/** @type {import('svelte/store').Writable<string[]>} */
	const selectedPeriods = writable([]);

	const selectedRegion = derived(selectedRegions, ($selectedRegions) => {
		// ATM, it's only possible to select one region
		return $selectedRegions.length === 1 ? $selectedRegions[0] : null;
	});

	return {
		selectedView,
		selectedRegion,
		selectedRegions,
		selectedFuelTechs,
		selectedMetrics,
		selectedPeriods
	};
}
