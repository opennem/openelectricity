import { derived, writable } from 'svelte/store';
import { defaultSignificance } from '../page-data-options/filters.js';

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
	/** @type {import('svelte/store').Writable<number>} */
	const selectedSignificance = writable(defaultSignificance);

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
		selectedPeriods,
		selectedSignificance
	};
}
