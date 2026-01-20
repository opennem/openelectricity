<script>
	import { tick } from 'svelte';
	import FacilityCard from './_components/FacilityCard.svelte';
	import { scrollToFacilityIfNeeded } from './_utils/scroll-utils';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   clickedFacility?: any | null,
	 *   selectedFacilityCode?: string | null,
	 *   onhover?: (facility: any | null) => void,
	 *   onclick?: (facility: any) => void
	 * }}
	 */
	let {
		facilities = [],
		hoveredFacility = null,
		clickedFacility = null,
		selectedFacilityCode = null,
		onhover,
		onclick
	} = $props();

	// Scroll to facility when clickedFacility changes (from map click)
	$effect(() => {
		if (clickedFacility) {
			tick().then(() => {
				scrollToFacilityIfNeeded(clickedFacility.code, 'smooth', 'nearest');
			});
		}
	});

	// Scroll to selected facility if not in view
	$effect(() => {
		if (selectedFacilityCode && facilities.length > 0) {
			tick().then(() => {
				scrollToFacilityIfNeeded(selectedFacilityCode, 'auto', 'center');
			});
		}
	});

	/**
	 * @param {any} f
	 */
	function handleMouseEnter(f) {
		onhover?.(f);
	}

	function handleMouseLeave() {
		onhover?.(null);
	}
</script>

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<ul class="px-8 py-4 sm:px-0 sm:py-0 flex flex-col gap-6 sm:block">
		{#each facilities as facility (facility.code || facility.name)}
			<FacilityCard
				{facility}
				isHighlighted={hoveredFacility?.code === facility.code}
				isSelected={selectedFacilityCode === facility.code}
				onclick={(f) => onclick?.(f)}
				onmouseenter={handleMouseEnter}
				onmouseleave={handleMouseLeave}
			/>
		{/each}
	</ul>
{/if}
