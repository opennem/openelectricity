<script>
	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import List from '../List.svelte';
	import Grid from '../Grid.svelte';
	import Timeline from '../Timeline.svelte';
	import SortDropdown from './SortDropdown.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import formatValue from '../_utils/format-value';
	import { sortFacilities } from '../_utils/sort-facilities';
	import { VIEW_OPTIONS } from '../_utils/filters.js';
	import { createLocalStorageState } from '$lib/utils/local-storage-state.svelte.js';

	/**
	 * Mobile facilities browser — a persistent bottom sheet peeking over the
	 * full-bleed map. Pulling it down minimises it to just the count summary;
	 * the peek adds the sort control and the first rows; pulling it up to full
	 * reveals the view toggle. The body renders the same List/Timeline/Grid
	 * views the desktop left pane does. (Search lives in the floating nav bar.)
	 *
	 * @type {{
	 *   open: boolean,
	 *   containerHeight: number,
	 *   facilities: any[],
	 *   facilitiesWithLocation: any[],
	 *   facilityPhotos?: Record<string, string>,
	 *   selectedView: 'list' | 'timeline' | 'grid',
	 *   viewLoading?: boolean,
	 *   sortBy: 'name' | 'region' | 'storage' | 'capacity',
	 *   sortOrder: 'asc' | 'desc',
	 *   totalFacilitiesCount: number,
	 *   totalUnitsCount: number,
	 *   totalCapacityMW: number,
	 *   onviewchange?: (view: 'list' | 'timeline' | 'grid') => void,
	 *   onsortchange?: (sortBy: 'name' | 'region' | 'storage' | 'capacity', sortOrder: 'asc' | 'desc') => void,
	 *   onselect?: (facility: any) => void
	 * }}
	 */
	let {
		open,
		containerHeight,
		facilities = [],
		facilitiesWithLocation = [],
		facilityPhotos = {},
		selectedView,
		// True while the page defers the heavy view mount by a painted frame
		// (see +page.svelte) — the body shows a loader so the switcher above
		// responds instantly.
		viewLoading = false,
		sortBy,
		sortOrder,
		totalFacilitiesCount,
		totalUnitsCount,
		totalCapacityMW,
		onviewchange,
		onsortchange,
		onselect
	} = $props();

	// Minimised height: grip + the summary line (sort control hidden), so
	// pulling the sheet all the way down leaves just the totals visible.
	const MIN_HEIGHT = 84;

	// The List sorts itself; the Grid renders facilities as given, so apply the
	// sheet's sort here to make the sort control work for both.
	let sortedFacilities = $derived(sortFacilities(facilities, sortBy, sortOrder, null));

	// Remember how far the user pulled the sheet, so returning from a facility
	// detail (or a later visit) restores the same view.
	const sheetSnap = createLocalStorageState(
		'facilities-sheet-snap',
		/** @type {'min' | 'peek' | 'full'} */ ('peek'),
		(v) => v === 'min' || v === 'peek' || v === 'full'
	);
	/** @type {HTMLElement | null} */
	let bodyEl = $state(null);

	let hasScrolledToToday = $state(false);
</script>

<!-- fullFraction stays below the default 0.94 so the expanded sheet clears
     the floating nav bar (top-3 + ~52px controls) even on Safari, where the
     dynamic toolbar squeezes the visual viewport. -->
<BottomSheet
	{open}
	{containerHeight}
	dismissable={false}
	peekFraction={0.35}
	fullFraction={0.85}
	minHeight={MIN_HEIGHT}
	bind:snap={sheetSnap.value}
	defaultSnap={sheetSnap.value}
	bind:bodyEl
	class="md:hidden z-20"
>
	{#snippet header()}
		<div
			class="px-4 pb-3 flex flex-col gap-3 {sheetSnap.value === 'min'
				? ''
				: 'border-b border-warm-grey'}"
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<div class="text-lg font-semibold text-dark-grey leading-tight">
						{totalFacilitiesCount.toLocaleString()} facilities
					</div>
					<div class="text-xs text-mid-grey font-space mt-0.5">
						{formatValue(totalCapacityMW)} MW · {totalUnitsCount.toLocaleString()} units
					</div>
				</div>
				{#if sheetSnap.value !== 'min' && selectedView !== 'timeline'}
					<SortDropdown
						{sortBy}
						{sortOrder}
						onsortchange={(by, order) => onsortchange?.(by, order)}
					/>
				{/if}
			</div>

			<!-- View toggle, revealed at the full snap (search lives in the nav bar) -->
			{#if sheetSnap.value === 'full'}
				<SwitchWithIcons
					buttons={VIEW_OPTIONS}
					selected={selectedView}
					compact
					rounded="rounded-lg"
					darkSelected
					onchange={(option) =>
						onviewchange?.(/** @type {'list' | 'timeline' | 'grid'} */ (option.value))}
				/>
			{/if}
		</div>
	{/snippet}

	{#if viewLoading}
		<div class="flex items-center justify-center py-16">
			<LogoMarkLoader />
		</div>
	{:else if selectedView === 'grid'}
		<Grid
			facilities={sortedFacilities}
			{facilityPhotos}
			onclick={(/** @type {any} */ f) => onselect?.(f)}
		/>
	{:else if selectedView === 'timeline'}
		<div class="p-4">
			<Timeline
				facilities={facilitiesWithLocation}
				isFullscreen
				scrollContainer={bodyEl}
				scrollToToday={!hasScrolledToToday}
				onscrolledtotoday={() => (hasScrolledToToday = true)}
				onclick={(/** @type {any} */ f) => onselect?.(f)}
			/>
		</div>
	{:else}
		<List
			{facilities}
			{sortBy}
			{sortOrder}
			isFullscreen
			dense
			onclick={(/** @type {any} */ f) => onselect?.(f)}
		/>
	{/if}
</BottomSheet>
