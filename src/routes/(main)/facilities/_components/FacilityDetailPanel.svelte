<script>
	import { FileText, ImageOff } from '@lucide/svelte';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import ExpandableDescription from '$lib/components/ExpandableDescription.svelte';
	import { hasPortableTextContent } from '$lib/utils/portable-text.js';
	import FacilityUnitCards from './FacilityUnitCards.svelte';
	import { FacilityCompactCharts, getNetworkTimezone } from '$lib/components/charts/facility';

	/**
	 * Facility preview shown when a facility is selected on the /facilities page.
	 * Mirrors the dedicated /facility/[code] page layout so navigating there morphs
	 * naturally: the compact generation/price charts (the same block as the unit
	 * detail sheet, with range picker and CSV downloads) fill the wider left
	 * column, with the description, photos and unit cards stacked in the right
	 * column (stacked on mobile). The units render instantly from the facility
	 * object; only the photos + description wait on the streamed profile.
	 *
	 * @type {{
	 *   facility: any | null,
	 *   profile?: any | null,
	 *   profileLoading?: boolean,
	 *   fillHeight?: boolean
	 * }}
	 */
	let { facility = null, profile = null, profileLoading = false, fillHeight = false } = $props();

	let timeZone = $derived(getNetworkTimezone(facility?.network_id));

	let photos = $derived(profile?.photos ?? []);
	let description = $derived(profile?.description ?? []);
	let hasDescription = $derived(hasPortableTextContent(description));

	/** Whether the streamed profile is still in flight (no cached value yet). */
	let loading = $derived(profileLoading && !profile);
</script>

{#if facility}
	<div class={fillHeight ? 'h-full min-h-0 overflow-y-auto' : ''}>
		<div class="grid grid-cols-1 gap-8 p-8 tablet:grid-cols-[2fr_1fr] tablet:gap-8">
			<!-- Left: compact Generation + Price charts — the same interactive block as
			     the unit detail sheet, with its own range presets, date picker and
			     options menu. Keyed on the facility so range + load state reset. -->
			<div class="min-w-0">
				{#key facility.code}
					<FacilityCompactCharts {facility} {timeZone} />
				{/key}
			</div>

			<!-- Right: description, photos, then units (mirrors /facility/[code]). -->
			<div class="min-w-0 space-y-6">
				<section>
					<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
						About
					</h3>
					{#if loading}
						<div class="space-y-2">
							<div class="h-3 w-full animate-pulse rounded bg-light-warm-grey/60"></div>
							<div class="h-3 w-11/12 animate-pulse rounded bg-light-warm-grey/60"></div>
							<div class="h-3 w-3/4 animate-pulse rounded bg-light-warm-grey/60"></div>
						</div>
					{:else if hasDescription}
						{#key facility.code}
							<ExpandableDescription value={description} />
						{/key}
					{:else}
						<div class="flex items-center gap-2.5 text-mid-grey">
							<FileText size={16} strokeWidth={1.5} />
							<p class="m-0 text-sm">No description available</p>
						</div>
					{/if}
				</section>

				{#if loading}
					<div class="h-72 animate-pulse rounded-lg bg-light-warm-grey/60"></div>
				{:else if photos.length > 0}
					<div class="h-72">
						<PhotoCarousel {photos} fill class="h-full" />
					</div>
				{:else}
					<div
						class="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-mid-warm-grey/50 bg-light-warm-grey/30 text-mid-grey"
					>
						<ImageOff size={20} strokeWidth={1.5} />
						<p class="m-0 text-xs">No photos yet</p>
					</div>
				{/if}

				<section class="min-w-0">
					<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
						Units
					</h3>
					<FacilityUnitCards {facility} singleColumn />
				</section>
			</div>
		</div>
	</div>
{/if}
