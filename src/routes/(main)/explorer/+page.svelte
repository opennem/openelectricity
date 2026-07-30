<script>
	/**
	 * Explorer — map-first shell for the future unified Tracker.
	 *
	 * v1 is a plain base map plus a single-select region persisted to `?region=`
	 * (the seam data layers and charts hook into later). Reuses the /facilities
	 * fullscreen system (FullscreenLayout + FullscreenFilterBar +
	 * FullscreenContainer) so the cross-route view transitions with /facilities
	 * and /facility/[code] line up. Reached via the `explorer_nav` feature flag
	 * (logo dropdown only) while in development.
	 */

	import { page } from '$app/state';
	import { building } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { MediaQuery } from 'svelte/reactivity';

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
	import RegionDropdown from './RegionDropdown.svelte';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode
	} from '$lib/utils/fullscreen-mode.js';

	/** @type {{ data: { region: string, mapTheme: 'light' | 'dark' | 'satellite', showTransmissionLines: boolean } }} */
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
	// Re-sync on back/forward — $state doesn't re-init when the load re-runs.
	afterNavigate(() => {
		selectedRegion = data.region;
		mapTheme = data.mapTheme;
		showTransmissionLines = data.showTransmissionLines;
	});

	// Defaults are omitted so the URL stays clean; the load's fallbacks restore
	// them. Build from window.location, not page.url — page.url goes stale after
	// a shallow replaceState. This also leaves `?fullscreen=false` untouched.
	function updateUrl() {
		const url = new URL(window.location.href);
		if (selectedRegion === '_all') url.searchParams.delete('region');
		else url.searchParams.set('region', selectedRegion);
		if (mapTheme === 'light') url.searchParams.delete('theme');
		else url.searchParams.set('theme', mapTheme);
		if (showTransmissionLines) url.searchParams.delete('transmission');
		else url.searchParams.set('transmission', 'false');
		replaceState(`${url.pathname}${url.search}`, {});
	}

	/** @param {string} value */
	function handleRegionChange(value) {
		selectedRegion = value;
		updateUrl();
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
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

<Meta title="Explorer" description="Explore Australia's electricity system on a map." />

<FullscreenLayout {isFullscreen}>
	{#snippet filterBar()}
		<!-- Unlike /facilities there is no separate mobile floating nav — the bar
		     is short enough to keep on all breakpoints. -->
		<div class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen ? '' : 'px-4'}">
			<FullscreenFilterBar
				{isFullscreen}
				routeKey="explorer"
				stableName="filter-bar-stable-explorer"
				paddingX="px-8"
				bgClass="bg-light-warm-grey/75"
			>
				{#snippet stable()}
					{#if isFullscreen}
						<FullscreenNavDropdown />
						<a
							href="/explorer"
							class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline text-sm lg:text-base px-2 py-1"
						>
							Explorer
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
			<div class="flex-1 min-h-0 relative overflow-hidden">
				{#if !mapLoaded}
					<div class="absolute inset-0 z-10 bg-[#D5D8DC]/50 flex items-center justify-center">
						<LogoMarkLoader />
					</div>
				{/if}
				{#await import('./Map.svelte') then { default: ExplorerMap }}
					<ExplorerMap
						{mapTheme}
						{showTransmissionLines}
						cooperativeGestures={!isFullscreen}
						onload={() => setTimeout(() => (mapLoaded = true), 250)}
					/>
				{/await}

				<!-- Map display options — theme + transmission lines only for now.
				     right-20 clears the NavigationControl in the top-right corner;
				     top-5 centres the 44px button on the zoom stack beside it. -->
				<div class="absolute top-5 right-20 z-20">
					<MapOptionsDropdown
						{mapTheme}
						{showTransmissionLines}
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
					/>
				</div>
			</div>

			{#snippet footer()}
				<FullscreenFooter {isFullscreen} onenterfullscreen={toggleFullscreen} />
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Toggle navigation menu', keys: ['G'] },
		...(belowTablet.current ? [] : [{ label: 'Enter / exit full screen', keys: ['F'] }]),
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
