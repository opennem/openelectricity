<script>
	import { FileText } from '@lucide/svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';
	import { hasPortableTextContent } from '$lib/utils/portable-text.js';

	/**
	 * @type {{
	 *   sanityFacility: any | null,
	 *   facility?: any | null
	 * }}
	 */
	let { sanityFacility, facility = null } = $props();

	let description = $derived(sanityFacility?.description ?? []);
	let hasDescription = $derived(hasPortableTextContent(description));
	let photos = $derived(sanityFacility?.photos ?? []);

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

	const MAX_HEIGHT = 160;

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

</script>

<div class="space-y-10">
	<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
		<div class="px-6 py-3 border-b border-mid-warm-grey/40">
			<h3 class="text-sm font-semibold text-dark-grey m-0">About</h3>
		</div>
		{#if hasDescription}
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
		{:else}
			<div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
				<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
					<FileText size={24} strokeWidth={1.5} />
				</div>
				<p class="text-sm font-medium text-dark-grey m-0">No description available</p>
			</div>
		{/if}
	</div>

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
</div>
