import { writable } from 'svelte/store';

export default function () {
	const cachedDisplayData = writable({});

	return {
		cachedDisplayData: cachedDisplayData
	};
}
