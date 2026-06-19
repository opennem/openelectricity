<script>
	import { tick } from 'svelte';
	import FacilityCardTile from './_components/FacilityCardTile.svelte';
	import { scrollToFacilityIfNeeded } from './_utils/scroll-utils';

	/**
	 * Card-grid view for the facilities page. Renders each (already-filtered)
	 * facility as a native <FacilityCardTile> — its Sanity photo when available,
	 * else a colour-wash card — so the grid never depends on the committed JPGs.
	 * Lives in the same resizable panel as List/Timeline, so the column count is
	 * driven by container width (not the viewport).
	 *
	 * @type {{
	 *   facilities: any[],
	 *   selectedFacilityCode?: string | null,
	 *   facilityPhotos?: Record<string, string>,
	 *   onclick?: (facility: any) => void,
	 *   onhover?: (facility: any | null) => void
	 * }}
	 */
	let {
		facilities = [],
		selectedFacilityCode = null,
		facilityPhotos = {},
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
						<FacilityCardTile {facility} photoUrl={facilityPhotos[facility.code] ?? null} />
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
