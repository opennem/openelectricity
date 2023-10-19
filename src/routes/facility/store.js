import { derived, readable, writable } from 'svelte/store';

/** @typedef {{label: string, fullLabel: string, value: string}} ListItem  */

/** @type {import('svelte/store').Readable<ListItem[]>} */
export const rangeList = readable([
	{
		label: '1D',
		fullLabel: 'Last 24 Hours',
		value: '1D'
	},
	{
		label: '3D',
		fullLabel: 'Last 72 hours',
		value: '3D'
	},
	{
		label: '7D',
		fullLabel: 'Last 168 hours',
		value: '7D'
	},
	{
		label: '30D',
		fullLabel: 'Last 30 Days',
		value: '30D'
	},
	{
		label: '1Y',
		fullLabel: 'Last 12 Months',
		value: '1Y'
	},
	{
		label: 'ALL',
		fullLabel: 'All Recorded Time',
		value: 'ALL'
	}
]);
export const selectedRange = writable('3D');
export const selectedRangeLabel = derived(
	[rangeList, selectedRange],
	([$rangeList, $selectedRange]) => {
		const range = $rangeList.find((range) => range.value === $selectedRange);
		return range ? range.fullLabel : '';
	}
);

/** @type {import('svelte/store').Writable<ListItem[]>} */
export const intervalList = writable([
	{
		label: '5m',
		fullLabel: 'Every 5 minutes',
		value: '5m'
	},
	{
		label: '30m',
		fullLabel: 'Every 30 minutes',
		value: '30m'
	}
]);
export const selectedInterval = writable('30m');
export const selectedIntervalLabel = derived(
	[intervalList, selectedInterval],
	([$intervalList, $selectedInterval]) => {
		const interval = $intervalList.find((interval) => interval.value === $selectedInterval);
		return interval ? interval.fullLabel : '';
	}
);
