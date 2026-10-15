<script>
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import {
		createChartHeaderHost,
		setChartHeaderHost
	} from '$lib/components/charts/v2/chart-header-host.svelte.js';
	import ChartHeaderUnit from '$lib/components/charts/v2/ChartHeaderUnit.svelte';
	import ChartOptionsMenu from '$lib/components/charts/v2/ChartOptionsMenu.svelte';
	import ChartPanZoomButtons from '$lib/components/charts/v2/ChartPanZoomButtons.svelte';
	import Download from '@lucide/svelte/icons/download';
	import GitCompareArrows from '@lucide/svelte/icons/git-compare-arrows';
	import Info from '@lucide/svelte/icons/info';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import Table2 from '@lucide/svelte/icons/table-2';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { OptionsMenu, OptionsMenuItem } from '$lib/components/ui/options-menu';
	import { hasTouchControls } from '$lib/components/ui/touch-controls.js';
	import ChartDataTable from './ChartDataTable.svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';
	import { downloadStatus } from './chart-downloads.js';
	import { getChartDownloads, chartDownload } from './chart-downloads.svelte.js';

	/**
	 * ChartCard — the shared chart card (the Tracker's and facility pages'): one header over
	 * the chart body, with the engaged pan/zoom border treatment. The header:
	 *
	 * - Row 1: the chart's options (a sliders icon), the title, then the chart's own title
	 *   and unit; on the right the card's actions (table view, CSV, Enlarge)
	 *   and the chart's pan/zoom (✥, − / +; the zoom buttons stay while
	 *   pan/zoom is engaged). The chart inside hands its toolbar over through a chart header host (`chart-header-host.svelte.js`), so
	 *   the card draws one header instead of a header over a grey bar.
	 * - Row 2, when given: `controls`, on the right — options (`CardToggle`)
	 *   before the chart switchers (compact `SwitchTabs`) — wrapping as needed.
	 * - `status` under both (the reading freshness line).
	 *
	 * The `legend` (`SeriesLegend`, or a colour scale), when given, sits under
	 * the chart in the card's footer. (The Tracker passes none while its table,
	 * which keys the colours, is open.)
	 *
	 * In a touch-controls subtree (`touch-controls.js`, the Tracker), phones
	 * get room for the title: the card's actions (Compare, the table, CSV,
	 * Enlarge) fold into a ⋮ menu at the header's end, after the zoom buttons.
	 * The actions swap by CSS, so the server render is right at every width.
	 *
	 * `info` puts an ⓘ after the title whose tooltip explains the chart (and
	 * links to more, with `href`). `shortTitle` stands in for the title on
	 * phones (below 768px, by CSS); labels naming the card keep the full one.
	 *
	 * `mini` styles a small multiple (radial and heatmap cards): a smaller
	 * title and a padded body. `onexpand` adds an Enlarge button (the radial
	 * cards' lightbox). `highlighted` darkens the border like the engaged
	 * treatment: the hovered card whose row or column the table is
	 * highlighting. `onhover` reports the pointer entering (true) and leaving
	 * (false) the card.
	 *
	 * `download` lists the card in the page's "Download data" dialog while it
	 * is mounted (`chart-downloads.svelte.js`): the chart's data as drawn,
	 * built on click. Its id and label default to the PNG export's, then the
	 * title. It also gives the header a CSV button and a table view: the same
	 * dataset as a table over the chart, mounted only while toggled on (the
	 * chart stays mounted underneath, so its data and viewport carry on).
	 *
	 * `compare` gives the card a compare mode (`chart-compare.js`): a Compare
	 * button in the header, and while it is on the chart tweens to half its
	 * height (at least `COMPARE_MIN_PX`) as `compare.panel` slides down inside
	 * the card, under the chart. The halved height is a resizable size of its
	 * own (`<heightStorageKey>-compare`), so switching compare off returns the
	 * chart to its height. A card whose height is its content (no
	 * `heightStorageKey`) keeps it; its panel just slides in.
	 *
	 * Owns the drag-to-resize height so the five-dot handle sits OUTSIDE the
	 * card container, between cards. The height is passed to `children` as a
	 * snippet parameter and persists to localStorage under `heightStorageKey`
	 * (share one key across a split pair so toggling keeps the chosen height).
	 * Until resized, the card follows its default as it changes: `defaultHeightPx`,
	 * or taller to fill `fillHeightPx` (the space for the card and its handle).
	 *
	 * @type {{
	 *   title: string,
	 *   shortTitle?: string,
	 *   info?: {text: string, href?: string},
	 *   mini?: boolean,
	 *   badge?: string,
	 *   png?: {id: string, label: string, ready: boolean, caption?: string},
	 *   download?: Omit<import('./types.js').DownloadSource, 'id' | 'label'> & {id?: string, label?: string},
	 *   engaged?: boolean,
	 *   highlighted?: boolean,
	 *   loading?: boolean,
	 *   heightStorageKey?: string,
	 *   defaultHeightPx?: number,
	 *   fillHeightPx?: number,
	 *   minHeightPx?: number,
	 *   maxHeightPx?: number,
	 *   controls?: import('svelte').Snippet,
	 *   legend?: import('svelte').Snippet,
	 *   compare?: {open: boolean, onopenchange: (open: boolean) => void,
	 *     panel: import('svelte').Snippet},
	 *   onexpand?: () => void,
	 *   onhover?: (hovered: boolean) => void,
	 *   status?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet<[number]>
	 * }}
	 */
	let {
		title,
		shortTitle = undefined,
		info,
		mini = false,
		badge = '',
		png,
		download,
		engaged = false,
		highlighted = false,
		loading = false,
		heightStorageKey = '',
		defaultHeightPx = 260,
		fillHeightPx = 0,
		minHeightPx = 120,
		maxHeightPx = 800,
		controls,
		legend,
		compare,
		onexpand,
		onhover,
		status,
		children
	} = $props();

	const height = createDockedPanel({
		axis: 'y',
		initial: () => Math.max(defaultHeightPx, fitHeightPx),
		min: () => minHeightPx,
		max: () => maxHeightPx,
		storageKey: untrack(() => heightStorageKey) || undefined
	});

	const headerHost = setChartHeaderHost(createChartHeaderHost());
	let hosted = $derived(headerHost.current);

	const downloads = getChartDownloads();
	let downloadId = $derived(download?.id ?? png?.id ?? title);
	/** The card's download, read live by the dialog, the CSV button and the table.
	 * @type {import('./types.js').DownloadSource} */
	const source = {
		get id() {
			return downloadId;
		},
		get label() {
			return download?.label ?? png?.label ?? title;
		},
		get state() {
			return download?.state ?? 'loading';
		},
		get message() {
			return download?.message;
		},
		dataset: () => download?.dataset() ?? null,
		get fileName() {
			return download?.fileName;
		}
	};
	const registerDownload = chartDownload(downloads, () => source);
	// Read once per change: a source's state can take real work to answer.
	let downloadState = $derived(source.state);
	let ready = $derived(downloadState === 'ready');
	let downloadMessage = $derived(downloadStatus({ state: downloadState, message: source.message }));

	let tableShown = $state(false);
	let tableDataset = $derived(tableShown && ready ? source.dataset() : null);
	function toggleTable() {
		tableShown = !tableShown;
		// The chart is covered: release pan/zoom so the wheel scrolls the table.
		if (tableShown && hosted?.panZoomEngaged) hosted.onpanzoomtoggle();
	}

	/** The handle (or spacer) under the card: `h-4`. */
	const HANDLE_PX = 16;
	/** The card's height beyond its chart: header, padding, a readout strip
	 * (not a compare panel, which comes and goes). */
	let chromePx = $state(0);
	/** The chart height that fits the card and its handle into `fillHeightPx`. */
	let fitHeightPx = $derived(fillHeightPx && chromePx ? fillHeightPx - chromePx - HANDLE_PX : 0);

	/** A comparing chart's height: half the card's, at least COMPARE_MIN_PX. */
	const COMPARE_MIN_PX = 160;
	/** The chart's tween and the panel's slide run together. */
	const COMPARE_MOTION_MS = 220;
	const compareStorageKey = untrack(() => heightStorageKey);
	const compareHeight = createDockedPanel({
		axis: 'y',
		initial: () => Math.max(COMPARE_MIN_PX, Math.round(height.size / 2)),
		min: () => minHeightPx,
		max: () => maxHeightPx,
		storageKey: compareStorageKey ? `${compareStorageKey}-compare` : undefined
	});
	let comparing = $derived(!!compare?.open);
	// On touch screens the gap between cards stays a gap: a swipe landing in
	// it would resize the card above instead of scrolling the page.
	const coarsePointer = new MediaQuery('(pointer: coarse)');
	const touch = hasTouchControls();
	let hasActions = $derived(!!compare || !!(download && downloads) || !!onexpand);

	/** Only a resizable chart halves; a content-height card keeps its size. */
	let resizer = $derived(comparing && heightStorageKey ? compareHeight : height);
	const shownHeight = new Tween(
		untrack(() => resizer.size),
		{ easing: cubicOut }
	);
	let wasComparing = untrack(() => comparing);
	// Switching compare mode tweens the chart beside the panel's slide; every
	// other change (a drag, a restored size, a new default) lands at once.
	$effect(() => {
		const target = resizer.size;
		const animate = comparing !== wasComparing && !prefersReducedMotion.current;
		wasComparing = comparing;
		shownHeight.set(target, { duration: animate ? COMPARE_MOTION_MS : 0 });
	});
	let heightPx = $derived(Math.round(shownHeight.current));
	const comparePanelId = $props.id();
	/** @type {HTMLElement | undefined} */
	let comparePanel = $state();

	/** Measured after layout, so the chart height read is the one drawn.
	 * @type {import('svelte/attachments').Attachment<HTMLElement>} */
	function measureChrome(section) {
		const observer = new ResizeObserver(() => {
			chromePx = section.offsetHeight - heightPx - (comparePanel?.offsetHeight ?? 0);
		});
		observer.observe(section);
		return () => observer.disconnect();
	}

	/** The header's icon buttons: the same 28px square as the chart's pan/zoom buttons. */
	const ACTION =
		'touch-hit inline-flex size-[28px] shrink-0 items-center justify-center rounded-md transition-colors';
	const ACTION_IDLE =
		'text-mid-grey hover:bg-warm-grey hover:text-dark-grey disabled:cursor-not-allowed disabled:text-mid-warm-grey disabled:hover:bg-transparent';
</script>

{#snippet titleText()}
	{#if shortTitle}
		<span class="max-tablet:hidden">{title}</span><span class="tablet:hidden">{shortTitle}</span>
	{:else}
		{title}
	{/if}
{/snippet}

<div
	class="chart-card group/card"
	role="presentation"
	onpointerenter={onhover && (() => onhover(true))}
	onpointerleave={onhover && (() => onhover(false))}
>
	<!-- Subtle border at rest; under the pointer (the card or its resize
	     handle) a soft shadow and a step darker border, while every other
	     card on the page dims a little (see <style>); dark when pan/zoom is
	     engaged or the card is highlighted. The chart and its
	     options bar sit flush against the container edges. overflow-hidden at
	     every width — the flush chart would otherwise paint over the bottom
	     corner radius. Floating tooltips stay within the chart area. A mini
	     card pads its header and body instead, like the scenarios' mini
	     charts. -->
	<section
		{@attach fillHeightPx ? measureChrome : undefined}
		{@attach download ? registerDownload : undefined}
		data-chart-png={png ? JSON.stringify(png) : undefined}
		data-chart-download={download ? downloadId : undefined}
		class="relative overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow,opacity] duration-200 ease-out group-hover/card:z-10 group-hover/card:shadow-[0_10px_28px_-14px_rgba(53,53,53,0.45)] {highlighted ||
		(engaged && !mini)
			? 'border-dark-grey'
			: mini
				? 'border-warm-grey group-hover/card:border-mid-grey/40'
				: 'border-mid-warm-grey/40 group-hover/card:border-mid-grey/50'}"
	>
		<!-- A container, so narrow cards (phones) let a long title wrap to two
		     lines between the options button and its unit, all on one row,
		     instead of truncating to a word. -->
		<header
			class="@container relative z-20 flex flex-col gap-2 border-b bg-linear-to-br from-warm-grey via-warm-grey/50 to-light-warm-grey px-4 py-2.5 {mini
				? 'border-warm-grey'
				: 'border-mid-warm-grey/40'}"
		>
			<div class="flex min-h-[28px] items-center gap-3">
				<div
					class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5 @max-[440px]:flex-nowrap"
				>
					{#if hosted?.showOptions && !tableShown}
						<!-- Pulled towards the edge and the title: the icon, not its hit area, lines up. -->
						<span class="-ml-1.5 -mr-1.5 flex">
							<ChartOptionsMenu chart={hosted.chart} size="md" />
						</span>
					{/if}
					<h3
						class="m-0 truncate font-semibold leading-tight text-dark-grey @max-[440px]:line-clamp-2 @max-[440px]:min-w-0 @max-[440px]:whitespace-normal {mini
							? 'text-sm'
							: 'text-base'}"
					>
						{#if info}
							<Tooltip
								text={info.text}
								learnMoreHref={info.href}
								tapToOpen
								class="inline-flex cursor-help items-center gap-1"
							>
								{@render titleText()}
								<Info class="size-4 text-mid-grey" aria-hidden="true" />
							</Tooltip>
						{:else}
							{@render titleText()}
						{/if}
					</h3>
					{#if hosted}
						<span class="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
							{#if hosted.chart.title}
								<span class="font-space text-xxs uppercase tracking-wide text-mid-grey"
									>{hosted.chart.title}</span
								>
							{/if}
							<ChartHeaderUnit chart={hosted.chart} />
						</span>
					{/if}
					{#if badge}
						<span
							class="self-center rounded bg-light-warm-grey px-2 py-0.5 font-mono text-xxs text-mid-grey"
						>
							{badge}
						</span>
					{/if}
				</div>
				<div class="-mr-1.5 flex shrink-0 items-center gap-0.5">
					<!-- Phones (touch subtrees): these fold into the ⋮ menu below. -->
					<div class="contents {touch ? 'max-tablet:hidden' : ''}">
						{#if compare}
							<Tooltip
								text={comparing ? 'Close comparison' : 'Compare two dates'}
								class="inline-flex"
							>
								<button
									type="button"
									class="{ACTION} {comparing
										? 'bg-dark-grey text-white hover:bg-black'
										: ACTION_IDLE}"
									aria-pressed={comparing}
									aria-expanded={comparing}
									aria-controls={comparePanelId}
									aria-label="Compare {title}"
									onclick={() => compare.onopenchange(!comparing)}
								>
									<GitCompareArrows class="size-[15px]" aria-hidden="true" />
								</button>
							</Tooltip>
						{/if}
						{#if download && downloads}
							<Tooltip text={tableShown ? 'Show chart' : 'Show table'} class="inline-flex">
								<button
									type="button"
									class="{ACTION} {tableShown
										? 'bg-dark-grey text-white hover:bg-black'
										: ACTION_IDLE}"
									aria-pressed={tableShown}
									aria-label="Show table"
									onclick={toggleTable}
								>
									<Table2 class="size-[15px]" aria-hidden="true" />
								</button>
							</Tooltip>
							<Tooltip
								text={ready ? 'Download CSV' : `Download CSV — ${downloadMessage}`}
								class="inline-flex"
							>
								<button
									type="button"
									class="{ACTION} {ACTION_IDLE}"
									aria-label="Download {source.label} CSV"
									disabled={!ready}
									onclick={() => downloads.csv(source)}
								>
									<Download class="size-[15px]" aria-hidden="true" />
								</button>
							</Tooltip>
						{/if}
						{#if onexpand}
							<Tooltip text="Enlarge" class="inline-flex">
								<button
									type="button"
									class="{ACTION} {ACTION_IDLE}"
									aria-label="Enlarge {title}"
									onclick={onexpand}
								>
									<Maximize2 class="size-[15px]" aria-hidden="true" />
								</button>
							</Tooltip>
						{/if}
					</div>
					{#if hosted && !tableShown && (hosted.showPanZoomToggle || hosted.onzoomin)}
						<!-- Phones (touch subtrees) have no actions to divide from. -->
						<div
							class="mx-0.5 h-4 w-px bg-mid-warm-grey/60 {touch ? 'max-tablet:hidden' : ''}"
							aria-hidden="true"
						></div>
						<ChartPanZoomButtons
							onzoomin={hosted.onzoomin}
							onzoomout={hosted.onzoomout}
							isAtMinZoom={hosted.isAtMinZoom}
							isAtMaxZoom={hosted.isAtMaxZoom}
							showPanZoomToggle={hosted.showPanZoomToggle}
							panZoomEngaged={hosted.panZoomEngaged}
							onpanzoomtoggle={hosted.onpanzoomtoggle}
							keepZoomWhileEngaged
							size="md"
						/>
					{/if}
					{#if touch && hasActions}
						<div class="flex tablet:hidden">
							<OptionsMenu
								label="{title} actions"
								showDocumentation={false}
								triggerClass="{ACTION} {ACTION_IDLE}"
								iconClass="size-[18px]"
							>
								{#snippet sections({ close })}
									{#if compare}
										<OptionsMenuItem
											icon={GitCompareArrows}
											aria-pressed={comparing}
											onclick={() => {
												close();
												compare.onopenchange(!comparing);
											}}>{comparing ? 'Close comparison' : 'Compare two dates'}</OptionsMenuItem
										>
									{/if}
									{#if download && downloads}
										<OptionsMenuItem
											icon={Table2}
											aria-pressed={tableShown}
											onclick={() => {
												close();
												toggleTable();
											}}>{tableShown ? 'Show chart' : 'Show table'}</OptionsMenuItem
										>
										<OptionsMenuItem
											icon={Download}
											disabled={!ready}
											onclick={() => {
												close();
												downloads.csv(source);
											}}
											>{ready
												? 'Download CSV'
												: `Download CSV — ${downloadMessage}`}</OptionsMenuItem
										>
									{/if}
									{#if onexpand}
										<OptionsMenuItem
											icon={Maximize2}
											onclick={() => {
												close();
												onexpand();
											}}>Enlarge</OptionsMenuItem
										>
									{/if}
								{/snippet}
							</OptionsMenu>
						</div>
					{/if}
				</div>
			</div>
			{#if controls}
				<!-- The options and switchers, on the right. -->
				<div class="flex flex-wrap items-center justify-end gap-2">
					{@render controls()}
				</div>
			{/if}
			{#if status}{@render status()}{/if}
		</header>
		<!-- Bottom breathing room so the date labels stay clear of the border. -->
		<div class="relative {mini ? 'pb-6' : 'pb-3'}" aria-busy={loading}>
			<div class:invisible={tableShown} inert={tableShown}>
				{@render children(heightPx)}
			</div>
			{#if tableShown}
				<div class="absolute inset-0 bg-white">
					<ChartDataTable
						dataset={tableDataset}
						label={source.label}
						timeZone={downloads?.timeZone ?? '+10:00'}
						status={downloadMessage}
					/>
				</div>
			{/if}
			<LoadingOverlay active={loading} />
		</div>
		{#if legend}
			<footer
				class="border-t bg-light-warm-grey/60 px-4 py-3 {mini
					? 'border-warm-grey'
					: 'border-mid-warm-grey/40'}"
			>
				{@render legend()}
			</footer>
		{/if}
		{#if compare && comparing}
			<div
				bind:this={comparePanel}
				id={comparePanelId}
				role="region"
				aria-label="{title} comparison"
				class="border-t {mini ? 'border-warm-grey' : 'border-mid-warm-grey/40'}"
				transition:slide={{
					duration: prefersReducedMotion.current ? 0 : COMPARE_MOTION_MS,
					easing: cubicOut
				}}
			>
				{@render compare.panel()}
			</div>
		{/if}
	</section>

	{#if heightStorageKey && !coarsePointer.current}
		<!-- Fills the entire gap to the next card (the column has no space-y),
		     so the whole gap is the drag target; rounded like the cards. -->
		<DragHandle
			axis="y"
			onstart={resizer.start}
			onkeydown={resizer.keydown}
			tabindex={0}
			aria-valuemin={minHeightPx}
			aria-valuemax={maxHeightPx}
			aria-valuenow={Math.round(resizer.size)}
			active={resizer.dragging}
			alwaysShowGrip
			class="h-4 rounded-md"
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize chart height"
		/>
	{:else}
		<!-- Same rhythm as the handle gap for cards whose height is their content. -->
		<div class="h-4" aria-hidden="true"></div>
	{/if}
</div>

<style>
	/* While the pointer is on a chart card, its sibling cards dim a little,
	   so the one being read stands forward. Scoped to the cards' parent, so a
	   hover elsewhere on the page re-checks nothing. Only where the pointer
	   can hover: a tap would leave iOS's sticky :hover dimming the rest. */
	@media (hover: hover) {
		:global(:has(> .chart-card:hover) > .chart-card:not(:hover) > section) {
			opacity: 0.7;
		}
	}
</style>
