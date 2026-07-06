<script>
	import { primaryFuelTechColour } from '$lib/utils/fueltech-display';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';

	/**
	 * `showMap` gates the location mini-map: on mobile the map has its own
	 * full-bleed tab, so the panel skips it here — gating the *mount* (not just
	 * `display`) avoids booting a second, invisible MapLibre instance.
	 * @type {{
	 *   facility?: any | null,
	 *   sanityFacility: any | null,
	 *   showMap?: boolean
	 * }}
	 */
	let { facility = null, sanityFacility, showMap = true } = $props();

	let photos = $derived(sanityFacility?.photos ?? []);

	let location = $derived(facility?.location ?? sanityFacility?.location ?? null);
	let hasLocation = $derived(
		location && typeof location.lat === 'number' && typeof location.lng === 'number'
	);

	let osmWayId = $derived(sanityFacility?.osm_way_id ?? null);

	// Primary fuel-tech colour (most common among the units) tints the map marker + shape.
	let primaryFuelTechColor = $derived(primaryFuelTechColour(facility?.units));
</script>

{#if photos.length || hasLocation}
	<div class="space-y-10">
		{#if photos.length}
			<div class="h-[180px]">
				<PhotoCarousel {photos} fill class="h-full" />
			</div>
		{/if}

		{#if hasLocation && showMap}
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
