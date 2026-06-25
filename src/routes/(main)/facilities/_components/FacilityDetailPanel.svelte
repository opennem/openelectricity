<script>
	import { FileText, ImageOff } from '@lucide/svelte';
	import PhotoCarousel from '$lib/components/PhotoCarousel.svelte';
	import PortableTextBody from '$lib/components/PortableTextBody.svelte';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';
	import { hasPortableTextContent } from '$lib/utils/portable-text.js';
	import { groupUnits } from '../_utils/units';
	import formatValue from '../_utils/format-value';

	/**
	 * Lightweight facility preview shown when a facility is selected on the
	 * /facilities page. Mirrors the editorial content of the dedicated
	 * /facility/[code] page (photos, description, units) so navigating there
	 * morphs naturally — but stays a teaser: the charts/market/emissions live on
	 * the full page. The OE-derived units summary renders instantly from the
	 * facility object; only photos + description wait on the streamed profile.
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

	// Fuel-tech groups, top-of-stack first (matches the header + chart paint order).
	let unitGroups = $derived(
		sortByDetailedOrder(groupUnits(facility, { skipBattery: true }), { reverse: true })
	);

	// About read-more — collapse long descriptions behind a fade.
	const MAX_HEIGHT = 200;
	let expanded = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let descriptionEl = $state(undefined);
	let needsExpand = $state(false);

	// Measure (post-layout) whether the description overflows the collapsed
	// height, and reset the collapsed view for each new description. Tracks
	// `description` so it re-runs on selection; toggling `expanded` doesn't.
	$effect(() => {
		const node = descriptionEl;
		const _desc = description;
		expanded = false;
		if (!node) {
			needsExpand = false;
			return;
		}
		requestAnimationFrame(() => {
			needsExpand = node.scrollHeight > MAX_HEIGHT;
		});
	});
</script>

{#if facility}
	<div class={fillHeight ? 'h-full min-h-0 overflow-y-auto' : ''}>
		<div class="space-y-6 p-4">
			<!-- Photos — the visual hero of the preview. -->
			{#if loading}
				<div class="h-52 animate-pulse rounded-lg bg-light-warm-grey/60"></div>
			{:else if photos.length > 0}
				<div class="h-52">
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

			<!-- About -->
			<section>
				<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">About</h3>
				{#if loading}
					<div class="space-y-2">
						<div class="h-3 w-full animate-pulse rounded bg-light-warm-grey/60"></div>
						<div class="h-3 w-11/12 animate-pulse rounded bg-light-warm-grey/60"></div>
						<div class="h-3 w-3/4 animate-pulse rounded bg-light-warm-grey/60"></div>
					</div>
				{:else if hasDescription}
					<div
						class="relative overflow-hidden"
						style:max-height={!expanded ? `${MAX_HEIGHT}px` : 'none'}
					>
						<div bind:this={descriptionEl}>
							<PortableTextBody value={description} class="text-sm leading-relaxed text-dark-grey/80" />
						</div>
						{#if needsExpand && !expanded}
							<div
								class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent"
							></div>
						{/if}
					</div>
					{#if needsExpand}
						<button
							class="mt-1.5 cursor-pointer text-xs text-mid-grey/70 transition-colors hover:text-mid-grey"
							onclick={() => (expanded = !expanded)}
						>
							{expanded ? 'Show less' : 'Read more'}
						</button>
					{/if}
				{:else}
					<div class="flex items-center gap-2.5 text-mid-grey">
						<FileText size={16} strokeWidth={1.5} />
						<p class="m-0 text-sm">No description available</p>
					</div>
				{/if}
			</section>

			<!-- Units summary — instant from OE data; full table lives on the detail page. -->
			{#if unitGroups.length}
				<section>
					<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">Units</h3>
					<ul class="m-0 list-none divide-y divide-mid-warm-grey/30 p-0">
						{#each unitGroups as group (group.fueltech_id + group.status_id)}
							<li class="flex items-center gap-3 py-2">
								<FuelTechBadge fuelTech={group.fueltech_id} iconOnly iconSize={16} />
								<div class="min-w-0 flex-1">
									<div class="truncate text-xs font-medium text-dark-grey">
										{fuelTechName(/** @type {FuelTechCode} */ (group.fueltech_id))}
									</div>
									<div class="text-[11px] text-mid-grey">
										{group.units.length}
										{group.units.length === 1 ? 'unit' : 'units'}
									</div>
								</div>
								<FacilityStatusIcon
									status={group.status_id}
									isCommissioning={group.isCommissioning}
								/>
								<div class="w-20 text-right">
									<span class="font-mono text-xs font-medium text-dark-grey"
										>{formatValue(group.totalCapacity)}</span
									>
									<span class="text-[11px] text-mid-grey"> MW</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</div>
{/if}
