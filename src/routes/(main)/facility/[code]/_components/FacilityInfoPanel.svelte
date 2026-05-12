<script>
	import { ExternalLink, Globe, BookOpen, Building2 } from '@lucide/svelte';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';

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

	let websiteUrl = $derived(sanityFacility?.website ?? null);
	let wikipediaUrl = $derived(sanityFacility?.wikipedia ?? null);
	let wikidataId = $derived(sanityFacility?.wikidata_id ?? null);
	let wikidataUrl = $derived(
		wikidataId ? `${EXTERNAL_LINKS.wikidata.baseUrl}/${wikidataId}` : null
	);
	let hasLinks = $derived(Boolean(websiteUrl || wikipediaUrl || wikidataUrl || owners.length > 0));

	let location = $derived(facility?.location ?? sanityFacility?.location ?? null);
	let hasLocation = $derived(
		location && typeof location.lat === 'number' && typeof location.lng === 'number'
	);

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

	let hasContent = $derived(hasDescription || photos.length > 0 || hasLinks || hasLocation);

	let expanded = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let descriptionEl = $state(undefined);
	let needsExpand = $state(false);

	$effect(() => {
		const _desc = description;
		if (descriptionEl) {
			requestAnimationFrame(() => {
				needsExpand = descriptionEl ? descriptionEl.scrollHeight > 160 : false;
			});
		}
	});

	$effect(() => {
		const _code = sanityFacility?.code;
		expanded = false;
		needsExpand = false;
	});

	const PILL_CLASSES =
		'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-grey bg-light-warm-grey rounded-full border border-warm-grey hover:bg-warm-grey hover:text-black transition-colors no-underline';
</script>

{#snippet linkPill(
	/** @type {string} */ href,
	/** @type {any} */ Icon,
	/** @type {string} */ label
)}
	<a {href} target="_blank" rel="noopener noreferrer" class={PILL_CLASSES}>
		<Icon size={11} class="shrink-0" />
		{label}
	</a>
{/snippet}

<div class="space-y-4">
	{#if !hasContent}
		<div class="p-5">
			<p class="text-sm text-mid-grey">No description available.</p>
		</div>
	{:else}
		{#if hasDescription}
			{@const MAX_HEIGHT = 160}
			<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
				<div class="px-6 py-3 border-b border-mid-warm-grey/40">
					<h3 class="text-sm font-semibold text-dark-grey m-0">About</h3>
				</div>
				<div class="p-5">
					<div
						class="relative overflow-hidden"
						style:max-height={!expanded ? `${MAX_HEIGHT}px` : 'none'}
					>
						<div bind:this={descriptionEl}>
							<PortableTextBody
								value={description}
								class="text-sm text-dark-grey/80 leading-relaxed"
							/>
						</div>

						{#if needsExpand && !expanded}
							<div
								class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"
							></div>
						{/if}
					</div>

					{#if needsExpand}
						<button
							class="mt-2 text-xs text-mid-grey/60 hover:text-mid-grey transition-colors cursor-pointer"
							onclick={() => (expanded = !expanded)}
						>
							{expanded ? 'Show less' : 'Read more'}
						</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if photos.length > 0}
			<div class="h-[180px]">
				<PhotoCarousel {photos} fill class="h-full" />
			</div>
		{/if}

		{#if hasLocation}
			<div class="h-[180px]">
				{#await import('./FacilityMiniMap.svelte') then { default: FacilityMiniMap }}
					<FacilityMiniMap lat={location.lat} lng={location.lng} color={primaryFuelTechColor} />
				{/await}
			</div>
		{/if}

		{#if hasLinks}
			<div class="flex flex-wrap gap-1.5">
				{#if websiteUrl}
					{@render linkPill(websiteUrl, Globe, 'Website')}
				{/if}
				{#if wikipediaUrl}
					{@render linkPill(wikipediaUrl, BookOpen, 'Wikipedia')}
				{/if}
				{#if wikidataUrl}
					{@render linkPill(wikidataUrl, ExternalLink, 'Wikidata')}
				{/if}
				{#each owners as owner (owner._id)}
					{#if owner.website}
						{@render linkPill(owner.website, Building2, owner.name || owner.legal_name)}
					{:else}
						<span class={PILL_CLASSES}>
							<Building2 size={11} class="shrink-0" />
							{owner.name || owner.legal_name}
						</span>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</div>
