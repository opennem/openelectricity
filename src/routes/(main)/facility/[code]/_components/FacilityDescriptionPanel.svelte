<script>
	import { ExternalLink, Globe, BookOpen, Building2 } from '@lucide/svelte';
	import { urlFor } from '$lib/sanity';
	import { extractParagraphs } from '$lib/utils/portable-text.js';
	import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FacilityMiniMap from './FacilityMiniMap.svelte';

	/**
	 * @type {{
	 *   sanityFacility: any | null,
	 *   facility?: any | null
	 * }}
	 */
	let { sanityFacility, facility = null } = $props();

	let paragraphs = $derived(extractParagraphs(sanityFacility?.description));
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

	let hasContent = $derived(paragraphs.length > 0 || photos.length > 0 || hasLinks || hasLocation);
</script>

<div class="flex flex-col h-full min-h-0 overflow-y-auto p-5 space-y-5">
	{#if !hasContent}
		<p class="text-sm text-mid-grey">No description available.</p>
	{:else}
		{#if hasLinks}
			<div class="flex flex-wrap gap-2">
				{#if websiteUrl}
					<a
						href={websiteUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-dark-grey
							bg-light-warm-grey rounded-full border border-warm-grey
							hover:bg-warm-grey hover:text-black transition-colors no-underline"
					>
						<Globe size={12} class="shrink-0" />
						Website
					</a>
				{/if}
				{#if wikipediaUrl}
					<a
						href={wikipediaUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-dark-grey
							bg-light-warm-grey rounded-full border border-warm-grey
							hover:bg-warm-grey hover:text-black transition-colors no-underline"
					>
						<BookOpen size={12} class="shrink-0" />
						Wikipedia
					</a>
				{/if}
				{#if wikidataUrl}
					<a
						href={wikidataUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-dark-grey
							bg-light-warm-grey rounded-full border border-warm-grey
							hover:bg-warm-grey hover:text-black transition-colors no-underline"
					>
						<ExternalLink size={12} class="shrink-0" />
						Wikidata
					</a>
				{/if}
				{#each owners as owner (owner._id)}
					{#if owner.website}
						<a
							href={owner.website}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-dark-grey
								bg-light-warm-grey rounded-full border border-warm-grey
								hover:bg-warm-grey hover:text-black transition-colors no-underline"
						>
							<Building2 size={12} class="shrink-0" />
							{owner.name || owner.legal_name}
						</a>
					{:else}
						<span
							class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-dark-grey
								bg-light-warm-grey rounded-full border border-warm-grey"
						>
							<Building2 size={12} class="shrink-0" />
							{owner.name || owner.legal_name}
						</span>
					{/if}
				{/each}
			</div>
		{/if}

		{#if photos.length > 0}
			{@const hero = photos[0]}
			<figure class="m-0">
				<img
					src={hero.asset ? urlFor(hero).width(640).url() : hero.url}
					alt={hero.alt || hero.caption || sanityFacility?.name || 'Facility photo'}
					class="w-full h-auto rounded-lg border border-warm-grey object-cover"
				/>
				{#if hero.caption || hero.attribution}
					<figcaption class="text-xxs text-mid-grey mt-1.5">
						{hero.caption ?? ''}{#if hero.attribution}{hero.caption
								? ' — '
								: ''}{hero.attribution}{/if}
					</figcaption>
				{/if}
			</figure>
		{/if}

		{#if hasLocation}
			<div>
				<FacilityMiniMap
					lat={location.lat}
					lng={location.lng}
					color={primaryFuelTechColor}
				/>
				<p class="text-xxs text-mid-grey mt-1.5 m-0 tabular-nums">
					{location.lat.toFixed(4)}, {location.lng.toFixed(4)}
				</p>
			</div>
		{/if}

		{#if paragraphs.length > 0}
			<div class="text-sm text-dark-grey leading-relaxed space-y-3">
				{#each paragraphs as text, i (i)}
					<p class="m-0">{text}</p>
				{/each}
			</div>
		{/if}
	{/if}
</div>
