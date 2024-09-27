import { derived, writable } from 'svelte/store';

export default function () {
	const selectedView = writable('list');
	const selectedFuelTechs = writable([]);
	const selectedMetrics = writable([]);
	const selectedPeriods = writable([]);

	return {
		selectedView,
		selectedFuelTechs,
		selectedMetrics,
		selectedPeriods
	};
}
