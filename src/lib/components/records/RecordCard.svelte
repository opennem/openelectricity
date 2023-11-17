<script>
	import SignificantRecordCard from './SignificantRecordCard.svelte';
	import StandardRecordCard from './StandardRecordCard.svelte';

	/** @type {import('$lib/types/record.types').Record[]} */
	export let record;
	let isSignificant = record[0].significance > 6;
</script>

{#if isSignificant}
	<SignificantRecordCard {record} class={$$restProps.class} />
{:else}
	<StandardRecordCard {record} class={$$restProps.class} />
{/if}
