<script>
	import SignificantRecordCard from './SignificantRecordCard.svelte';
	import StandardRecordCard from './StandardRecordCard.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/types/record.types').Record[]} record
	 */

	/** @type {Props & { [key: string]: any }} */
	let { record, ...rest } = $props();
	let isSignificant = $derived(record[0].significance > 6);
</script>

{#if isSignificant}
	<SignificantRecordCard {record} class={rest.class} />
{:else}
	<StandardRecordCard {record} class={rest.class} />
{/if}
