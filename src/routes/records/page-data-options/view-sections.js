import IconTableCells from '$lib/icons/TableCells.svelte';
import IconQueueList from '$lib/icons/QueueList.svelte';

/** @type {ViewSectionOption[]} */
export const viewSectionOptions = [
	{
		value: 'list',
		icon: IconQueueList,
		size: 'size-6'
	},
	{
		value: 'table',
		icon: IconTableCells,
		size: 'size-6'
	}
];
