<script>
	import FacilityCard from './FacilityCard.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {any[]} facilities
	 */

	/** @type {Props} */
	let { facilities = [] } = $props();
</script>

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<ul class="space-y-1">
		{#each facilities as facility (facility.code || facility.name)}
			<FacilityCard {facility} />
		{/each}
	</ul>
{/if}
