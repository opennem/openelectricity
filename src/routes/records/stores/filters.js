import { derived, writable } from 'svelte/store';

export default function () {
	const selectedView = writable('list');
	const selectedRegions = writable([]);
	const selectedFuelTechs = writable([]);
	const selectedMetrics = writable([]);
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
