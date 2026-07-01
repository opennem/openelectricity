<script>
	import { getFueltechColor } from '$lib/utils/fueltech-display';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';

	/**
	 * @type {{
	 *   facility?: any | null,
	 *   sanityFacility: any | null
	 * }}
	 */
	let { facility = null, sanityFacility } = $props();

	let photos = $derived(sanityFacility?.photos ?? []);

	let location = $derived(facility?.location ?? sanityFacility?.location ?? null);
	let hasLocation = $derived(
		location && typeof location.lat === 'number' && typeof location.lng === 'number'
	);

	let osmWayId = $derived(sanityFacility?.osm_way_id ?? null);

	// Primary fuel-tech colour (most common among the units) tints the map marker + shape.
	let primaryFuelTechColor = $derived.by(() => {
		/** @type {Record<string, number>} */
		const counts = {};
		for (const unit of facility?.units ?? []) {
			if (unit.fueltech_id) counts[unit.fueltech_id] = (counts[unit.fueltech_id] || 0) + 1;
		}
		let maxFt = '';
		let maxCount = 0;
		for (const [ft, count] of Object.entries(counts)) {
			if (count > maxCount) {
				maxCount = count;
				maxFt = ft;
			}
		}
		return maxFt ? getFueltechColor(maxFt) : '#ffffff';
	});
</script>

{#if photos.length || hasLocation}
	<div class="space-y-10">
		{#if photos.length}
			<div class="h-[180px]">
				<PhotoCarousel {photos} fill class="h-full" />
			</div>
		{/if}

		{#if hasLocation}
			<div class="h-[180px]">
				{#await import('./FacilityMiniMap.svelte') then { default: FacilityMiniMap }}
					<FacilityMiniMap
						lat={location.lat}
						lng={location.lng}
						color={primaryFuelTechColor}
						{osmWayId}
					/>
				{/await}
			</div>
		{/if}
	</div>
{/if}
