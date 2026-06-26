<script>
	import { FileText, ImageOff } from '@lucide/svelte';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';
	import { hasPortableTextContent } from '$lib/utils/portable-text.js';
	import FacilityUnitCards from './FacilityUnitCards.svelte';

	/**
	 * Facility preview shown when a facility is selected on the /facilities page.
	 * Mirrors the editorial content of the dedicated /facility/[code] page so
	 * navigating there morphs naturally. Two columns on desktop — photo +
	 * description on the left, the unit cards (same design as the detail page) on
	 * the right; stacked on mobile. The units render instantly from the facility
	 * object; only photos + description wait on the streamed profile.
	 *
	 * @type {{
	 *   facility: any | null,
	 *   profile?: any | null,
	 *   profileLoading?: boolean,
	 *   fillHeight?: boolean
	 * }}
	 */
	let { facility = null, profile = null, profileLoading = false, fillHeight = false } = $props();

	let photos = $derived(profile?.photos ?? []);
	let description = $derived(profile?.description ?? []);
	let hasDescription = $derived(hasPortableTextContent(description));

	/** Whether the streamed profile is still in flight (no cached value yet). */
	let loading = $derived(profileLoading && !profile);
</script>

{#if facility}
	<div class={fillHeight ? 'h-full min-h-0 overflow-y-auto' : ''}>
		<div class="grid grid-cols-1 gap-8 p-8 md:grid-cols-[2fr_1fr] md:gap-8">
			<!-- Left: photo + description (2/3) · Right: units (1/3) -->
			<div class="min-w-0 space-y-6">
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

				<section class="m-4">
					<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">About</h3>
					{#if loading}
						<div class="space-y-2">
							<div class="h-3 w-full animate-pulse rounded bg-light-warm-grey/60"></div>
							<div class="h-3 w-11/12 animate-pulse rounded bg-light-warm-grey/60"></div>
							<div class="h-3 w-3/4 animate-pulse rounded bg-light-warm-grey/60"></div>
						</div>
					{:else if hasDescription}
						<PortableTextBody value={description} class="text-sm leading-relaxed text-dark-grey/80" />
					{:else}
						<div class="flex items-center gap-2.5 text-mid-grey">
							<FileText size={16} strokeWidth={1.5} />
							<p class="m-0 text-sm">No description available</p>
						</div>
					{/if}
				</section>
			</div>

			<!-- Right: units — same card design as /facility/[code]. -->
			<section class="min-w-0">
				<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">Units</h3>
				<FacilityUnitCards {facility} singleColumn />
			</section>
		</div>
	</div>
{/if}
