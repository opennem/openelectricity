<script>
	import { ExternalLink, Globe, BookOpen, Building2, LayoutList, Grid2x2 } from '@lucide/svelte';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';
	import { FacilityUnitsTable } from '$lib/components/charts/facility';
	import FacilityMiniMap from './FacilityMiniMap.svelte';
	import FacilityUnitCards from './FacilityUnitCards.svelte';

	/**
	 * @type {{
	 *   sanityFacility: any | null,
	 *   facility?: any | null
	 * }}
	 */
	let { sanityFacility, facility = null } = $props();

	let description = $derived(sanityFacility?.description ?? []);
	let hasDescription = $derived(description.length > 0);
	let photos = $derived(sanityFacility?.photos ?? []);
	let owners = $derived(sanityFacility?.owners ?? []);

	// External links
	let websiteUrl = $derived(sanityFacility?.website ?? null);
	let wikipediaUrl = $derived(sanityFacility?.wikipedia ?? null);
	let wikidataId = $derived(sanityFacility?.wikidata_id ?? null);
	let wikidataUrl = $derived(
		wikidataId ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${wikidataId}` : null
	);
	let hasLinks = $derived(Boolean(websiteUrl || wikipediaUrl || wikidataUrl || owners.length > 0));

	// Location: prefer OE API, fall back to Sanity
	let location = $derived(facility?.location ?? sanityFacility?.location ?? null);
	let hasLocation = $derived(
		location && typeof location.lat === 'number' && typeof location.lng === 'number'
	);

	// Primary fuel tech colour for the map marker
	let primaryFuelTechColor = $derived.by(() => {
		if (!facility?.units?.length) return '#ffffff';
		/** @type {Record<string, number>} */
		const counts = {};
		for (const unit of facility.units) {
			const ft = unit.fueltech_id;
			if (ft) counts[ft] = (counts[ft] || 0) + 1;
		}
		let maxFt = /** @type {string | null} */ (null);
		let maxCount = 0;
		for (const [ft, count] of Object.entries(counts)) {
			if (count > maxCount) {
				maxCount = count;
				maxFt = ft;
			}
		}
		return maxFt ? fuelTechColourMap[maxFt] || '#ffffff' : '#ffffff';
	});

	// Units
	let units = $derived(facility?.units ?? []);
	let hasUnits = $derived(units.length > 0);

	/** @type {'table' | 'card'} */
	let viewMode = $state('card');

	let hasContent = $derived(hasDescription || photos.length > 0 || hasLinks || hasLocation || hasUnits);

	// Read more / expand
	let expanded = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let descriptionEl = $state(undefined);
	let needsExpand = $state(false);

	$effect(() => {
		// Re-measure when element binds or description changes
		const _desc = description;
		if (descriptionEl) {
			// Tick to let content render
			requestAnimationFrame(() => {
				needsExpand = descriptionEl ? descriptionEl.scrollHeight > 160 : false;
			});
		}
	});

	// Reset expanded state when facility changes
	$effect(() => {
		const _code = sanityFacility?.code;
		expanded = false;
	});
</script>

<div class="flex flex-col h-full min-h-0 overflow-y-auto">
	{#if !hasContent}
		<div class="p-5">
			<p class="text-sm text-mid-grey">No description available.</p>
		</div>
	{:else}
		<!-- Media row: photo + map -->
		{#if photos.length > 0 || hasLocation}
			<div class="grid {photos.length > 0 && hasLocation ? 'grid-cols-2' : 'grid-cols-1'} gap-3 px-5 pt-5 pb-4 min-h-[180px]">
				{#if photos.length > 0}
					<PhotoCarousel {photos} fill />
				{/if}

				{#if hasLocation}
					<FacilityMiniMap
						lat={location.lat}
						lng={location.lng}
						color={primaryFuelTechColor}
					/>
				{/if}
			</div>
		{/if}

		<!-- Content area -->
		<div class="px-5 pb-5 space-y-4 {photos.length > 0 || hasLocation ? '' : 'pt-5'}">
			<!-- Links -->
			{#if hasLinks}
				<div class="flex flex-wrap gap-1.5">
					{#if websiteUrl}
						<a
							href={websiteUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-grey
								bg-light-warm-grey rounded-full border border-warm-grey
								hover:bg-warm-grey hover:text-black transition-colors no-underline"
						>
							<Globe size={11} class="shrink-0" />
							Website
						</a>
					{/if}
					{#if wikipediaUrl}
						<a
							href={wikipediaUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-grey
								bg-light-warm-grey rounded-full border border-warm-grey
								hover:bg-warm-grey hover:text-black transition-colors no-underline"
						>
							<BookOpen size={11} class="shrink-0" />
							Wikipedia
						</a>
					{/if}
					{#if wikidataUrl}
						<a
							href={wikidataUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-grey
								bg-light-warm-grey rounded-full border border-warm-grey
								hover:bg-warm-grey hover:text-black transition-colors no-underline"
						>
							<ExternalLink size={11} class="shrink-0" />
							Wikidata
						</a>
					{/if}
					{#each owners as owner (owner._id)}
						{#if owner.website}
							<a
								href={owner.website}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-grey
									bg-light-warm-grey rounded-full border border-warm-grey
									hover:bg-warm-grey hover:text-black transition-colors no-underline"
							>
								<Building2 size={11} class="shrink-0" />
								{owner.name || owner.legal_name}
							</a>
						{:else}
							<span
								class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-grey
									bg-light-warm-grey rounded-full border border-warm-grey"
							>
								<Building2 size={11} class="shrink-0" />
								{owner.name || owner.legal_name}
							</span>
						{/if}
					{/each}
				</div>
			{/if}

			<!-- Description -->
			{#if hasDescription}
				{@const MAX_HEIGHT = 160}
				<div class="border-t border-warm-grey mt-8 pt-6">
					<div
						class="relative overflow-hidden"
						style:max-height={!expanded ? `${MAX_HEIGHT}px` : 'none'}
					>
						<div bind:this={descriptionEl}>
							<PortableTextBody value={description} class="text-sm text-dark-grey/80 leading-relaxed px-5" />
						</div>

						{#if needsExpand && !expanded}
							<div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
						{/if}
					</div>

					{#if needsExpand}
						<button
							class="mt-2 px-5 text-xs text-mid-grey/60 hover:text-mid-grey transition-colors cursor-pointer"
							onclick={() => (expanded = !expanded)}
						>
							{expanded ? 'Show less' : 'Read more'}
						</button>
					{/if}
				</div>
			{/if}

			<!-- Units -->
			{#if hasUnits}
				<div class="border-t border-warm-grey mt-8 pt-6">
					<div class="flex items-center justify-between mb-4">
						<h4 class="text-xs uppercase text-mid-grey m-0">
							{units.length} {units.length === 1 ? 'Unit' : 'Units'}
						</h4>
						<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
							<button
								class="p-1.5 rounded transition-colors cursor-pointer {viewMode === 'table'
									? 'bg-white shadow-sm text-dark-grey'
									: 'text-mid-grey hover:text-dark-grey'}"
								onclick={() => (viewMode = 'table')}
								aria-label="Table view"
							>
								<LayoutList size={14} />
							</button>
							<button
								class="p-1.5 rounded transition-colors cursor-pointer {viewMode === 'card'
									? 'bg-white shadow-sm text-dark-grey'
									: 'text-mid-grey hover:text-dark-grey'}"
								onclick={() => (viewMode = 'card')}
								aria-label="Card view"
							>
								<Grid2x2 size={14} />
							</button>
						</div>
					</div>

					{#if viewMode === 'table'}
						<FacilityUnitsTable {units} compact detailed />
					{:else}
						<FacilityUnitCards {facility} />
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
