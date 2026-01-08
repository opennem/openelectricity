<script>
	import { tick } from 'svelte';
	import FacilityCard from '../_components/FacilityCard.svelte';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   onhover?: (facility: any | null) => void
	 * }}
	 */
	let { facilities = [], hoveredFacility = null, onhover } = $props();

	// Track if hover originated from this component (to avoid scroll fighting)
	let isLocalHover = false;

	// Scroll to highlighted facility when hoveredFacility changes (from map)
	$effect(() => {
		if (hoveredFacility && !isLocalHover) {
			tick().then(() => {
				const el = document.querySelector(`[data-facility-code="${hoveredFacility.code}"]`);
				el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			});
		}
	});

	/**
	 * @param {any} f
	 */
	function handleMouseEnter(f) {
		isLocalHover = true;
		onhover?.(f);
	}

	function handleMouseLeave() {
		isLocalHover = false;
		onhover?.(null);
	}
</script>

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<ul>
		{#each facilities as facility (facility.code || facility.name)}
			<FacilityCard
				{facility}
				isHighlighted={hoveredFacility?.code === facility.code}
				onmouseenter={handleMouseEnter}
				onmouseleave={handleMouseLeave}
			/>
		{/each}
	</ul>
{/if}
