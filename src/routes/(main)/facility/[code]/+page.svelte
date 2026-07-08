<script>
	import { onMount, tick, untrack } from 'svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { LineChart } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import { urlFor } from '$lib/sanity';
	import { OG_CARD_WIDTH, OG_CARD_HEIGHT, OG_CARD_TYPE } from '$lib/og/card-dimensions.js';
	import {
		FacilityChart,
		FacilityPriceChart,
		FacilityMarketValueChart,
		FacilityFinancialDataProvider,
		FacilityEmissionsIntensityChart,
		FacilityEmissionsVolumeChart,
		FacilityEmissionsDataProvider,
		FacilityPollutionPanel,
		FacilityMetrics
	} from '$lib/components/charts/facility';
	import { formatDateRange, ChartRangeBar } from '$lib/components/charts/v2';
	import FacilityPanelHeader from '../../facilities/_components/FacilityPanelHeader.svelte';
	import { withMarkedUnits, canSplitBatteryUnits } from '../../facilities/_utils/units';

	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import { MIN_DATE, getEarliestDate } from '$lib/utils/date-range';
	import { primaryFuelTechColour } from '$lib/utils/fueltech-display';
	import { createDragHandler } from '$lib/components/ui/panel/drag-resize.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';

	import FacilityInfoPanel from './_components/FacilityInfoPanel.svelte';
	import FacilityUnitsPanel from './_components/FacilityUnitsPanel.svelte';
	import FacilityMediaPanel from './_components/FacilityMediaPanel.svelte';
	import FacilityMobileNav from './_components/FacilityMobileNav.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import {
		CHARTS_FRACTION_COOKIE,
		CHARTS_FRACTION_MIN,
		CHARTS_FRACTION_MAX
	} from './_utils/charts-fraction.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	// Drop derived battery splits + mark commissioning units (same processing the
	// /facilities page applies); shared with the /facilities detail panel.
	let selectedFacility = $derived(withMarkedUnits(data.facility));

	/** Battery view: 'net' shows the bidirectional battery unit, 'split' swaps in
	 *  the derived charging/discharging units. Charts + units panel follow
	 *  `activeFacility`; identity consumers (header, metrics, meta, map) stay on
	 *  the net `selectedFacility` so they're stable across mode flips. */
	/** @type {'net' | 'split'} */
	let batteryMode = $state('net');
	let canSplitBattery = $derived(canSplitBatteryUnits(data.facility));
	let splitFacility = $derived(
		canSplitBattery ? withMarkedUnits(data.facility, { batteryView: 'split' }) : null
	);
	let activeFacility = $derived.by(() =>
		batteryMode === 'split' && splitFacility ? splitFacility : selectedFacility
	);

	/** Unit codes toggled off in the units panel — hidden from the chart stacks. */
	/** @type {string[]} */
	let hiddenUnitCodes = $state([]);

	/** @param {string} code */
	function toggleUnitHidden(code) {
		if (hiddenUnitCodes.includes(code)) {
			hiddenUnitCodes = hiddenUnitCodes.filter((c) => c !== code);
			return;
		}
		const next = [...hiddenUnitCodes, code];
		// Hiding the last visible unit resets to all-visible, mirroring
		// ChartStore.toggleSeriesVisibility's hide-all guard.
		hiddenUnitCodes = next.length >= (activeFacility?.units?.length ?? 0) ? [] : next;
	}

	/** @param {string} mode */
	function setBatteryMode(mode) {
		if (mode === batteryMode) return;
		batteryMode = /** @type {'net' | 'split'} */ (mode);
		// Unit codes differ between the net and split sets.
		hiddenUnitCodes = [];
	}

	let timeZone = $derived(data.timeZone);
	let rangeDays = $derived(data.rangeDays ?? 3);

	let defaultEnd = $derived(data.retiredEndMs ?? Date.now());
	let defaultStart = $derived(defaultEnd - rangeDays * 24 * 60 * 60 * 1000);

	let dateStart = $derived(toNetworkDateString(defaultStart, timeZone));
	let dateEnd = $derived(toNetworkDateString(defaultEnd, timeZone));

	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** Visible-range data feeding the metrics section (and, for coal, the units
	 *  panel's availability bars). summaryData (energy + market value) comes from
	 *  the financial provider, emissionsData (reported tCO₂) from the emissions
	 *  provider, intervalData (raw power) from the generation chart. All are keyed
	 *  on viewStart/viewEnd so the numbers track the chart's date range. */
	/** @type {{ mvData: any[], energyData: any[], mvSeriesNames: string[], energySeriesNames: string[] } | null} */
	let summaryData = $state(null);
	/** @type {{ rows: any[], seriesNames: string[] } | null} */
	let emissionsData = $state(null);
	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let intervalData = $state(null);

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let powerChart = $state(undefined);

	let hasNpi = $derived(Boolean(selectedFacility?.npi_id));

	// Facility location for the mobile Map tab (mirrors FacilityMediaPanel's source).
	let mapLocation = $derived(selectedFacility?.location ?? data.sanityFacility?.location ?? null);
	let hasLocation = $derived(
		Boolean(
			mapLocation && typeof mapLocation.lat === 'number' && typeof mapLocation.lng === 'number'
		)
	);
	let mapOsmWayId = $derived(data.sanityFacility?.osm_way_id ?? null);
	let mapColor = $derived(primaryFuelTechColour(selectedFacility?.units));

	/** Whether any unit on this facility actually emits CO₂. Drives whether
	 *  the Emissions card renders. Renewables/storage facilities skip the
	 *  emissions provider entirely so no emissions-only fetch fires. */
	let hasEmittingUnits = $derived(
		Boolean(
			selectedFacility?.units?.some(
				(/** @type {any} */ u) => Number(u.emissions_factor_co2) > 0 && u.dispatch_type !== 'LOAD'
			)
		)
	);

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let dateRangeLabel = $derived.by(() => {
		const start = viewStart || defaultStart;
		const end = viewEnd || defaultEnd;
		return formatDateRange(new Date(start), new Date(end), ianaTimeZone);
	});

	/** Shared hover time — syncs crosshair/tooltip across all three charts. */
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** Shared pan/zoom engagement across the stacked charts. */
	let panZoomEngaged = $state(false);

	/** Which chart of the Market pair to show. Default: price (the derived
	 *  $/MWh line — what most viewers come to a facility page for). */
	/** @type {'price' | 'mv'} */
	let activeMarketTab = $state('price');

	/** Which chart of the Emissions pair to show. Default: intensity
	 *  (kgCO₂e/MWh line — the headline emissions measure). */
	/** @type {'intensity' | 'volume'} */
	let activeEmissionsTab = $state('intensity');

	/** Earliest data point across the facility's units, used as the floor for
	 *  the date picker and the "All" preset. */
	let earliestDate = $derived(getEarliestDate(selectedFacility?.units ?? []));

	/** Range/interval/preset state machine (metric switching, hysteresis, picker
	 *  dates, echo-suppressed viewport pushes into the generation chart) —
	 *  shared with the unit detail sheet via createChartRangeControl. The
	 *  viewport values stay in this component (`viewStart`/`viewEnd`); the
	 *  controller reads and stores them through the getters below. */
	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: defaultStart, end: defaultEnd }),
		setViewport: (startMs, endMs) => {
			viewStart = startMs;
			viewEnd = endMs;
		},
		chart: () => powerChart,
		timeZone: () => timeZone,
		earliestDate: () => earliestDate,
		initialRangeDays: data.rangeDays ?? 3
	});

	$effect(() => {
		return () => range.dispose();
	});

	// Each of these sections renders as its own card at every breakpoint. One
	// definition so the treatment can't drift between sections. md:overflow-visible
	// lets chart floating tooltips escape the card on desktop.
	const sectionCardClass =
		'overflow-hidden rounded-lg border border-mid-warm-grey/40 bg-white md:overflow-visible';

	/** @type {HTMLElement | undefined} */
	let chartCardEl = $state(undefined);

	/** @type {HTMLElement | undefined} */
	let splitContainerEl = $state(undefined);
	let isMobile = $state(false);

	/** Which section the mobile bottom-nav shows below the (always-visible) hero.
	 *  Desktop ignores this: the section toggles use `max-md:hidden`, which is
	 *  inert at and above the md breakpoint, so the resizable split is unchanged.
	 *  @type {'charts' | 'units' | 'map' | 'about'} */
	let activeTab = $state('charts');

	/** The page's scroll container — bound so `selectTab` can reveal a tab from
	 *  the top of its content. */
	/** @type {HTMLElement | undefined} */
	let scrollEl = $state(undefined);

	/** Measured height of the bottom nav, so the full-bleed Map tab can fill the
	 *  space between the header and the nav exactly. */
	let navHeight = $state(0);

	/** Measured live so the sidebar can stick just below the header. */
	let headerHeight = $state(0);

	// First facility photo as the mobile header banner (raw CDN URL — the
	// header applies its own transform params). Desktop keeps the colour wash.
	let headerPhotoUrl = $derived.by(() => {
		const photo = data.sanityFacility?.photos?.[0];
		return photo?.asset ? urlFor(photo).url() : null;
	});

	// Resizable split between the main card and the sidebar; persisted to a cookie.
	const splitDrag = createDragHandler({
		axis: 'x',
		min: CHARTS_FRACTION_MIN,
		max: CHARTS_FRACTION_MAX,
		initial: data.chartsFraction,
		scale: () => splitContainerEl?.clientWidth ?? 1,
		persist: {
			// The page is prerendered, so the server can't read the cookie — restore the
			// user's split client-side. Falls back to the server default during SSR/build.
			read: () => {
				if (typeof document === 'undefined') return data.chartsFraction;
				const m = document.cookie.match(
					new RegExp('(?:^|; )' + CHARTS_FRACTION_COOKIE + '=([^;]*)')
				);
				if (m) {
					const v = parseFloat(decodeURIComponent(m[1]));
					if (Number.isFinite(v)) return v;
				}
				return data.chartsFraction;
			},
			write: (v) => {
				if (typeof document === 'undefined') return;
				// 1 year, scoped to the site root so the cookie travels with SSR navigations.
				document.cookie = `${CHARTS_FRACTION_COOKIE}=${v}; path=/; max-age=31536000; SameSite=Lax`;
			}
		}
	});

	// The split width is applied via a CSS var consumed only at `md:` and up, so
	// mobile is full-width from the first paint (no dependence on the async
	// `isMobile` flag, which would otherwise render the desktop split % briefly).
	let splitWidth = $derived(`${splitDrag.value * 100}%`);

	onMount(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const update = (/** @type {MediaQueryListEvent} */ e) => (isMobile = e.matches);
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	/** Switch the mobile tab and reveal it from the top: scroll just past the hero
	 *  so the section's content starts at the top, while the header stays reachable
	 *  by scrolling back up. `tick()` lets the newly-shown section lay out first so
	 *  the scroll target isn't clamped short.
	 *  @param {'charts' | 'units' | 'map' | 'about'} tab */
	async function selectTab(tab) {
		activeTab = tab;
		await tick();
		scrollEl?.scrollTo({ top: headerHeight });
	}

	// Whether the default range preset has been applied for the current facility's
	// chart (see handlePowerLoadComplete). Reset on facility change so each new
	// facility re-applies it.
	let rangeApplied = false;

	$effect(() => {
		// Reset chart-viewport-driven state when the underlying facility changes.
		const _code = data.facility?.code;
		// Land each facility on its Charts tab so navigation never strands you.
		activeTab = 'charts';
		range.reset();
		panZoomEngaged = false;
		rangeApplied = false;
		// Reset client-side load tracking so the new facility shows its skeleton until
		// its own chart fetch settles.
		powerLoaded = false;
		powerHasData = false;
		// Drop stale metrics data so the new facility recomputes from its own range.
		summaryData = null;
		emissionsData = null;
		intervalData = null;
		// Battery view + unit toggles are per-facility state. A ?unit= deep link
		// naming a derived split unit opens in split view (it only exists there).
		hiddenUnitCodes = [];
		batteryMode = untrack(() => {
			const unitParam = page.url.searchParams.get('unit');
			if (!unitParam || !canSplitBattery) return 'net';
			const inNet = selectedFacility?.units?.some((/** @type {any} */ u) => u.code === unitParam);
			const inSplit = splitFacility?.units?.some((/** @type {any} */ u) => u.code === unitParam);
			return !inNet && inSplit ? 'split' : 'net';
		});
	});

	// The page is prerendered with no power data, so the generation chart self-fetches
	// on mount (FacilityChart seeds from `dateStart`/`dateEnd` when given no
	// `powerData`). We surface a skeleton until it reports back via `onloadcomplete`,
	// then reveal the chart — or, only once the fetch confirms there's genuinely
	// nothing, the empty state.
	let powerLoaded = $state(false);
	let powerHasData = $state(false);
	let chartReady = $derived(powerLoaded && powerHasData);
	let showEmptyState = $derived(powerLoaded && !powerHasData);

	/** @param {{ hasData: boolean }} state */
	function handlePowerLoadComplete({ hasData }) {
		// The chart self-seeds a day-snapped window on load. Once it's settled,
		// apply the default preset through the normal path (before reveal, so no
		// visible jump): this sets the exact rolling window — so the view matches a
		// later 3D click instead of trimming — and marks the preset selected (the
		// setViewport echo is suppressed, so it isn't cleared).
		if (!rangeApplied) {
			rangeApplied = true;
			range.handleRangeSelect(rangeDays);
		}
		powerLoaded = true;
		powerHasData = hasData;
		range.settle();
	}

	/** Static skeleton bar heights (%) — a calm placeholder while the chart loads. */
	const SKELETON_BARS = [42, 64, 50, 78, 56, 70, 46, 84, 60, 74, 52, 88, 66, 54, 72, 48, 80];

	/** @param {KeyboardEvent} e */
	function handlePanZoomKeydown(e) {
		if (e.key === 'Escape' && panZoomEngaged) {
			e.preventDefault();
			e.stopPropagation();
			panZoomEngaged = false;
		}
	}

	/** @param {MouseEvent} e */
	function handlePanZoomClickOutside(e) {
		if (!panZoomEngaged || !chartCardEl) return;
		const target = /** @type {Node | null} */ (e.target);
		if (target && !chartCardEl.contains(target)) {
			panZoomEngaged = false;
		}
	}
</script>

<svelte:window onkeydown={handlePanZoomKeydown} onclick={handlePanZoomClickOutside} />

<Meta
	title={selectedFacility?.name ?? 'Facility'}
	description={data.ogDescription}
	image={data.ogImage}
	imageWidth={OG_CARD_WIDTH}
	imageHeight={OG_CARD_HEIGHT}
	imageType={OG_CARD_TYPE}
	path={`/facility/${data.facility?.code ?? ''}`}
/>

<!-- Morph target — pairs with the /facilities detail panel
     (view-transition-name: facility-hero) so the whole panel expands into the
     full page on navigation. -->
<div
	bind:this={scrollEl}
	class="flex-1 min-h-0 overflow-y-auto bg-light-warm-grey"
	style:view-transition-name="facility-hero"
>
	{#snippet mobileHeaderSpacer()}
		<!-- Clears the floating back/options buttons (layout chrome) so the
		     fuel-tech badges start below them. -->
		<div class="h-16"></div>
	{/snippet}
	<div class="md:sticky md:top-0 md:z-40" bind:clientHeight={headerHeight}>
		<FacilityPanelHeader
			facility={selectedFacility}
			sanityFacility={data.sanityFacility}
			photoUrl={isMobile ? headerPhotoUrl : null}
			topBar={isMobile ? mobileHeaderSpacer : undefined}
		/>
	</div>
	{#if selectedFacility}
		<div
			class={[
				'p-4 pb-24 space-y-4 md:p-8 md:pb-8 md:space-y-8',
				// On the Map tab collapse to nothing (incl. padding) rather than
				// display:none, so the LayerCake charts inside keep a real size.
				activeTab === 'map' && 'max-md:h-0 max-md:overflow-hidden max-md:p-0'
			]}
			style="--hdr-h: {headerHeight}px; --col-top: calc(var(--hdr-h) + 2rem);"
		>
			<div
				bind:this={splitContainerEl}
				class="flex flex-col gap-4 md:gap-0 md:flex-row md:items-start"
			>
				<!-- Main column — a stack of standalone card panes (range bar, metrics
				     and the three charts). Resizable width; the sidebar takes the
				     remainder. When off the Charts tab on mobile it collapses to h-0
				     (clipped) rather than `display:none`, so the LayerCake charts keep
				     a real width/height and don't warn about a zero-size container. -->
				<div
					class={[
						'w-full min-w-0 md:w-[var(--split-w)] md:shrink-0 md:pr-4',
						splitDrag.isDragging ? '' : 'md:transition-[width] md:duration-200 md:ease-out',
						activeTab !== 'charts' && 'max-md:h-0 max-md:overflow-hidden'
					]}
					style:--split-w={splitWidth}
				>
					<!-- Toolbar + metrics always render; only the charts depend on the fetch. -->
					<div class="space-y-4">
						<!-- Range / date picker — a bare toolbar row, not a card. -->
						<div class="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
							<span class="font-space text-base font-medium text-dark-grey">{dateRangeLabel}</span>
							<ChartRangeBar
								selectedRange={range.selectedRange}
								customDays={range.customDays}
								displayInterval={range.displayInterval}
								startDate={range.pickerStartDate}
								endDate={range.pickerEndDate}
								minDate={MIN_DATE}
								maxDate={range.maxDate}
								{earliestDate}
								showIntervalDropdown={true}
								pending={range.rangeSwitchPending}
								onrangeselect={range.handleRangeSelect}
								ondaterangechange={range.handleDateRangeChange}
								onintervalchange={range.handleIntervalChange}
							/>
						</div>

						<!-- Metrics. Flush grid; the card supplies the outer border. Fed by
							     the providers + generation chart below. -->
						<div class={sectionCardClass}>
							<FacilityMetrics
								facility={selectedFacility}
								sanityFacility={data.sanityFacility}
								summaryData={showEmptyState ? null : summaryData}
								emissionsData={showEmptyState ? null : emissionsData}
								intervalData={showEmptyState ? null : intervalData}
								{timeZone}
								displayInterval={range.displayInterval}
								onpeakhighlight={handleHoverChange}
							/>
						</div>

						<!-- chartCardEl wraps the chart sections (not the range bar / metrics)
							     so pan/zoom click-outside treats clicks between charts as "still
							     engaged" but disengages on a range-bar / metrics click. -->
						<div bind:this={chartCardEl} class="space-y-4">
							<!-- Generation -->
							<section class={sectionCardClass}>
								<div class="flex items-center justify-between gap-4 px-6 pb-1 pt-4">
									<h3 class="m-0 text-sm font-semibold text-dark-grey">Generation</h3>
									<span
										class="rounded bg-light-warm-grey px-2 py-0.5 text-xs uppercase tracking-wider text-dark-grey"
									>
										{getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval}
									</span>
								</div>
								<!-- Chart stays mounted while loading so it self-fetches; it fades
									     in once data arrives, with a skeleton overlaid until then. -->
								<div class="relative">
									<div
										class="transition-opacity duration-500 ease-out {chartReady
											? 'opacity-100'
											: 'opacity-0'}"
									>
										<FacilityChart
											bind:this={powerChart}
											facility={activeFacility}
											powerData={data.powerData}
											{timeZone}
											{dateStart}
											{dateEnd}
											interval={range.activeInterval}
											metric={range.activeMetric}
											displayInterval={range.displayInterval}
											chartHeight="h-[267px]"
											title={range.activeMetric === 'energy' ? 'Energy' : 'Power'}
											tooltipMode="floating"
											showContainer={false}
											{hoverTime}
											onhoverchange={handleHoverChange}
											onviewportchange={range.handleChartViewportChange}
											onloadcomplete={handlePowerLoadComplete}
											onvisibledata={(d) => {
												intervalData = d;
												range.settle();
											}}
											panZoomMode="tap-to-engage"
											bind:panZoomEngaged
											bundleDerivedMetrics
											{hiddenUnitCodes}
										/>
									</div>
									{#if showEmptyState}
										<div
											class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center pointer-events-none"
										>
											<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
												<LineChart size={24} strokeWidth={1.5} />
											</div>
											<p class="m-0 text-sm font-medium text-dark-grey">No data available</p>
										</div>
									{:else if !chartReady}
										<div
											class="absolute inset-0 flex items-end gap-1.5 px-6 pb-6 pt-8 pointer-events-none"
											out:fade={{ duration: 300 }}
											aria-hidden="true"
										>
											{#each SKELETON_BARS as h, i (i)}
												<div
													class="flex-1 rounded-t bg-light-warm-grey animate-pulse"
													style="height: {h}%"
												></div>
											{/each}
										</div>
									{/if}
								</div>
							</section>

							{#if !showEmptyState}
								<FacilityFinancialDataProvider
									facility={activeFacility}
									{timeZone}
									interval={range.activeInterval}
									displayInterval={range.displayInterval}
									{viewStart}
									{viewEnd}
									{hoverTime}
									{hiddenUnitCodes}
									onhoverchange={handleHoverChange}
									onsummarydata={(d) => (summaryData = d)}
									onviewportchange={range.handleDerivedViewportChange}
								>
									<section class={sectionCardClass}>
										<div class="flex items-center justify-between gap-4 px-6 pb-1 pt-4">
											<h3 class="m-0 text-sm font-semibold text-dark-grey">Market</h3>
											<SwitchTabs
												buttons={[
													{ label: 'Price', value: 'price' },
													{ label: 'Market Value', value: 'mv' }
												]}
												selected={activeMarketTab}
												onChange={(v) => (activeMarketTab = /** @type {'price' | 'mv'} */ (v))}
											/>
										</div>
										{#if viewStart && viewEnd}
											{#if activeMarketTab === 'price'}
												<FacilityPriceChart
													showContainer={false}
													panZoomMode="tap-to-engage"
													bind:panZoomEngaged
												/>
											{:else}
												<FacilityMarketValueChart
													showContainer={false}
													panZoomMode="tap-to-engage"
													bind:panZoomEngaged
												/>
											{/if}
										{/if}
									</section>
								</FacilityFinancialDataProvider>

								{#if hasEmittingUnits}
									<!-- Hidden for non-emitting facilities so no emissions fetch fires. -->
									<FacilityEmissionsDataProvider
										facility={activeFacility}
										{timeZone}
										interval={range.activeInterval}
										displayInterval={range.displayInterval}
										{viewStart}
										{viewEnd}
										{hoverTime}
										{hiddenUnitCodes}
										onhoverchange={handleHoverChange}
										onsummarydata={(d) => (emissionsData = d)}
										onviewportchange={range.handleDerivedViewportChange}
									>
										<section class={sectionCardClass}>
											<div class="flex items-center justify-between gap-4 px-6 pb-1 pt-4">
												<h3 class="m-0 text-sm font-semibold text-dark-grey">Emissions</h3>
												<SwitchTabs
													buttons={[
														{ label: 'Intensity', value: 'intensity' },
														{ label: 'Volume', value: 'volume' }
													]}
													selected={activeEmissionsTab}
													onChange={(v) =>
														(activeEmissionsTab = /** @type {'intensity' | 'volume'} */ (v))}
												/>
											</div>
											{#if viewStart && viewEnd}
												{#if activeEmissionsTab === 'volume'}
													<FacilityEmissionsVolumeChart
														showContainer={false}
														panZoomMode="tap-to-engage"
														bind:panZoomEngaged
													/>
												{:else}
													<FacilityEmissionsIntensityChart
														showContainer={false}
														panZoomMode="tap-to-engage"
														bind:panZoomEngaged
													/>
												{/if}
											{/if}
										</section>
									</FacilityEmissionsDataProvider>
								{/if}
							{/if}
						</div>
					</div>
				</div>

				<DragHandle
					axis="x"
					onstart={splitDrag.start}
					active={splitDrag.isDragging}
					class="h-auto self-stretch max-md:hidden"
				/>

				<!-- Sidebar — fills the remaining width; sticky below the header. On
				     mobile each panel belongs to a bottom-nav tab (Info + Media = About,
				     Units = Units); `max-md:hidden` collapses the others so the desktop
				     DOM order and layout are untouched. -->
				<div
					class="min-w-0 flex-1 space-y-4 md:space-y-8 md:pl-4 md:sticky md:top-[var(--col-top)]"
				>
					<div class={[activeTab !== 'about' && 'max-md:hidden']}>
						<FacilityInfoPanel sanityFacility={data.sanityFacility} collapsible={!isMobile} />
					</div>
					<div class={[activeTab !== 'units' && 'max-md:hidden']}>
						<FacilityUnitsPanel
							facility={activeFacility}
							sanityFacility={data.sanityFacility}
							timeZone={data.timeZone}
							{intervalData}
							{hiddenUnitCodes}
							ontoggleunit={toggleUnitHidden}
							{batteryMode}
							showBatteryModeSwitch={canSplitBattery}
							onbatterymodechange={setBatteryMode}
						/>
					</div>
					<div class={[activeTab !== 'about' && 'max-md:hidden']}>
						<FacilityMediaPanel
							facility={selectedFacility}
							sanityFacility={data.sanityFacility}
							showMap={!isMobile}
						/>
					</div>
				</div>
			</div>

			<!-- NPI pollution — full width below the main row; part of the About tab.
			     Collapses with h-0 (not display:none) off-tab because it renders its own
			     LayerCake charts, which warn about a zero-size container under display:none. -->
			{#if hasNpi}
				<div class={[activeTab !== 'about' && 'max-md:h-0 max-md:overflow-hidden']}>
					<FacilityPollutionPanel facility={selectedFacility} />
				</div>
			{/if}
		</div>

		<!-- Map tab (mobile only) — full-bleed, no padding, filling the space
		     between the header and the bottom nav. Mounted only while active so
		     MapLibre initialises at its final size. -->
		{#if hasLocation && activeTab === 'map'}
			<div class="md:hidden" style="height: calc(100dvh - {headerHeight}px - {navHeight}px);">
				{#await import('./_components/FacilityMap.svelte') then { default: FacilityMap }}
					<FacilityMap
						lat={mapLocation.lat}
						lng={mapLocation.lng}
						color={mapColor}
						osmWayId={mapOsmWayId}
					/>
				{/await}
			</div>
		{/if}
	{/if}

	<!-- Mobile-only bottom navigation; `md:hidden` keeps desktop untouched. -->
	<FacilityMobileNav
		active={activeTab}
		onselect={selectTab}
		hasMap={hasLocation}
		bind:height={navHeight}
	/>
</div>
