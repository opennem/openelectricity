<script>
	import { primaryFuelTechColour } from '$lib/utils/fueltech-display';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import IconArrowsPointingOut from '$lib/icons/ArrowsPointingOut.svelte';
	import FacilityMapLightbox from './FacilityMapLightbox.svelte';

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

	// Clicking the mini-map expands it into a fully interactive lightbox
	// (mirrors the photo lightbox above it).
	let mapExpanded = $state(false);
</script>

{#if photos.length || hasLocation}
	<div class="space-y-10">
		{#if photos.length}
			<div class="h-[180px]">
				<PhotoCarousel {photos} fill class="h-full" />
			</div>
		{/if}

		{#if hasLocation && showMap}
			<div class="relative h-[180px]">
				{#await import('./FacilityMiniMap.svelte') then { default: FacilityMiniMap }}
					<FacilityMiniMap
						lat={location.lat}
						lng={location.lng}
						color={primaryFuelTechColor}
						{osmWayId}
					/>
				{/await}
				<!-- Full-size click target — intercepts the mini-map's own (dampened)
				     gestures; full interaction lives in the expanded lightbox. -->
				<button
					type="button"
					class="group absolute inset-0 z-10 cursor-zoom-in rounded-lg"
					aria-label="Expand map"
					title="Expand map"
					onclick={() => (mapExpanded = true)}
				>
					<span
						class="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
					>
						<IconArrowsPointingOut class="size-4" />
					</span>
				</button>
			</div>
		{/if}
	</div>
{/if}

{#if mapExpanded && hasLocation}
	<FacilityMapLightbox
		lat={location.lat}
		lng={location.lng}
		color={primaryFuelTechColor}
		{osmWayId}
		onclose={() => (mapExpanded = false)}
	/>
{/if}
