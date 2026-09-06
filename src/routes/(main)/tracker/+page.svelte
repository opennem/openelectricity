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
	import { DEFAULT_REGION } from './tracker-model.js';
	import { createTrackerSession } from './tracker-session.svelte.js';
	import { createTrackerNavigation } from './tracker-navigation.js';
	import { copiedTrackerUrl } from './tracker-url.js';

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

	const navigation = createTrackerNavigation({
		read: () => new URL(typeof window === 'undefined' ? page.url : window.location.href),
		write: (url, mode) => {
			const href = `${resolve('/(main)/tracker')}${url.search}`;
			if (mode === 'push') pushState(href, {});
			else replaceState(href, {});
		}
	});
	const session = createTrackerSession(initialData, (mode) =>
		navigation.write(session.selection, mode)
	);
	let selectedRegion = $derived(session.selection.region);
	let selectedGroup = $derived(session.selection.group);
	let tablePanelOpen = $derived(session.selection.tablePanelOpen);
	let bucketFilter = $derived(session.selection.bucketFilter);
	/** @type {ContributionMode} */
	let contributionMode = $state('generation');
	let notice = $state('');
	/** @type {TrackerCanvas | undefined} */
	let canvas = $state.raw(undefined);
	const rangeControl = session.range;
	let isFullscreen = $derived(building ? true : isFullscreenUrl(page.url));
	let navRange = $derived({
		selectedRange: rangeControl.selectedRange,
		customDays: rangeControl.customDays,
		displayInterval: rangeControl.displayInterval,
		startDate: rangeControl.pickerStartDate,
		endDate: rangeControl.pickerEndDate,
		maxDate: rangeControl.maxDate,
		pending: !session.connected || rangeControl.rangeSwitchPending
	});
	const currentUrlState = () => session.selection;
	let downloadItems = $derived(
		trackerDownloadItems({ tablePanelOpen }).map((item) => ({
			...item,
			disabled: !canvas || canvas.getExportContext(item.key).pending
		}))
	);
	let workbookDisabled = $derived.by(() => !canvas || canvas.getExportContext('xlsx').pending);
	/** @param {string} value */
	const handleRegionChange = (value) => session.select('region', value);
	/** @param {string} value */
	const handleGroupChange = (value) => session.select('group', value);
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
			sourceUrl: copiedTrackerUrl(new URL(window.location.href), currentUrlState()).href,
			generatedAtMs: Date.now()
		};
	}

	/** @param {ExportDatasetKey} key */
	function handleDownloadItem(key) {
		const context = exportContext(key);
		if (!context) {
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
		// Below the tablet breakpoint the side-by-side panel would crush the
		// charts — default it closed unless the URL explicitly asked for it.
		// SSR stays stable (open); this only adjusts after hydration.
		const params = new URL(window.location.href).searchParams;
		if (!params.has('table') && window.matchMedia(BELOW_TABLET_QUERY).matches) {
			session.select('tablePanelOpen', false, null);
		}
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
							onrangeselect={session.selectRange}
							ondaterangechange={session.selectDates}
							onintervalchange={session.selectInterval}
						/>

						{#if session.rangeLabel}
							<span
								class="ml-auto hidden shrink-0 whitespace-nowrap font-space text-xs text-mid-grey lg:inline"
							>
								{session.rangeLabel}
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
						{downloadItems}
						downloadXlsxDisabled={workbookDisabled}
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
					<TrackerCanvas bind:this={canvas} {session} {contributionMode} />
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
