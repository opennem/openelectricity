<script>
	/**
	 * Tracker page chrome shared by every view route: the filter bar (view
	 * switcher, region and the view's own controls and status), options menu,
	 * notices, PNG export, the "Download data" dialog and shortcuts. Each view
	 * page composes it around its canvas and supplies what differs through
	 * snippets and props. Charts and panels register their own downloads with
	 * the shell's registry (`chart-downloads.svelte.js`); the page supplies
	 * only the workbook's Summary rows and the file names.
	 *
	 * Phones (below 768px) get touch-sized controls (`touch-controls.js`) and
	 * scroll the page as a document: the one-row top nav (logo menu, view
	 * dropdown and menus) scrolls away, while a pill summarising the filters
	 * (the range over "NEM · 30 min · AEST") sits at the top of the body and
	 * stays in view. The pill opens the filters in a sheet
	 * (`TrackerFilterSheet`), which shows the same Region switch and view
	 * `controls` as the bar. The view's `table` button floats at the bottom
	 * middle and opens its table in a sheet of its own (`TrackerSplitLayout`).
	 */

	import { building } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import RangeStatus from './RangeStatus.svelte';
	import TrackerFilterSheet from './TrackerFilterSheet.svelte';
	import { Download, ImageDown, Table2, X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { OptionsMenuDivider, OptionsMenuItem } from '$lib/components/ui/options-menu';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import {
		setTouchControls,
		TOUCH_ICON,
		TOUCH_ICON_BUTTON
	} from '$lib/components/ui/touch-controls.js';
	import {
		FullscreenContainer,
		FullscreenFilterBar,
		FullscreenFooter,
		FullscreenLayout,
		FullscreenNavDropdown,
		pageShortcuts
	} from '$lib/components/fullscreen';
	import { BELOW_TABLET_QUERY, toggleFullscreenMode } from '$lib/utils/fullscreen-mode.js';
	import { shortcutFor } from './tracker-shortcuts.js';
	import { regionShortLabel, TRACKER_REGION_TREE } from './tracker-regions.js';
	import { DEFAULT_REGION } from './tracker-model.js';
	import { TRACKER_VIEWS, trackerView } from './tracker-url.js';
	import PngExport from './PngExport.svelte';
	import { capturePngSnapshot, settleChartAnimations } from './png-export.js';
	import DownloadDataModal from '$lib/components/charts/card/DownloadDataModal.svelte';
	import {
		createChartDownloads,
		setChartDownloads
	} from '$lib/components/charts/card/chart-downloads.svelte.js';

	/**
	 * @type {{
	 *   view: import('./tracker-url.js').TrackerView,
	 *   session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
	 *   shareUrl: () => URL,
	 *   notice?: string,
	 *   regionSelect?: boolean,
	 *   controls?: import('svelte').Snippet,
	 *   status?: import('./types.js').TrackerRangeStatus,
	 *   table?: { label: string, open: boolean, onopen: () => void },
	 *   menu?: import('svelte').Snippet<[{ close: () => void }]>,
	 *   downloadSummary: () => Array<[string, string]>,
	 *   downloadFileName: (id: string | null, extension: 'csv' | 'xlsx') => string,
	 *   shortcuts?: Array<{ label: string, keys: string[] }>,
	 *   onshortcut?: (id: import('./tracker-shortcuts.js').TrackerShortcut) => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let {
		view,
		session,
		shareUrl,
		notice = $bindable(''),
		regionSelect = true,
		controls,
		status,
		table,
		menu,
		downloadSummary,
		downloadFileName,
		shortcuts = [],
		onshortcut,
		children
	} = $props();

	setTouchControls();

	// The switcher's option lists are mutable; the view table is not.
	const viewOptions = [...TRACKER_VIEWS];
	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	let isFullscreen = $derived(building ? true : session.selection.fullscreen);
	let showShortcuts = $state(false);
	// Set after mount so automation can tell the hydrated page from the SSR
	// skeleton before interacting; the server-rendered charts already contain svgs.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	/** Whether the phone filter sheet is open. */
	let filtersOpen = $state(false);
	/** The phone pill's line under the range: the other filters, and the
	 * zone the range's times are in. */
	let filterDetail = $derived(
		[
			regionSelect ? regionShortLabel(session.selection.region) : null,
			status?.intervalLabel,
			status?.zoneLabel
		]
			.filter(Boolean)
			.join(' · ')
	);

	/** Whether the phone range readout is stuck to the top of the viewport. */
	let rangeStuck = $state(false);
	/** Watch a marker placed just above the sticky readout: once it has
	 * scrolled off the top, the readout is stuck.
	 * @type {import('svelte/attachments').Attachment<HTMLElement>} */
	function watchStuck(marker) {
		const observer = new IntersectionObserver(([entry]) => {
			rangeStuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
		});
		observer.observe(marker);
		return () => observer.disconnect();
	}

	/** Each view is its own route; a bare path starts it with its defaults.
	 * @param {string} value */
	function selectView(value) {
		if (value !== view) goto(resolve(trackerView(value).route));
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

	/** @type {HTMLElement} */
	let captureRoot;
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

	const downloads = setChartDownloads(
		createChartDownloads({
			timeZone: () => session.timeZone,
			fileName: (id, extension) => downloadFileName(id, extension),
			summary: () => downloadSummary(),
			sourceUrl: () => shareUrl().href,
			onnotice: (message) => (notice = message)
		})
	);

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		// The dialog owns the keyboard while open (Escape closes it).
		if (downloads.open) return;
		if (event.key === 'Escape') {
			if (showShortcuts) {
				event.preventDefault();
				showShortcuts = false;
			}
			return;
		}
		const action = shortcutFor(event);
		if (!action) return;
		if (action === 'shortcuts') {
			showShortcuts = !showShortcuts;
			return;
		}
		showShortcuts = false;
		if (action === 'fullscreen') {
			if (!belowTablet.current) toggleFullscreenMode(isFullscreen);
			return;
		}
		if (!onshortcut) return;
		event.preventDefault();
		onshortcut(action);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta
	title="Tracker"
	description="Track Australia's electricity generation, price and emissions across regions, ranges and fuel technologies."
	canonical={false}
/>
<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

<FullscreenLayout {isFullscreen} phoneScroll gridline={false} class="bg-light-warm-grey">
	{#snippet filterBar()}
		<div class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen ? '' : 'px-4'}">
			<FullscreenFilterBar
				{isFullscreen}
				routeKey="tracker"
				stableName="filter-bar-stable-tracker"
				feedback
				wrapOnPhone
				paddingX={isFullscreen ? 'px-4' : 'px-8'}
				bgClass="bg-light-warm-grey/75"
			>
				{#snippet stable()}
					{#if isFullscreen}
						<FullscreenNavDropdown label="Tracker" />
					{/if}
				{/snippet}

				{#snippet rest()}
					{#if isFullscreen}
						<div class="h-8 shrink-0 border-l border-warm-grey max-tablet:hidden"></div>
					{/if}
					<!-- Phones: the logo menu and the view dropdown lead the row, with
					     the menus at its end (FullscreenFilterBar's `wrapOnPhone`
					     flattens the wrappers); the filters move to the sheet the
					     body's sticky pill opens. -->
					<div
						class="flex min-w-0 flex-1 items-center gap-4 max-tablet:contents"
						data-testid="tracker-top-nav"
					>
						<!-- Like the range bar's presets, the view switcher folds into a
						     dropdown below `md`, where the bar is too cramped. -->
						<div class="hidden shrink-0 md:block">
							<Switch
								buttons={viewOptions}
								selected={view}
								compact
								rounded="rounded-lg"
								darkSelected
								transitionName="tracker-view-switch"
								onchange={(option) => selectView(option.value)}
								aria-label="Analysis view"
							/>
						</div>
						<div class="shrink-0 max-tablet:mr-auto md:hidden">
							<FilterSelect
								selected={view}
								options={viewOptions}
								listLabel="Analysis view"
								defaultValue="timeline"
								compact
								onchange={selectView}
							/>
						</div>
						<div
							class="h-8 shrink-0 border-l border-warm-grey max-tablet:hidden"
							role="separator"
							aria-orientation="vertical"
						></div>
						<div class="flex min-w-0 flex-1 items-center gap-4 max-tablet:hidden">
							<div class="relative flex min-w-0 flex-1">
								<div
									class="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-0.5"
									data-testid="tracker-view-filters"
									data-view={view}
								>
									{#if regionSelect}
										<FilterSelect
											selected={session.selection.region}
											options={TRACKER_REGION_TREE}
											listLabel="Region"
											defaultValue={DEFAULT_REGION}
											compact
											onchange={(value) => session.select('region', value)}
										/>
									{/if}
									{@render controls?.()}
								</div>
							</div>
							{#if status}
								<RangeStatus {...status} />
							{/if}
						</div>
					</div>
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						triggerClass="p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer {TOUCH_ICON_BUTTON}"
						iconClass="size-6 text-mid-grey {TOUCH_ICON}"
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
						oncopylink={copyLink}
						showCopyLink
						onshowshortcuts={() => (showShortcuts = !showShortcuts)}
					>
						{#snippet extraSections({ close })}
							<OptionsMenuItem
								icon={Download}
								onclick={() => {
									close();
									downloads.open = true;
								}}>Download data</OptionsMenuItem
							>
							<OptionsMenuItem
								icon={ImageDown}
								onclick={() => {
									close();
									openPngExport();
								}}>Export PNG</OptionsMenuItem
							>
							{@render menu?.({ close })}
							<OptionsMenuDivider />
						{/snippet}
					</PageOptionsMenu>
				{/snippet}
			</FullscreenFilterBar>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} phoneScroll class="[view-transition-name:page-body]">
			<div class="flex min-h-0 flex-1 flex-col bg-light-warm-grey">
				{#if status}
					<!-- Phones: the filters pill stays in view as the top nav
					     scrolls away; it lifts out once stuck to the top (the
					     marker above it has scrolled off). -->
					<div class="tablet:hidden" aria-hidden="true" {@attach watchStuck}></div>
					<div
						class="pointer-events-none sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-center px-[10px] tablet:hidden"
					>
						<RangeStatus
							{...status}
							detail={filterDetail}
							variant="sticky"
							stuck={rangeStuck}
							onfilters={() => (filtersOpen = true)}
						/>
					</div>
				{/if}
				{#if notice}
					<div
						class="relative z-30 flex shrink-0 items-center justify-center gap-3 border-b border-warm-grey bg-white px-4 py-2 font-space text-xs text-dark-grey"
						role="status"
					>
						<span>{notice}</span><button
							type="button"
							onclick={() => (notice = '')}
							class="touch-hit rounded p-1 text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
							aria-label="Dismiss"><X class="size-3.5" /></button
						>
					</div>
				{/if}

				<main
					bind:this={captureRoot}
					class="flex min-h-0 flex-1 flex-col overflow-clip tablet:overflow-hidden"
					data-hydrated={hydrated || undefined}
				>
					{@render children()}
				</main>
			</div>
			{#snippet footer()}
				<!-- Phones: the page's end clears the floating table button. -->
				<div class="shrink-0 {table ? 'max-tablet:pb-[80px]' : ''}">
					<FullscreenFooter
						{isFullscreen}
						onenterfullscreen={() => toggleFullscreenMode(isFullscreen)}
					/>
				</div>
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>

{#if pngSnapshot}
	<PngExport snapshot={pngSnapshot} onclose={() => (pngSnapshot = null)} />
{/if}

{#if table}
	<!-- Phones: the view's table floats at the bottom middle, a fixed target
	     whatever the range pill's width; it opens the table in a sheet
	     (`TrackerSplitLayout`), and slides down out of view while the table
	     is open, back up once it closes. -->
	<button
		type="button"
		onclick={table.onopen}
		aria-haspopup="dialog"
		inert={table.open}
		data-testid="tracker-table-button"
		data-open={table.open}
		class="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-40 flex h-[48px] -translate-x-1/2 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-warm-grey bg-white pl-4 pr-5 text-sm font-semibold text-dark-grey shadow-[0_10px_24px_-10px_rgba(53,53,53,0.5)] transition-transform duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none tablet:hidden {table.open
			? 'translate-y-[calc(100%+48px)]'
			: ''}"
	>
		<Table2 class="size-[18px] shrink-0 text-mid-grey" strokeWidth={1.75} aria-hidden="true" />
		{table.label}
	</button>
{/if}

<TrackerFilterSheet
	open={filtersOpen}
	onclose={() => (filtersOpen = false)}
	region={session.selection.region}
	{regionSelect}
	onregionchange={(value) => session.select('region', value)}
	{controls}
/>

<DownloadDataModal {downloads} />

<ShortcutsToast
	visible={showShortcuts}
	ondismiss={() => (showShortcuts = false)}
	shortcuts={pageShortcuts(shortcuts, { navMenu: isFullscreen, fullscreen: !belowTablet.current })}
/>

<style>
	/* Switching views is a route change: the switcher holds still across the
	   view transition while its thumb slides like the in-page switch does. */
	:global(::view-transition-group(tracker-view-switch-thumb)) {
		animation-duration: 200ms;
		animation-timing-function: ease-out;
	}
</style>
