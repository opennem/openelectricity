<script>
	/**
	 * Tracker — the canonical tracker page.
	 *
	 * Page chrome and browser actions. A per-page session owns selection and
	 * range state; the canvas registers its charts with that same controller.
	 */

	import { building } from '$app/environment';
	import { pushState, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { OptionsMenuDivider, OptionsMenuItem } from '$lib/components/ui/options-menu';
	import {
		FullscreenContainer,
		FullscreenFilterBar,
		FullscreenFooter,
		FullscreenLayout,
		FullscreenNavDropdown
	} from '$lib/components/fullscreen';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import { BELOW_TABLET_QUERY, toggleFullscreenMode } from '$lib/utils/fullscreen-mode.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { downloadXlsx } from '$lib/utils/download-xlsx.js';
	import { TRACKER_REGION_TREE } from './tracker-regions.js';
	import TrackerCanvas from './TrackerCanvas.svelte';
	import RangeStatus from './RangeStatus.svelte';
	import TimeOfDay from './TimeOfDay.svelte';
	import RegionComparison from './RegionComparison.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import {
		comparisonFileName,
		comparisonWorkbook,
		regionComparisonCsv
	} from './region-comparison-export.js';
	import PngExport from './PngExport.svelte';
	import { capturePngSnapshot, settleChartAnimations } from './png-export.js';
	import {
		buildExportDataset,
		buildWorkbookSheets,
		datasetToCsv,
		exportFileName,
		trackerDownloadItems
	} from './tracker-export.js';
	import { DEFAULT_REGION } from './tracker-model.js';
	import { createTrackerSession } from './tracker-session.svelte.js';
	import { createTrackerNavigation } from './tracker-navigation.js';
	import { copiedTrackerUrl } from './tracker-url.js';
	import { startTrackerLive } from './tracker-live.js';

	/** @typedef {import('./types.js').TrackerRange} TrackerRange */
	/** @typedef {import('./types.js').ExportDatasetKey} ExportDatasetKey */
	/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds component-local state once; back/forward synchronisation
	// is handled explicitly from the materialised URL below.
	const initialData = untrack(() => structuredClone(data));

	const navigation = createTrackerNavigation({
		read: () => new URL(typeof window === 'undefined' ? page.url : window.location.href),
		write: (url, mode) => {
			const href = `${resolve('/(main)/tracker')}${url.search}`;
			if (mode === 'push') pushState(href, {});
			else replaceState(href, {});
		}
	});
	const session = createTrackerSession(initialData, (mode, resetQuery) =>
		navigation.write(session.selection, mode, resetQuery)
	);
	let selectedRegion = $derived(session.selection.region);
	let tablePanelOpen = $derived(session.selection.tablePanelOpen);
	let bucketFilter = $derived(session.selection.bucketFilter);
	let view = $derived(session.view);
	let comparingRegions = $derived(view === 'compare');
	let timeOfDay = $derived(view === 'profile');
	let timeline = $derived(view === 'timeline');
	const viewOptions = [
		{ value: 'timeline', label: 'Timeline' },
		{ value: 'profile', label: 'Profile' },
		{ value: 'compare', label: 'Compare' }
	];
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	let profileCanvas = $state.raw(/** @type {TimeOfDay | undefined} */ (undefined));
	let regionCanvas = $state.raw(/** @type {RegionComparison | undefined} */ (undefined));
	let notice = $state('');
	/** @type {HTMLElement} */
	let captureRoot;
	// Set after mount so automation can tell the hydrated page from the SSR
	// skeleton before interacting; the server-rendered charts already contain svgs.
	let hydrated = $state(false);
	let pngSnapshot = $state.raw(/** @type {import('./png-export.js').PngSnapshot | null} */ (null));
	async function openPngExport() {
		try {
			await document.fonts.ready;
			await settleChartAnimations(captureRoot);
			pngSnapshot = capturePngSnapshot(captureRoot);
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Unable to capture the charts.';
		}
	}
	/** @type {TrackerCanvas | undefined} */
	let canvas = $state.raw(undefined);
	let trackerLoading = $derived.by(() => timeline && (!canvas || canvas.isLoading()));
	const rangeControl = session.range;
	let isFullscreen = $derived(building ? true : session.selection.fullscreen);
	let navRange = $derived({
		selectedRange: rangeControl.selectedRange,
		customDays: rangeControl.customDays,
		displayInterval: rangeControl.displayInterval,
		startDate: rangeControl.pickerStartDate,
		endDate: rangeControl.pickerEndDate,
		maxDate: rangeControl.maxDate
	});
	/** The current selection as a shareable address — copied links and export provenance. */
	const shareUrl = () => copiedTrackerUrl(new URL(window.location.href), session.selection);
	let downloadItems = $derived(
		comparingRegions
			? [
					{
						key: 'regions',
						label: 'Region comparison',
						disabled: !regionCanvas?.exportDataset()?.rows.length
					}
				]
			: trackerDownloadItems({ tablePanelOpen }).map((item) => ({
					...item,
					disabled: timeOfDay || !canvas || canvas.getExportContext(item.key).pending
				}))
	);
	let workbookDisabled = $derived.by(() =>
		comparingRegions
			? !regionCanvas?.exportDataset()?.rows.length
			: timeOfDay || !canvas || canvas.getExportContext('xlsx').pending
	);
	/** @param {string} value */
	const handleRegionChange = (value) => session.select('region', value);
	/** @param {string | null} value */
	const handleBucketFilterChange = (value) => session.select('bucketFilter', value);
	$effect(() => {
		// Full same-route navigation updates page.url. Shallow history changes
		// only the address bar in SvelteKit, and arrive through popstate below.
		page.url;
		untrack(restoreCurrentUrl);
	});
	function restoreCurrentUrl() {
		const restored = navigation.read(new URL(window.location.href), Date.now());
		if (restored) session.restore(restored);
	}

	async function copyLink() {
		const url = shareUrl();
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
	function exportContext(requested = /** @type {ExportDatasetKey | 'xlsx'} */ ('xlsx')) {
		const context = canvas?.getExportContext(requested);
		if (!context || context.pending || context.error) {
			notice = context?.error
				? 'Some data could not load. Retry it before downloading.'
				: LOADING_NOTICE;
			return null;
		}
		return {
			...context,
			sourceUrl: shareUrl().href,
			generatedAtMs: Date.now()
		};
	}

	/** @param {string} key */
	function handleDownloadItem(key) {
		if (comparingRegions) {
			const regions = regionCanvas;
			const dataset = regions?.exportDataset();
			if (regions && dataset?.rows.length)
				downloadCsv(
					regionComparisonCsv(dataset),
					comparisonFileName(regions.getSelection(), regions.getViewport(), 'csv')
				);
			return;
		}
		const context = exportContext(/** @type {ExportDatasetKey} */ (key));
		if (!context) {
			return;
		}
		const dataset = buildExportDataset(/** @type {ExportDatasetKey} */ (key), context);
		if (!dataset) {
			notice = EMPTY_NOTICE;
			return;
		}
		downloadCsv(
			datasetToCsv(dataset, context.timeZone),
			exportFileName(context, /** @type {ExportDatasetKey} */ (key))
		);
	}

	async function downloadWorkbook() {
		if (comparingRegions) {
			const regions = regionCanvas;
			const dataset = regions?.exportDataset();
			if (regions && dataset?.rows.length) {
				try {
					await downloadXlsx(
						comparisonWorkbook(dataset, shareUrl().href, regions.getSelection()),
						comparisonFileName(regions.getSelection(), regions.getViewport(), 'xlsx')
					);
				} catch {
					notice = 'Could not build the workbook.';
				}
			}
			return;
		}
		const context = exportContext();
		if (!context) {
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

	onMount(() => {
		hydrated = true;
		// Below the tablet breakpoint the side-by-side panel would crush the
		// charts — default it closed unless the URL explicitly asked for it.
		// SSR stays stable (open); this only adjusts after hydration.
		const params = new URL(window.location.href).searchParams;
		if (!params.has('table') && window.matchMedia(BELOW_TABLET_QUERY).matches) {
			session.select('tablePanelOpen', false, null);
		}
		return startTrackerLive({
			document,
			tick: () => session.tick(Date.now(), canvas?.isLiveReady() ?? false)
		});
	});
</script>

<svelte:window onpopstate={restoreCurrentUrl} />

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
				optionsSpacingClass="tablet:pl-4"
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
					<div class="flex min-w-0 flex-1 items-center gap-4" data-testid="tracker-top-nav">
						<div class="hidden shrink-0 sm:block">
							<Switch
								buttons={viewOptions}
								selected={view}
								compact
								rounded="rounded-lg"
								darkSelected
								onchange={(option) => session.selectView(option.value)}
								aria-label="Analysis view"
							/>
						</div>
						<div class="shrink-0 sm:hidden">
							<FilterSelect
								selected={view}
								options={viewOptions}
								listLabel="Analysis view"
								defaultValue="timeline"
								compact
								onchange={(value) => session.selectView(value)}
							/>
						</div>
						<div
							class="h-8 shrink-0 border-l border-warm-grey"
							role="separator"
							aria-orientation="vertical"
						></div>
						<div class="grid min-w-0 flex-1 overflow-hidden" data-testid="tracker-view-filters">
							{#key view}
								<div
									class="col-start-1 row-start-1 flex min-w-0 items-center gap-4 overflow-x-auto py-0.5"
									data-view={view}
									in:fly={{
										x: -24,
										duration: reducedMotion.current ? 0 : 180,
										delay: reducedMotion.current ? 0 : 140
									}}
									out:fly={{ x: -24, duration: reducedMotion.current ? 0 : 140 }}
								>
									{#if !comparingRegions}
										<FilterSelect
											selected={selectedRegion}
											options={TRACKER_REGION_TREE}
											listLabel="Region"
											defaultValue={DEFAULT_REGION}
											compact
											onchange={handleRegionChange}
										/>
									{/if}

									{#if timeline}
										<ChartRangeBar
											--chart-range-gap="1rem"
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
											onrangeselect={session.selectRange}
											ondaterangechange={session.selectDates}
											onintervalchange={session.selectInterval}
										/>
									{/if}
									{#if comparingRegions}
										{@const controls = regionCanvas?.getControls()}
										{@render controls?.()}
									{:else if timeOfDay}
										{@const controls = profileCanvas?.getControls()}
										{@render controls?.()}
									{/if}
								</div>
							{/key}
						</div>
					</div>
					{#if timeline}
						<RangeStatus
							label={session.rangeLabel}
							inspectLabel={canvas?.getInspectLabel()}
							loading={trackerLoading}
						/>
					{/if}
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
						oncopylink={copyLink}
						showCopyLink
						{downloadItems}
						downloadXlsxDisabled={workbookDisabled}
						ondownloaditem={(key) => handleDownloadItem(/** @type {ExportDatasetKey} */ (key))}
						ondownloadxlsx={downloadWorkbook}
					>
						{#snippet extraSections({ close })}
							<OptionsMenuItem
								onclick={() => {
									close();
									openPngExport();
								}}>Export PNG</OptionsMenuItem
							>
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

				<main
					bind:this={captureRoot}
					class="flex min-h-0 flex-1 flex-col overflow-hidden"
					data-hydrated={hydrated || undefined}
				>
					{#if comparingRegions}
						<RegionComparison bind:this={regionCanvas} {session} cpi={data.comparisonCpi} />
					{:else if timeOfDay}
						<TimeOfDay bind:this={profileCanvas} {session} />
					{:else}
						<TrackerCanvas bind:this={canvas} {session} />
					{/if}
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

{#if pngSnapshot}
	<PngExport snapshot={pngSnapshot} onclose={() => (pngSnapshot = null)} />
{/if}
