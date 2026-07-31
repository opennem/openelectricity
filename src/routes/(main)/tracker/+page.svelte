<script>
	/**
	 * Tracker — map-first shell for the unified Tracker.
	 *
	 * The base map carries live NEM interconnector status: flow arcs (MW +
	 * direction from the 5-minutely grid-live poll), regional price chips, and
	 * a corridor panel (desktop left slide-in / mobile bottom sheet) that opens
	 * on load listing every corridor's latest metrics — picking one swaps to
	 * its Stratum flow + price charts and zooms the map to the corridor
	 * (deep-linked via `?ic=`), and Back restores the list + full view. Reuses
	 * the
	 * /facilities fullscreen system (FullscreenLayout + FullscreenFilterBar +
	 * FullscreenContainer) so the cross-route view transitions with /facilities
	 * and /facility/[code] line up. Reached via the `tracker_nav` feature flag
	 * (logo dropdown only) while in development.
	 */

	import { page } from '$app/state';
	import { building } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { MediaQuery } from 'svelte/reactivity';

	import { ChevronLeft, PanelLeftOpen, X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import {
		FullscreenLayout,
		FullscreenContainer,
		FullscreenFooter,
		FullscreenFilterBar,
		FullscreenNavDropdown
	} from '$lib/components/fullscreen';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import MapOptionsDropdown from '$lib/components/map/MapOptionsDropdown.svelte';
	import { MAP_FAB_CLASS } from '$lib/components/map/map-style.js';
	import { ResizablePanel } from '$lib/components/ui/resizable-panel';
	import BottomSheet from '$lib/components/ui/bottom-sheet/BottomSheet.svelte';
	import RegionDropdown from './RegionDropdown.svelte';
	import InterconnectorDetail from './InterconnectorDetail.svelte';
	import InterconnectorList from './InterconnectorList.svelte';
	import { createGridLive } from '$lib/flows/grid-live.svelte.js';
	import { getInterconnector, icSlug } from '$lib/flows/region-geo.js';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode
	} from '$lib/utils/fullscreen-mode.js';

	/** @type {{ data: { region: string, mapTheme: 'light' | 'dark' | 'satellite', showTransmissionLines: boolean, showFlows: boolean, interconnector: string | null } }} */
	let { data } = $props();

	let showShortcutsToast = $state(false);
	let mapLoaded = $state(false);

	// Fullscreen by default (the load returns `fullscreen: true`); an explicit
	// `?fullscreen=false` opts into windowed mode (F shortcut toggles) — desktop
	// only: below the tablet breakpoint the page is always fullscreen. `building`
	// guard: reading searchParams during prerender crashes the build.
	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	let isFullscreen = $derived(building ? true : belowTablet.current || isFullscreenUrl(page.url));

	function toggleFullscreen() {
		if (belowTablet.current) return;
		toggleFullscreenMode(isFullscreen);
	}

	// Page state persisted to the URL via shallow replaceState (no load re-run).
	let selectedRegion = $state(data.region);
	let mapTheme = $state(data.mapTheme);
	let showTransmissionLines = $state(data.showTransmissionLines);
	let showFlows = $state(data.showFlows);
	/** @type {string | null} */
	let selectedIc = $state(data.interconnector);
	// Re-sync on back/forward — $state doesn't re-init when the load re-runs.
	afterNavigate(() => {
		selectedRegion = data.region;
		mapTheme = data.mapTheme;
		showTransmissionLines = data.showTransmissionLines;
		showFlows = data.showFlows;
		selectedIc = data.interconnector;
	});

	// Live flows + prices for the map arcs, price chips and panel stat block —
	// polls /api/flows + /api/prices every dispatch-ish interval.
	const grid = createGridLive();
	$effect(() => {
		grid.start();
		return () => grid.stop();
	});

	// The panel opens on load showing every corridor's latest metrics; picking
	// one (list row or map arc) swaps it to that corridor's charts and zooms
	// the map, and Back returns to the list + full national view. Desktop can
	// collapse the panel entirely (FAB reopens it); the mobile sheet is
	// persistent, with a minimised snap instead of a dismissal.
	let panelOpen = $state(true);
	let detailTitle = $derived(getInterconnector(selectedIc)?.label ?? 'Interconnector');

	// Bounding box of the map container — the desktop panel sizes against its
	// width, the mobile sheet snaps against its height.
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	// Panel geometry, defined once: these constants feed both the panel/sheet
	// props and the corridor-zoom insets, so resizing tweaks can't silently
	// desync the map framing from the actual panel.
	const PANEL_FRACTION = 0.38;
	const PANEL_MIN_PX = 400;
	const PANEL_EDGE_PX = 16; // matches the panel's left-4 inset
	const SHEET_PEEK_FRACTION = 0.45;

	// Live panel size reported by ResizablePanel (percent of containerWidth) —
	// keeps the corridor-zoom framing truthful after a hand drag; 0 until the
	// panel first reports, when the default geometry stands in.
	let panelSizePct = $state(0);
	let panelInsetLeftPx = $derived.by(() => {
		if (belowTablet.current || !panelOpen) return 0;
		const widthPx =
			panelSizePct > 0
				? (panelSizePct / 100) * containerWidth
				: Math.max(PANEL_MIN_PX, containerWidth * PANEL_FRACTION);
		return widthPx + PANEL_EDGE_PX;
	});
	let panelInsetBottomPx = $derived(
		belowTablet.current ? containerHeight * SHEET_PEEK_FRACTION : 0
	);

	// Defaults are omitted so the URL stays clean; the load's fallbacks restore
	// them. Build from window.location, not page.url — page.url goes stale after
	// a shallow replaceState. This also leaves `?fullscreen=false` untouched.
	function updateUrl() {
		const url = new URL(window.location.href);
		if (selectedRegion === '_all') url.searchParams.delete('region');
		else url.searchParams.set('region', selectedRegion);
		if (mapTheme === 'dark') url.searchParams.delete('theme');
		else url.searchParams.set('theme', mapTheme);
		if (showTransmissionLines) url.searchParams.delete('transmission');
		else url.searchParams.set('transmission', 'false');
		if (showFlows) url.searchParams.delete('flows');
		else url.searchParams.set('flows', 'false');
		if (selectedIc) url.searchParams.set('ic', icSlug(selectedIc));
		else url.searchParams.delete('ic');
		replaceState(`${url.pathname}${url.search}`, {});
	}

	/** @param {string} value */
	function handleRegionChange(value) {
		selectedRegion = value;
		updateUrl();
	}

	/** @param {string} key */
	function handleSelectInterconnector(key) {
		selectedIc = key;
		panelOpen = true;
		updateUrl();
	}

	/** Back to the corridor list + the full national map view. */
	function backToList() {
		selectedIc = null;
		updateUrl();
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
			} else if (selectedIc) {
				e.preventDefault();
				backToList();
			}
			return;
		}

		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.key === '?') {
			showShortcutsToast = !showShortcutsToast;
			return;
		}

		if (e.key === 'f' || e.key === 'F') {
			if (e.shiftKey) return;
			e.preventDefault();
			toggleFullscreen();
			showShortcutsToast = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta title="Tracker" description="Track Australia's electricity system on a map." />

<FullscreenLayout {isFullscreen}>
	{#snippet filterBar()}
		<!-- Unlike /facilities there is no separate mobile floating nav — the bar
		     is short enough to keep on all breakpoints. -->
		<div class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen ? '' : 'px-4'}">
			<FullscreenFilterBar
				{isFullscreen}
				routeKey="tracker"
				stableName="filter-bar-stable-tracker"
				paddingX="px-8"
				bgClass="bg-light-warm-grey/75"
			>
				{#snippet stable()}
					{#if isFullscreen}
						<FullscreenNavDropdown />
						<a
							href="/tracker"
							class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline text-sm lg:text-base px-2 py-1"
						>
							Tracker
						</a>
					{/if}
				{/snippet}

				{#snippet rest()}
					{#if isFullscreen}
						<div class="h-8 border-l border-warm-grey shrink-0"></div>
					{/if}

					<div class={isFullscreen ? 'pl-3' : ''}>
						<RegionDropdown
							selected={selectedRegion}
							compact={isFullscreen}
							onchange={handleRegionChange}
						/>
					</div>
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={toggleFullscreen}
						onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
						showCopyLink
					/>
				{/snippet}
			</FullscreenFilterBar>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<div
				class="flex-1 min-h-0 relative overflow-hidden"
				bind:clientWidth={containerWidth}
				bind:clientHeight={containerHeight}
			>
				{#if !mapLoaded}
					<div
						class="absolute inset-0 z-10 flex items-center justify-center {mapTheme === 'light'
							? 'bg-[#D5D8DC]/50'
							: 'bg-[#16181d]/60'}"
					>
						<LogoMarkLoader />
					</div>
				{/if}
				{#await import('./Map.svelte') then { default: TrackerMap }}
					<TrackerMap
						{mapTheme}
						{showTransmissionLines}
						{showFlows}
						flows={grid.flows}
						prices={grid.prices}
						{selectedRegion}
						selectedInterconnector={selectedIc}
						{panelInsetLeftPx}
						{panelInsetBottomPx}
						onselectinterconnector={handleSelectInterconnector}
						cooperativeGestures={!isFullscreen}
						onload={() => setTimeout(() => (mapLoaded = true), 250)}
					/>
				{/await}

				<!-- Map display options — theme, transmission lines and flow arcs.
				     right-20 clears the NavigationControl in the top-right corner;
				     top-5 centres the 44px button on the zoom stack beside it. -->
				<div class="absolute top-5 right-20 z-20">
					<MapOptionsDropdown
						{mapTheme}
						{showTransmissionLines}
						{showFlows}
						showFlowsOption
						showGolfOption={false}
						showClusteringOption={false}
						showLegendOption={false}
						onmapthemechange={(v) => {
							mapTheme = v;
							updateUrl();
						}}
						ontransmissionlineschange={(v) => {
							showTransmissionLines = v;
							updateUrl();
						}}
						onflowschange={(v) => {
							showFlows = v;
							updateUrl();
						}}
					/>
				</div>

				<!-- Interconnector panel — open on load with every corridor's latest
				     metrics; a row (or arc) click swaps to that corridor's charts and
				     zooms the map, Back restores the list + full view. Desktop: left
				     slide-in panel over the map (grip on its right edge, collapsible
				     via the FAB); mobile: persistent bottom sheet. -->
				{#if !belowTablet.current}
					<ResizablePanel
						open={panelOpen}
						onclose={() => (panelOpen = false)}
						direction="right"
						defaultSize={PANEL_FRACTION * 100}
						minSize={PANEL_MIN_PX}
						containerSize={containerWidth}
						onresize={(pct) => (panelSizePct = pct)}
						closedOffset="1rem"
						class="hidden tablet:flex absolute top-4 bottom-4 left-4 max-w-[calc(100%_-_2rem)] bg-white rounded-lg border border-mid-warm-grey shadow-lg z-20"
					>
						{#snippet header()}
							{@render panelHeader(false)}
						{/snippet}
						{@render panelBody()}
					</ResizablePanel>

					{#if !panelOpen}
						<div class="absolute top-5 left-5 z-20">
							<button
								onclick={() => (panelOpen = true)}
								class="size-11 {MAP_FAB_CLASS}"
								title="Show interconnectors"
							>
								<PanelLeftOpen class="size-6" />
							</button>
						</div>
					{/if}
				{:else}
					<BottomSheet
						open={true}
						dismissable={false}
						{containerHeight}
						peekFraction={SHEET_PEEK_FRACTION}
						minHeight={96}
						class="tablet:hidden z-30"
					>
						{#snippet header()}
							{@render panelHeader(true)}
						{/snippet}
						{@render panelBody()}
					</BottomSheet>
				{/if}
			</div>

			{#snippet footer()}
				<FullscreenFooter {isFullscreen} onenterfullscreen={toggleFullscreen} />
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>

<!-- Shared panel content for the desktop ResizablePanel and mobile BottomSheet:
     corridor list by default, the selected corridor's charts behind a Back
     button. The sheet's header omits the top padding/border (its drag grip
     supplies the top chrome) and never shows the desktop collapse button. -->
{#snippet panelHeader(/** @type {boolean} */ isSheet)}
	<header
		class="flex shrink-0 items-center gap-1 {isSheet
			? 'px-3 pb-2'
			: 'border-b border-warm-grey px-3 pt-3 pb-3'}"
	>
		{#if selectedIc}
			<button
				type="button"
				onclick={backToList}
				class="shrink-0 cursor-pointer rounded-lg p-1.5 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey"
				aria-label="Back to all interconnectors"
			>
				<ChevronLeft size={20} />
			</button>
			<h2 class="m-0 min-w-0 truncate text-base font-medium text-dark-grey">{detailTitle}</h2>
		{:else}
			<h2 class="m-0 min-w-0 flex-1 truncate px-1 text-base font-medium text-dark-grey">
				Interconnectors
			</h2>
			{#if !isSheet}
				<button
					type="button"
					onclick={() => (panelOpen = false)}
					class="shrink-0 cursor-pointer rounded-lg p-1.5 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey"
					aria-label="Hide panel"
				>
					<X size={18} />
				</button>
			{/if}
		{/if}
	</header>
{/snippet}

{#snippet panelBody()}
	{#if selectedIc}
		<InterconnectorDetail
			interconnectorKey={selectedIc}
			flows={grid.flows}
			prices={grid.prices}
			dispatchDateTimeString={grid.dispatchDateTimeString}
		/>
	{:else}
		<InterconnectorList
			flows={grid.flows}
			dispatchDateTimeString={grid.dispatchDateTimeString}
			onselect={handleSelectInterconnector}
		/>
	{/if}
{/snippet}

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Toggle navigation menu', keys: ['G'] },
		...(belowTablet.current ? [] : [{ label: 'Enter / exit full screen', keys: ['F'] }]),
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
