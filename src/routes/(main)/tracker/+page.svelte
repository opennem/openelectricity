<script>
	/**
	 * Tracker — the canonical tracker page.
	 *
	 * Thin chrome layer: owns the URL-parsed navigation state (region, grouping,
	 * range snapshot, card modes, table panel) and is the sole URL writer. The
	 * chart machinery lives in TrackerCanvas, which hoists its live range
	 * control up via `oncontrolschange` so the nav bar's range/interval
	 * controls drive the charts directly.
	 */

	import { building } from '$app/environment';
	import { pushState, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import {
		FullscreenContainer,
		FullscreenFilterBar,
		FullscreenFooter,
		FullscreenLayout,
		FullscreenNavDropdown
	} from '$lib/components/fullscreen';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import { toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode
	} from '$lib/utils/fullscreen-mode.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { TRACKER_REGION_OPTIONS } from './tracker-regions.js';
	import RegionDropdown from './RegionDropdown.svelte';
	import TrackerCanvas from './TrackerCanvas.svelte';
	import { DEFAULT_REGION } from './tracker-model.js';
	import {
		applyTrackerUrl,
		copiedTrackerUrl,
		parseTrackerUrl,
		validBucketFilterFor
	} from './tracker-url.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	// Route data seeds component-local state once; back/forward synchronisation
	// is handled explicitly from the materialised URL below.
	const initialData = untrack(() => structuredClone(data));

	let selectedRegion = $state(initialData.region);
	let selectedGroup = $state(initialData.group);
	let priceMode = $state(initialData.priceMode);
	let emissionsMode = $state(initialData.emissionsMode);
	let tablePanelOpen = $state(initialData.tablePanelOpen);
	let rangeSnapshot = $state(initialData.range);
	/** Recurring calendar period in the All range; null shows every period. */
	let bucketFilter = $state(initialData.bucketFilter ?? null);
	let notice = $state('');
	/** @type {TrackerCanvas | undefined} */
	let canvas = $state(undefined);
	/** Live range control hoisted from the canvas (createChartRangeControl). */
	let rangeControl = $state(/** @type {any} */ (null));
	/** Interval-aware range readout, hoisted alongside it. */
	let getRangeLabel = $state(/** @type {(() => string) | null} */ (null));
	let suppressUrl = false;

	let isFullscreen = $derived(building ? true : isFullscreenUrl(page.url));

	const DAY_MS = 86_400_000;

	// Nav range-bar props. Until the canvas mounts and hoists its live range
	// control, the bar renders (and SSRs) from the URL-parsed snapshot — the 3D
	// preset shows from the first paint instead of a placeholder — pulsing as
	// pending; the live control takes over seamlessly on mount.
	let navTimeZone = $derived(regionToNetwork(selectedRegion).timeZone);
	let navRange = $derived.by(() => {
		if (rangeControl) {
			return {
				selectedRange: rangeControl.selectedRange,
				customDays: rangeControl.customDays,
				displayInterval: rangeControl.displayInterval,
				startDate: rangeControl.pickerStartDate,
				endDate: rangeControl.pickerEndDate,
				maxDate: rangeControl.maxDate,
				pending: rangeControl.rangeSwitchPending
			};
		}
		const snapshot = rangeSnapshot;
		const end = snapshot.kind === 'custom' ? snapshot.endMs : initialData.nowMs;
		const days =
			snapshot.kind === 'custom'
				? Math.max(1, Math.ceil((snapshot.endMs - snapshot.startMs) / DAY_MS))
				: snapshot.days === -1
					? Math.max(1, Math.ceil((end - new Date(MIN_DATE).getTime()) / DAY_MS))
					: snapshot.days;
		const start = snapshot.kind === 'custom' ? snapshot.startMs : end - days * DAY_MS;
		return {
			selectedRange: snapshot.kind === 'preset' ? snapshot.days : null,
			customDays: days,
			displayInterval: snapshot.intervalId,
			startDate: toNetworkDateString(start, navTimeZone),
			endDate: toNetworkDateString(end, navTimeZone),
			maxDate: toNetworkDateString(initialData.nowMs, navTimeZone),
			pending: true
		};
	});

	function currentUrlState() {
		return {
			region: selectedRegion,
			group: selectedGroup,
			range: rangeSnapshot,
			bucketFilter,
			priceMode,
			emissionsMode,
			tablePanelOpen
		};
	}

	/** @param {'replace' | 'push'} [mode] */
	function syncUrl(mode = 'replace') {
		if (suppressUrl || typeof window === 'undefined') return;
		const url = applyTrackerUrl(new URL(window.location.href), currentUrlState());
		if (mode === 'push') pushState(`${resolve('/(main)/tracker')}${url.search}`, {});
		else replaceState(`${resolve('/(main)/tracker')}${url.search}`, {});
	}

	/** @param {string} value */
	function handleRegionChange(value) {
		selectedRegion = value;
		syncUrl('push');
	}

	/** @param {string} value */
	function handleGroupChange(value) {
		selectedGroup = value;
		syncUrl('push');
	}

	/** @param {any} value */
	function handleRangeChange(value) {
		rangeSnapshot = value;
		// Clear filters that the new range or interval cannot represent.
		bucketFilter = validBucketFilterFor(bucketFilter, value);
		syncUrl('replace');
	}

	/** @param {string | null} value */
	function handleBucketFilterChange(value) {
		bucketFilter = value;
		syncUrl('push');
	}

	/** @param {import('./types.js').PriceMode} value */
	function handlePriceModeChange(value) {
		priceMode = value;
		syncUrl('push');
	}

	/** @param {import('./types.js').EmissionsMode} value */
	function handleEmissionsModeChange(value) {
		emissionsMode = value;
		syncUrl('push');
	}

	/** @param {boolean} open */
	function handlePanelToggle(open) {
		tablePanelOpen = open;
		syncUrl('push');
	}

	async function copyLink() {
		const url = copiedTrackerUrl(new URL(window.location.href), currentUrlState());
		try {
			await navigator.clipboard.writeText(url.href);
			notice = 'Link copied.';
		} catch {
			window.prompt('Copy this link', url.href);
		}
	}

	async function restoreFromUrl() {
		const parsed = parseTrackerUrl(new URL(window.location.href).searchParams, {
			nowMs: Date.now(),
			validRegions: TRACKER_REGION_OPTIONS.map((option) => option.value)
		});
		suppressUrl = true;
		selectedRegion = parsed.region;
		selectedGroup = parsed.group;
		priceMode = parsed.priceMode;
		emissionsMode = parsed.emissionsMode;
		tablePanelOpen = parsed.tablePanelOpen;
		rangeSnapshot = parsed.range;
		bucketFilter = parsed.bucketFilter;
		await canvas?.applyRangeSnapshot(parsed.range);
		suppressUrl = false;
	}

	onMount(() => {
		// Below the tablet breakpoint the side-by-side panel would crush the
		// charts — default it closed unless the URL explicitly asked for it.
		// SSR stays stable (open); this only adjusts after hydration.
		const params = new URL(window.location.href).searchParams;
		if (!params.has('table') && window.matchMedia(BELOW_TABLET_QUERY).matches) {
			tablePanelOpen = false;
		}
		window.addEventListener('popstate', restoreFromUrl);
		return () => window.removeEventListener('popstate', restoreFromUrl);
	});
</script>

<Meta
	title="Tracker"
	description="Track Australia's electricity generation, price and emissions across regions, ranges and fuel technologies."
	canonical={false}
/>
<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

<FullscreenLayout {isFullscreen} gridline={false} class="bg-light-warm-grey">
	{#snippet filterBar()}
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
							href={resolve('/(main)/tracker')}
							class="rounded-lg px-2 py-1 text-sm font-semibold text-dark-grey no-underline hover:bg-warm-grey hover:no-underline lg:text-base"
						>
							Tracker
						</a>
					{/if}
				{/snippet}

				{#snippet rest()}
					{#if isFullscreen}<div class="h-8 shrink-0 border-l border-warm-grey"></div>{/if}
					<div
						class="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto pb-0.5 {isFullscreen
							? 'pl-3'
							: ''}"
					>
						<RegionDropdown
							selected={selectedRegion}
							compact
							defaultValue={DEFAULT_REGION}
							onchange={handleRegionChange}
						/>

						<div class="h-6 w-px shrink-0 bg-warm-grey"></div>

						<ChartRangeBar
							selectedRange={navRange.selectedRange}
							customDays={navRange.customDays}
							displayInterval={navRange.displayInterval}
							startDate={navRange.startDate}
							endDate={navRange.endDate}
							minDate={MIN_DATE}
							maxDate={navRange.maxDate}
							showIntervalDropdown
							includeRollingInterval
							showBucketFilter
							{bucketFilter}
							onbucketfilterchange={handleBucketFilterChange}
							variant="expanded"
							pending={navRange.pending}
							onrangeselect={(days) => rangeControl?.handleRangeSelect(days)}
							ondaterangechange={(range) => rangeControl?.handleDateRangeChange(range)}
							onintervalchange={(value) => rangeControl?.handleIntervalChange(value)}
						/>

						{#if getRangeLabel}
							<span
								class="hidden shrink-0 whitespace-nowrap font-space text-xs text-mid-grey lg:inline"
							>
								{getRangeLabel()}
							</span>
						{/if}
					</div>
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
						oncopylink={copyLink}
						showCopyLink
					/>
				{/snippet}
			</FullscreenFilterBar>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<div class="flex min-h-0 flex-1 flex-col bg-light-warm-grey">
				{#if notice}
					<div
						class="relative z-30 flex shrink-0 items-center justify-center gap-3 border-b border-warm-grey bg-white px-4 py-2 font-space text-xs text-dark-grey"
						role="status"
					>
						<span>{notice}</span><button
							type="button"
							onclick={() => (notice = '')}
							class="rounded p-1 text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
							aria-label="Dismiss"><X class="size-3.5" /></button
						>
					</div>
				{/if}

				<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<TrackerCanvas
						bind:this={canvas}
						region={selectedRegion}
						group={selectedGroup}
						{priceMode}
						{emissionsMode}
						{tablePanelOpen}
						{bucketFilter}
						initialRange={rangeSnapshot}
						initialNowMs={initialData.nowMs}
						oncontrolschange={(controls) => {
							rangeControl = controls.range;
							getRangeLabel = controls.getRangeLabel;
						}}
						onrangechange={handleRangeChange}
						ongroupchange={handleGroupChange}
						onpricemodechange={handlePriceModeChange}
						onemissionsmodechange={handleEmissionsModeChange}
						onpaneltoggle={handlePanelToggle}
					/>
				</main>
			</div>
			{#snippet footer()}
				<FullscreenFooter
					{isFullscreen}
					onenterfullscreen={() => toggleFullscreenMode(isFullscreen)}
				/>
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>
