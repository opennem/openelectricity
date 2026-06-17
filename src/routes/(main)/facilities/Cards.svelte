<script>
	import { tick } from 'svelte';
	import FacilityOgCard from '$lib/components/FacilityOgCard.svelte';
	import { scrollToFacilityIfNeeded } from './_utils/scroll-utils';

	/**
	 * Card-grid view for the facilities page. Renders each (already-filtered)
	 * facility as its build-generated OG social card (`/og/facility/<code>.jpg`),
	 * falling back to a live <FacilityOgCard> for facilities without a committed JPG.
	 * Lives in the same resizable panel as List/Timeline, so the column count is
	 * driven by container width (not the viewport).
	 *
	 * @type {{
	 *   facilities: any[],
	 *   selectedFacilityCode?: string | null,
	 *   cardCodes?: Set<string>,
	 *   onclick?: (facility: any) => void,
	 *   onhover?: (facility: any | null) => void
	 * }}
	 */
	let {
		facilities = [],
		selectedFacilityCode = null,
		cardCodes = new Set(),
		onclick,
		onhover
	} = $props();

	// Keep the selected card in view when selection changes (e.g. via keyboard).
	$effect(() => {
		if (selectedFacilityCode && facilities.length > 0) {
			tick().then(() => {
				scrollToFacilityIfNeeded(selectedFacilityCode, 'auto', 'center');
			});
		}
	});
</script>

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<div class="@container p-4">
		<ul class="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-3">
			{#each facilities as facility (facility.code || facility.name)}
				{@const isSelected = selectedFacilityCode === facility.code}
				<li data-facility-code={facility.code}>
					<button
						type="button"
						class="group block w-full overflow-hidden rounded-lg border bg-light-warm-grey text-left transition-shadow cursor-pointer hover:shadow-md {isSelected
							? 'border-dark-grey ring-2 ring-dark-grey'
							: 'border-mid-warm-grey/40'}"
						title={facility.name}
						aria-label={facility.name}
						aria-pressed={isSelected}
						onclick={() => onclick?.(facility)}
						onmouseenter={() => onhover?.(facility)}
						onmouseleave={() => onhover?.(null)}
					>
						{#if cardCodes.has(facility.code)}
							<img
								src="/og/facility/{facility.code}.jpg"
								alt="Social card for {facility.name}"
								loading="lazy"
								width="1200"
								height="630"
								class="block aspect-[1200/630] w-full object-cover"
							/>
						{:else}
							<FacilityOgCard {facility} />
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
