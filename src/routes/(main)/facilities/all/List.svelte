<script>
	import FacilityCard from '../_components/FacilityCard.svelte';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   onhover?: (facility: any | null) => void
	 * }}
	 */
	let { facilities = [], onhover } = $props();
</script>

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<ul>
		{#each facilities as facility (facility.code || facility.name)}
			<FacilityCard
				{facility}
				onmouseenter={(f) => onhover?.(f)}
				onmouseleave={() => onhover?.(null)}
			/>
		{/each}
	</ul>
{/if}
