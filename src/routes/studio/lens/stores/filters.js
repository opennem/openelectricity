import { derived, writable } from 'svelte/store';

export default function () {
	const selectedRegion = writable('');

	return {
		selectedRegion
	};
}
