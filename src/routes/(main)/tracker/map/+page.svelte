<script>
	/**
	 * Tracker — map-first shell for the unified Tracker.
	 *
	 * The base map carries live NEM interconnector status: flow arcs (MW +
	 * direction from the 5-minutely grid-live poll), regional price chips, and
	 * two display modes toggled by `?view=`: the map view (desktop default) of
	 * on-anchor mini charts per region plus a docked All-Australia card
	 * (`?chart=` picks their metric), or `?view=panel` for the side panel
	 * (desktop left slide-in / mobile bottom sheet; the default below tablet).
	 * The panel's content is selection-driven off the existing URL state:
	 *   `?ic=` set        → that corridor's Stratum flow + price charts
	 *   region `_all`/wem → grid generation (whole NEM / WEM)
	 *   any other region  → that region's generation
	 * The generation views carry the explore-style stacked fuel-tech chart,
	 * price chart and a metrics grid (GenerationPanel), with the scope's
	 * corridor flow charts inline beneath — picking one (card header or map
	 * arc) swaps to the corridor view. The map flies with the selection:
	 * corridor fitBounds, else the dropdown region's framing (incl. WEM), else
	 * the national default; Back/Esc restores the generation view. Reuses the
	 * /facilities fullscreen system
	 * (FullscreenLayout + FullscreenFilterBar + FullscreenContainer) so the
	 * cross-route view transitions with /facilities and /facility/[code] line
	 * up. Reached via the `tracker_nav` feature flag (logo dropdown only) while
	 * in development.
	 */

	import { page } from '$app/state';
	import { building } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';

	import { ChevronLeft, LoaderCircle, PanelLeftOpen, X } from '@lucide/svelte';
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
	import MapKey from '$lib/components/map/MapKey.svelte';
	import { allBandsVisible } from '$lib/facilities/transmission-bands.js';
	import { MAP_CHIP_CLASS, MAP_FAB_CLASS } from '$lib/components/map/map-style.js';
	import { ResizablePanel } from '$lib/components/ui/resizable-panel';
	import BottomSheet from '$lib/components/ui/bottom-sheet/BottomSheet.svelte';
	import { fade } from 'svelte/transition';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import RegionDropdown from '../RegionDropdown.svelte';
	import InterconnectorDetail from '../InterconnectorDetail.svelte';
	import GenerationPanel from '../GenerationPanel.svelte';
	import { createMapCharts } from '../map-charts.svelte.js';
	import { DEFAULT_MINI_METRIC, MINI_METRIC_OPTIONS, latestStackedTotal } from '../map-minis.js';
	import RegionMiniChart from '../RegionMiniChart.svelte';
	import { formatTooltipDateTime } from '$lib/components/charts/v2/formatters.js';
	import { formatSI } from '$lib/utils/si-units.js';
	import { createGridLive } from '$lib/flows/grid-live.svelte.js';
	import { getInterconnector, icSlug } from '$lib/flows/region-geo.js';
	import { DEFAULT_REGION, TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode
	} from '$lib/utils/fullscreen-mode.js';

	/** @type {{ data: { nowMs: number, region: string, view: 'panel' | 'map', viewExplicit: boolean, mapChart: 'power' | 'price' | 'emissions', mapTheme: 'light' | 'dark' | 'satellite', showTransmissionLines: boolean, showFlows: boolean, showLegend: boolean, interconnector: string | null } }} */
	let { data } = $props();
	const initialData = untrack(() => structuredClone(data));

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
	let selectedRegion = $state(initialData.region);
	let mapTheme = $state(initialData.mapTheme);
	let showTransmissionLines = $state(initialData.showTransmissionLines);
	let showFlows = $state(initialData.showFlows);
	let showLegend = $state(initialData.showLegend);
	// The map view is the desktop default, but below tablet it has no
	// panel/sheet and the marker cards overwhelm a phone frame — an
	// unqualified URL falls back to the panel there. An explicit ?view=
	// always wins.
	const effectiveView = () => (data.viewExplicit || !belowTablet.current ? data.view : 'panel');
	/** @type {'panel' | 'map'} */
	// The server cannot know the viewport width. Keep the first browser render
	// identical to SSR, then apply the mobile-only default after hydration.
	let viewMode = $state(initialData.view);
	onMount(() => {
		if (!initialData.viewExplicit && belowTablet.current) viewMode = 'panel';
	});
	/** @type {'power' | 'price' | 'emissions'} */
	let mapChartMetric = $state(initialData.mapChart);
	/** @type {string | null} */
	let selectedIc = $state(initialData.interconnector);
	// Re-sync on back/forward — $state doesn't re-init when the load re-runs.
	afterNavigate(({ to }) => {
		// The shared main layout can keep this page alive briefly during a view
		// transition. Do not hydrate its local state from the destination page's
		// data when leaving for the /tracker review index (or another route).
		if (to?.url.pathname !== '/tracker/map') return;
		if (!TRACKER_REGION_OPTIONS.some((option) => option.value === data.region)) return;
		selectedRegion = data.region;
		mapTheme = data.mapTheme;
		showTransmissionLines = data.showTransmissionLines;
		showFlows = data.showFlows;
		showLegend = data.showLegend;
		viewMode = effectiveView();
		mapChartMetric = data.mapChart;
		selectedIc = data.interconnector;
	});

	let bandVisibility = $state(allBandsVisible());

	// Live flows + prices for the map arcs, price chips and panel stat block —
	// polls /api/flows + /api/prices every dispatch-ish interval.
	const grid = createGridLive();
	$effect(() => {
		grid.start();
		return () => grid.stop();
	});

	// Map-view mini charts: refetched when the view/metric changes and on every
	// dispatch tick (the same signal that refreshes the arcs/prices).
	const mapCharts = createMapCharts();
	$effect(() => {
		const metric = mapChartMetric;
		const tick = grid.dispatchDateTimeString;
		if (viewMode !== 'map') return;
		mapCharts.load(metric, tick);
	});

	// The mini charts share one rolling window — annotate its range once at the
	// map's bottom centre (NEM time; the WA card covers the same absolute
	// span). Formatted through the chart date-label policy so the month
	// spelling matches every other chart surface.
	let mapChartsRange = $derived.by(() => {
		if (viewMode !== 'map') return '';
		for (const processed of Object.values(mapCharts.charts)) {
			const rows = processed?.data;
			if (rows?.length) {
				const start = formatTooltipDateTime(new Date(rows[0].time), 'Australia/Brisbane', '30m');
				const end = formatTooltipDateTime(
					new Date(rows[rows.length - 1].time),
					'Australia/Brisbane',
					'30m'
				);
				return `${start} – ${end} AEST`;
			}
		}
		return '';
	});

	// Latest stacked total for the All-Australia card header (MW → GW for
	// power; emissions stay in tonnes).
	let auLatestTotal = $derived.by(() => {
		const total = latestStackedTotal(mapCharts.charts.AU);
		if (total === null) return '';
		return mapChartMetric === 'power'
			? formatSI(total, { fromPrefix: 'M', toPrefix: 'G', baseUnit: 'W', maximumFractionDigits: 1 })
			: formatSI(total, { baseUnit: 't', maximumFractionDigits: 0 });
	});

	// The panel opens on load showing the selected scope's generation view;
	// picking a corridor (list row or map arc) swaps it to that corridor's
	// charts and zooms the map, and Back returns to the generation view + full
	// national frame. Desktop can collapse the panel entirely (FAB reopens it);
	// the mobile sheet is persistent, with a minimised snap instead of a
	// dismissal.
	let panelOpen = $state(true);
	let detailTitle = $derived(getInterconnector(selectedIc)?.label ?? 'Interconnector');
	let regionTitle = $derived.by(() => {
		const opt = TRACKER_REGION_OPTIONS.find((r) => r.value === selectedRegion);
		if (!opt) return 'All Regions';
		// The dropdown's "NEM Regions" reads oddly as a panel heading.
		return opt.shortLabel === 'NEM' ? 'National Electricity Market' : opt.label;
	});

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

	// The panel/sheet renders in the panel view, and in the map view only while
	// a corridor is open (the corridor detail overlays either view; Back/Esc
	// returns to the on-map charts).
	let showPanel = $derived(viewMode === 'panel' || selectedIc !== null);

	let panelInsetLeftPx = $derived.by(() => {
		if (belowTablet.current || !panelOpen || !showPanel) return 0;
		const widthPx =
			panelSizePct > 0
				? (panelSizePct / 100) * containerWidth
				: Math.max(PANEL_MIN_PX, containerWidth * PANEL_FRACTION);
		return widthPx + PANEL_EDGE_PX;
	});
	let panelInsetBottomPx = $derived(
		belowTablet.current && showPanel ? containerHeight * SHEET_PEEK_FRACTION : 0
	);

	// Defaults are omitted so the URL stays clean; the load's fallbacks restore
	// them. Build from window.location, not page.url — page.url goes stale after
	// a shallow replaceState. This also leaves `?fullscreen=false` untouched.
	function updateUrl() {
		const url = new URL(window.location.href);
		// All Regions ('au') is the omitted default; every other scope —
		// including the NEM-wide '_all' — serialises explicitly.
		if (selectedRegion === DEFAULT_REGION) url.searchParams.delete('region');
		else url.searchParams.set('region', selectedRegion);
		if (mapTheme === 'dark') url.searchParams.delete('theme');
		else url.searchParams.set('theme', mapTheme);
		if (showTransmissionLines) url.searchParams.set('transmission', 'true');
		else url.searchParams.delete('transmission');
		if (showFlows) url.searchParams.delete('flows');
		else url.searchParams.set('flows', 'false');
		if (showLegend) url.searchParams.set('legend', 'true');
		else url.searchParams.delete('legend');
		// Map is the omitted default — a mobile user who explicitly taps "Map"
		// therefore gets a clean URL, so a reload falls back to the mobile panel
		// default. Accepted: the safe view wins on an ambiguous phone URL.
		if (viewMode === 'panel') url.searchParams.set('view', 'panel');
		else url.searchParams.delete('view');
		if (mapChartMetric !== DEFAULT_MINI_METRIC) url.searchParams.set('chart', mapChartMetric);
		else url.searchParams.delete('chart');
		if (selectedIc) url.searchParams.set('ic', icSlug(selectedIc));
		else url.searchParams.delete('ic');
		replaceState(`${url.pathname}${url.search}`, {});
	}

	/** @param {string} value */
	function handleViewChange(value) {
		viewMode = /** @type {'panel' | 'map'} */ (value);
		updateUrl();
	}

	/** @param {string} value */
	function handleMapChartChange(value) {
		mapChartMetric = /** @type {'power' | 'price' | 'emissions'} */ (value);
		updateUrl();
	}

	/** @param {string} value */
	function handleRegionChange(value) {
		selectedRegion = value;
		// A region pick is an explicit view switch — leave any open corridor so
		// the panel shows the picked scope's generation view, not an unrelated
		// corridor under a region title.
		selectedIc = null;
		updateUrl();
	}

	/** @param {string} key */
	function handleSelectInterconnector(key) {
		selectedIc = key;
		panelOpen = true;
		updateUrl();
	}

	/** Back to the scope's generation view + the full national map frame. */
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

<Meta title="Map tracker" description="Track Australia's electricity system on a map." />

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
							href="/tracker/map"
							class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline text-sm lg:text-base px-2 py-1"
						>
							Map tracker
						</a>
					{/if}
				{/snippet}

				{#snippet rest()}
					{#if isFullscreen}
						<div class="h-8 border-l border-warm-grey shrink-0"></div>
					{/if}

					<div class="flex items-center gap-3 {isFullscreen ? 'pl-3' : ''}">
						<RegionDropdown
							selected={selectedRegion}
							compact={isFullscreen}
							onchange={handleRegionChange}
						/>

						<!-- Panel ⇄ on-map charts, plus the map charts' metric. -->
						<SwitchTabs
							buttons={[
								{ label: 'Panel', value: 'panel' },
								{ label: 'Map', value: 'map' }
							]}
							selected={viewMode}
							onChange={handleViewChange}
						/>
						{#if viewMode === 'map'}
							<SwitchTabs
								buttons={[...MINI_METRIC_OPTIONS]}
								selected={mapChartMetric}
								onChange={handleMapChartChange}
							/>
						{/if}
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
				{#await import('../Map.svelte') then { default: TrackerMap }}
					<TrackerMap
						{mapTheme}
						{showTransmissionLines}
						transmissionLineVisibility={bandVisibility}
						{showFlows}
						flows={grid.flows}
						prices={grid.prices}
						{selectedRegion}
						selectedInterconnector={selectedIc}
						{panelInsetLeftPx}
						{panelInsetBottomPx}
						showRegionCharts={viewMode === 'map'}
						regionCharts={mapCharts.charts}
						chartMetric={mapChartMetric}
						regionChartsLoading={mapChartMetric !== mapCharts.loadedMetric}
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
						{showLegend}
						onmapthemechange={(v) => {
							mapTheme = v;
							updateUrl();
						}}
						ontransmissionlineschange={(v) => {
							showTransmissionLines = v;
							// The band colours are unreadable without the key naming them,
							// so switching the lines on brings the key with them. Off leaves
							// the key state alone — it renders nothing without its
							// transmission channel.
							if (v) showLegend = true;
							updateUrl();
						}}
						onflowschange={(v) => {
							showFlows = v;
							updateUrl();
						}}
						onshowlegendchange={(v) => {
							showLegend = v;
							// The key's voltage swatches are the only control for the band
							// filter, so hiding the key would strand a filtered layer with
							// no affordance to restore it. Put every band back as it goes.
							if (!v) bandVisibility = allBandsVisible();
							updateUrl();
						}}
					/>
				</div>

				<!-- Transmission key (desktop only — the mobile sheet owns the bottom
				     of the frame, as on /facilities; off by default, switched on with
				     the transmission layer or from the layers menu). Bottom-right
				     lifted clear of the collapsed attribution ⓘ; bottom-left belongs
				     to the panel. Its voltage swatches double as the layer's band
				     filter. -->
				{#if showLegend}
					<div class="absolute bottom-10 right-4 z-10 hidden tablet:block">
						<MapKey
							showTransmission={showTransmissionLines}
							{mapTheme}
							visibility={bandVisibility}
							onvisibilitychange={(v) => (bandVisibility = v)}
						/>
					</div>
				{/if}

				<!-- Map-charts view, bottom centre: the docked All-Australia card —
				     the national NEM+WEM sum built from the same two responses as
				     the region cards — with the minis' shared 24h window as its
				     footer. No national price exists, so the price metric keeps the
				     plain range chip instead. -->
				{#if viewMode === 'map'}
					{#if mapChartMetric !== 'price'}
						<div
							class="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 select-none"
						>
							<div class="w-80 overflow-hidden {MAP_CHIP_CLASS}">
								<div
									class="flex items-baseline justify-between gap-2 border-b border-mid-warm-grey/40 bg-light-warm-grey/60 px-3 pt-2 pb-1.5 text-sm font-semibold leading-5 text-dark-grey"
								>
									<span class="font-space">All Australia</span>
									{#if auLatestTotal}
										<span class="font-mono tabular-nums">{auLatestTotal}</span>
									{/if}
								</div>
								{#if mapChartMetric !== mapCharts.loadedMetric}
									<div class="flex h-[104px] items-center justify-center">
										<LoaderCircle class="size-4 animate-spin text-mid-grey" />
									</div>
								{:else if mapCharts.charts.AU}
									<div class="px-1.5 pt-1 pb-1">
										<RegionMiniChart
											processed={mapCharts.charts.AU}
											metric={mapChartMetric}
											chartHeightPx={96}
										/>
									</div>
								{/if}
								{#if mapChartsRange}
									<div
										class="border-t border-mid-warm-grey/40 px-3 pt-1 pb-1 font-mono text-xs tabular-nums text-mid-grey"
									>
										Last 24 hrs · {mapChartsRange}
									</div>
								{/if}
							</div>
						</div>
					{:else if mapChartsRange}
						<div class="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
							<div
								class="{MAP_CHIP_CLASS} px-3 pt-1.5 pb-1 font-mono text-sm tabular-nums text-dark-grey"
							>
								Last 24 hrs · {mapChartsRange}
							</div>
						</div>
					{/if}
				{/if}

				<!-- Tracker panel — open on load with the selected scope's generation
				     view (charts + metrics + corridors); a corridor click swaps to
				     that corridor's charts and zooms the map, Back restores the
				     generation view + full frame. Desktop: left slide-in panel over
				     the map (grip on its right edge, collapsible via the FAB);
				     mobile: persistent bottom sheet. Hidden in the map-charts view
				     unless a corridor is open. -->
				{#if !showPanel}
					<!-- Map-charts view: no panel/sheet — the on-anchor cards carry
					     the content. -->
				{:else if !belowTablet.current}
					<ResizablePanel
						open={panelOpen}
						onclose={() => (panelOpen = false)}
						direction="right"
						defaultSize={PANEL_FRACTION * 100}
						minSize={PANEL_MIN_PX}
						containerSize={containerWidth}
						onresize={(/** @type {number} */ pct) => (panelSizePct = pct)}
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
								title="Show panel"
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
     the selected scope's generation view by default, the selected corridor's
     charts behind a Back button. The sheet's header omits the top
     padding/border (its drag grip supplies the top chrome) and never shows
     the desktop collapse button. -->
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
				aria-label="Back to {regionTitle}"
			>
				<ChevronLeft size={20} />
			</button>
			<h2 class="m-0 min-w-0 truncate text-base font-medium text-dark-grey">{detailTitle}</h2>
		{:else}
			<h2 class="m-0 min-w-0 flex-1 truncate px-1 text-base font-medium text-dark-grey">
				{regionTitle}
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

<!-- Component swap only fades the incoming view — a both-mounted crossfade
     would jump the layout in the scrolling panel body. -->
{#snippet panelBody()}
	{#if selectedIc}
		<div in:fade={{ duration: 150 }}>
			<InterconnectorDetail
				interconnectorKey={selectedIc}
				flows={grid.flows}
				prices={grid.prices}
				dispatchDateTimeString={grid.dispatchDateTimeString}
			/>
		</div>
	{:else}
		<div class="min-h-full" in:fade={{ duration: 150 }}>
			<GenerationPanel
				region={selectedRegion}
				initialNowMs={initialData.nowMs}
				flows={grid.flows}
				prices={grid.prices}
				dispatchDateTimeString={grid.dispatchDateTimeString}
				onselectinterconnector={handleSelectInterconnector}
			/>
		</div>
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
