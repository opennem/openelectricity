import { derived, writable } from 'svelte/store';

export default function () {
	const selectedFuelTechs = writable([]);
	const selectedMetrics = writable([]);
	const selectedPeriods = writable([]);

	return {
		selectedFuelTechs,
		selectedMetrics,
		selectedPeriods
	};
}
