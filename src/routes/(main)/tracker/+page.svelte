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
	import { Layers, Percent, X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import {
		OptionsMenuDivider,
		OptionsMenuHeading,
		OptionsMenuItem
	} from '$lib/components/ui/options-menu';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
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
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { downloadXlsx } from '$lib/utils/download-xlsx.js';
	import { TRACKER_REGION_TREE } from './tracker-regions.js';
	import TrackerCanvas from './TrackerCanvas.svelte';
	import {
		buildExportDataset,
		buildWorkbookSheets,
		datasetToCsv,
		exportFileName,
		trackerDownloadItems
	} from './tracker-export.js';
	import { DEFAULT_REGION, rangeSnapshotBounds, rangeSpanDays } from './tracker-model.js';
	import {
		applyTrackerUrl,
		copiedTrackerUrl,
		normaliseTrackerOverlays,
		parseTrackerUrl,
		validBucketFilterFor
	} from './tracker-url.js';

	/** @typedef {import('./types.js').TrackerRange} TrackerRange */
	/** @typedef {import('./types.js').ContributionMode} ContributionMode */
	/** @typedef {import('./types.js').ExportDatasetKey} ExportDatasetKey */
	/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */

	/** @type {Array<{ value: ContributionMode, label: string }>} */
	const CONTRIBUTION_OPTIONS = [
		{ value: 'generation', label: '% generation' },
		{ value: 'demand', label: '% demand' }
	];

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds component-local state once; back/forward synchronisation
	// is handled explicitly from the materialised URL below.
	const initialData = untrack(() => structuredClone(data));

	let selectedRegion = $state(initialData.region);
	let selectedGroup = $state(initialData.group);
	let priceMode = $state(initialData.priceMode);
	let emissionsMode = $state(initialData.emissionsMode);
	let overlays = $state(initialData.overlays);
	let tablePanelOpen = $state(initialData.tablePanelOpen);
	/** @type {TrackerRange} */
	let rangeSnapshot = $state(initialData.range);
	/** Recurring calendar period in the All range; null shows every period. */
	let bucketFilter = $state(initialData.bucketFilter ?? null);
	/** Denominator for the table's contribution column — session-only, not in the URL. */
	/** @type {ContributionMode} */
	let contributionMode = $state('generation');
	let notice = $state('');
	/** @type {TrackerCanvas | undefined} */
	let canvas = $state.raw(undefined);
	/** Live range control hoisted from the canvas (createChartRangeControl). */
	/** @type {ReturnType<typeof import('$lib/components/charts/facility/chart-range-control.svelte.js').createChartRangeControl> | null} */
	let rangeControl = $state.raw(null);
	/** Interval-aware range readout, hoisted alongside it. */
	/** @type {(() => string) | null} */
	let getRangeLabel = $state.raw(null);
	let suppressUrl = false;

	let isFullscreen = $derived(building ? true : isFullscreenUrl(page.url));

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
		const { startMs, endMs } = rangeSnapshotBounds(snapshot, initialData.nowMs);
		return {
			selectedRange: snapshot.kind === 'preset' ? snapshot.days : null,
			customDays: rangeSpanDays(startMs, endMs),
			displayInterval: snapshot.intervalId,
			startDate: toNetworkDateString(startMs, navTimeZone),
			endDate: toNetworkDateString(endMs, navTimeZone),
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
			overlays,
			tablePanelOpen
		};
	}

	/**
	 * Mirror the navigation state into the address bar. Discrete picks push a
	 * history entry; continuous or high-frequency changes (pan/zoom settles,
	 * overlay toggles) replace it so Back still steps between real decisions.
	 * @param {'replace' | 'push'} [mode]
	 */
	function syncUrl(mode = 'replace') {
		if (suppressUrl || typeof window === 'undefined') return;
		const url = applyTrackerUrl(new URL(window.location.href), currentUrlState());
		const href = `${resolve('/(main)/tracker')}${url.search}`;
		if (mode === 'push') pushState(href, {});
		else replaceState(href, {});
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

	/** @param {TrackerRange} value */
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

	/** @param {import('./types.js').TrackerOverlay[]} value */
	function handleOverlaysChange(value) {
		overlays = normaliseTrackerOverlays(value);
		syncUrl('replace');
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

	// ============================================
	// Data export
	// ============================================

	const LOADING_NOTICE = 'Charts are still loading — try again in a moment.';
	const EMPTY_NOTICE = 'Nothing to export yet.';

	/**
	 * The canvas's settled state plus the page's provenance, or null while
	 * the charts are mid-switch (the held frame would be stale).
	 * @returns {TrackerExportContext | null}
	 */
	function exportContext() {
		const context = canvas?.getExportContext();
		if (!context || context.pending) return null;
		return {
			...context,
			sourceUrl: copiedTrackerUrl(new URL(window.location.href), currentUrlState()).href,
			generatedAtMs: Date.now()
		};
	}

	/** @param {ExportDatasetKey} key */
	function handleDownloadItem(key) {
		const context = exportContext();
		if (!context) {
			notice = LOADING_NOTICE;
			return;
		}
		const dataset = buildExportDataset(key, context);
		if (!dataset) {
			notice = EMPTY_NOTICE;
			return;
		}
		downloadCsv(datasetToCsv(dataset, context.timeZone), exportFileName(context, key));
	}

	async function downloadWorkbook() {
		const context = exportContext();
		if (!context) {
			notice = LOADING_NOTICE;
			return;
		}
		const sheets = buildWorkbookSheets(context);
		// Summary alone means no dataset has arrived.
		if (sheets.length < 2) {
			notice = EMPTY_NOTICE;
			return;
		}
		try {
			await downloadXlsx(sheets, exportFileName(context, 'xlsx'));
		} catch (error) {
			console.error('Tracker workbook export failed', error);
			notice = 'Could not build the workbook.';
		}
	}

	async function restoreFromUrl() {
		const parsed = parseTrackerUrl(new URL(window.location.href).searchParams, {
			nowMs: Date.now()
		});
		suppressUrl = true;
		selectedRegion = parsed.region;
		selectedGroup = parsed.group;
		priceMode = parsed.priceMode;
		emissionsMode = parsed.emissionsMode;
		overlays = parsed.overlays;
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
						<!-- NEM states nest under the whole-NEM option; the pill goes
						     active (dark) when deviating from the NEM default. -->
						<FilterSelect
							selected={selectedRegion}
							options={TRACKER_REGION_TREE}
							listLabel="Region"
							defaultValue={DEFAULT_REGION}
							compact
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
								class="ml-auto hidden shrink-0 whitespace-nowrap font-space text-xs text-mid-grey lg:inline"
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
						downloadItems={trackerDownloadItems({ tablePanelOpen })}
						ondownloaditem={(key) => handleDownloadItem(/** @type {ExportDatasetKey} */ (key))}
						ondownloadxlsx={downloadWorkbook}
					>
						{#snippet extraSections({ close })}
							<!-- Table choices live here so the table header stays clean. -->
							<OptionsMenuHeading icon={Layers}>Fuel tech grouping</OptionsMenuHeading>
							{#each GROUP_OPTIONS as option (option.value)}
								<OptionsMenuItem
									selected={selectedGroup === option.value}
									onclick={() => {
										handleGroupChange(option.value);
										close();
									}}
								>
									{option.label}
								</OptionsMenuItem>
							{/each}
							<OptionsMenuDivider />

							<OptionsMenuHeading icon={Percent}>Contribution</OptionsMenuHeading>
							{#each CONTRIBUTION_OPTIONS as option (option.value)}
								<OptionsMenuItem
									selected={contributionMode === option.value}
									onclick={() => {
										contributionMode = option.value;
										close();
									}}
								>
									{option.label}
								</OptionsMenuItem>
							{/each}
							<OptionsMenuDivider />
						{/snippet}
					</PageOptionsMenu>
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
						{overlays}
						{tablePanelOpen}
						{bucketFilter}
						{contributionMode}
						initialRange={rangeSnapshot}
						initialNowMs={initialData.nowMs}
						oncontrolschange={(controls) => {
							rangeControl = controls.range;
							getRangeLabel = controls.getRangeLabel;
						}}
						onrangechange={handleRangeChange}
						onpricemodechange={handlePriceModeChange}
						onemissionsmodechange={handleEmissionsModeChange}
						onoverlayschange={handleOverlaysChange}
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
