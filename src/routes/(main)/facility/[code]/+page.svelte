<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { LineChart } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
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
	import { withMarkedUnits } from '../../facilities/_utils/units';

	import {
		getMetricIntervalForDays,
		getHysteresisSwitch,
		getDisplayIntervalForDays
	} from '$lib/utils/metric-interval';
	import {
		getIntervalSpec,
		getPresetByDays,
		getDefaultIntervalForRange,
		getIntervalOptionsForDays
	} from '$lib/components/charts/facility/range-interval-config.js';
	import { MIN_DATE, getEarliestDate } from '$lib/utils/date-range';
	import { createDragHandler } from '$lib/components/ui/panel/drag-resize.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';

	import FacilityInfoPanel from './_components/FacilityInfoPanel.svelte';
	import FacilityUnitsPanel from './_components/FacilityUnitsPanel.svelte';
	import FacilityMediaPanel from './_components/FacilityMediaPanel.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import { createViewportSync } from './_utils/viewport-sync.js';
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

	let timeZone = $derived(data.timeZone);
	let rangeDays = $derived(data.rangeDays ?? 3);

	let defaultEnd = $derived(data.retiredEndMs ?? Date.now());
	let defaultStart = $derived(defaultEnd - rangeDays * 24 * 60 * 60 * 1000);

	function toDateString(/** @type {number} */ ms) {
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		return new Date(ms + offsetMs).toISOString().slice(0, 10);
	}
	let dateStart = $derived(toDateString(defaultStart));
	let dateEnd = $derived(toDateString(defaultEnd));

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

	const sync = createViewportSync();

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let powerChart = $state(undefined);

	let activeInterval = $state('5m');
	let activeMetric = $state('power');
	// Power views default to the 5-minute grain on this page (see preferFiveMinute).
	let displayInterval = $state('5m');

	let hasNpi = $derived(Boolean(selectedFacility?.npi_id));

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

	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');
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

	/** Currently selected range preset in days (-1 = All). null when a custom
	 *  date range is in use or the user has panned/zoomed off any preset. */
	/** @type {number | null} */
	let selectedRange = $state(data.rangeDays ?? 3);

	/** Earliest data point across the facility's units, used as the floor for
	 *  the date picker and the "All" preset. */
	let earliestDate = $derived(getEarliestDate(selectedFacility?.units ?? []));

	/** Latest selectable date — today, or retiredEndMs for retired facilities. */
	let maxDate = $derived(toDateString(defaultEnd));

	/** Track the live viewport so the calendar popover always reflects what's
	 *  currently visible (falls back to the default range before the chart
	 *  reports its first viewport). */
	let pickerStartDate = $derived(toDateString(viewStart || defaultStart));
	let pickerEndDate = $derived(toDateString(viewEnd || defaultEnd));

	/** @type {HTMLElement | undefined} */
	let chartCardEl = $state(undefined);

	/** @type {HTMLElement | undefined} */
	let splitContainerEl = $state(undefined);
	let isMobile = $state(false);

	/** Measured live so the sidebar can stick just below the header. */
	let headerHeight = $state(0);

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

	let leftWidthPercent = $derived(isMobile ? null : `${splitDrag.value * 100}%`);

	onMount(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const update = (/** @type {MediaQueryListEvent} */ e) => (isMobile = e.matches);
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	// Whether the default range preset has been applied for the current facility's
	// chart (see handlePowerLoadComplete). Reset on facility change so each new
	// facility re-applies it.
	let rangeApplied = false;

	$effect(() => {
		// Reset chart-viewport-driven state when the underlying facility changes.
		const _code = data.facility?.code;
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = '5m';
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
	});

	const DAY_MS = 24 * 60 * 60 * 1000;

	/** Span of the current view in days — drives the interval options offered for
	 *  a custom (calendar) range when no preset is active. */
	let customDays = $derived(
		Math.max(1, Math.ceil(((viewEnd || defaultEnd) - (viewStart || defaultStart)) / DAY_MS))
	);

	/** Display intervals that only the explicit picker produces on this page —
	 *  pan/zoom auto-derivation never yields them ('30m' qualifies because
	 *  preferFiveMinute means power always auto-derives to 5m). A pan/zoom that
	 *  doesn't cross a native fetch threshold must not clobber one of these back
	 *  to an auto grain. */
	const PICKER_ONLY_INTERVALS = new Set(['30m', '7d', 'season', 'quarter', 'half', 'fy']);

	/** This page defaults power views to the 5-minute grain — 30m is still a manual
	 *  dropdown pick, but never the auto/default. The shared config (studio +
	 *  facilities charts) still defaults power to 30m; we map that single power
	 *  display grain down to 5m locally so only /facility/[code] changes. Energy and
	 *  native coarse grains pass through untouched.
	 *  @param {string} intervalId @returns {string} */
	function preferFiveMinute(intervalId) {
		return intervalId === '30m' ? '5m' : intervalId;
	}

	/** Hysteresis-aware metric/interval switching for pan/zoom — keeps the
	 *  current axis where it is unless duration crosses a 13/15-day (and
	 *  300/365-day, 1500/1825-day) threshold. Display interval is recomputed
	 *  every tick from the (possibly newly-targeted) metric/interval. */
	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / DAY_MS;
		const next = getHysteresisSwitch(activeMetric, activeInterval, durationDays);

		// Preserve an explicit picker choice (30m/Week/Season/Quarter/Half/Fin-Year)
		// across pans and zooms that don't cross a native fetch threshold.
		if (!next && PICKER_ONLY_INTERVALS.has(displayInterval)) return;

		displayInterval = preferFiveMinute(
			getDisplayIntervalForDays(
				next?.metric ?? activeMetric,
				next?.interval ?? activeInterval,
				durationDays
			)
		);

		if (next) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = next.metric;
				activeInterval = next.interval;
			}, 300);
		}
	}

	/** Explicit selection (preset, custom dates, or interval dropdown) — resolves
	 *  the interval id to its native fetch grain via the config and refetches the
	 *  given viewport through `FacilityChart.setViewport()`. */
	/** @param {number} startMs @param {number} endMs @param {string} intervalId */
	function applyRangeSwitch(startMs, endMs, intervalId) {
		const spec = getIntervalSpec(intervalId);
		if (!spec) return;
		activeMetric = spec.metric;
		activeInterval = spec.apiInterval;
		displayInterval = intervalId;
		viewStart = startMs;
		viewEnd = endMs;
		if (powerChart) {
			sync.runSuppressed(() => powerChart?.setViewport(startMs, endMs));
		}
	}

	/** @param {number} days */
	function handleRangeSelect(days) {
		selectedRange = days;
		const endMs = defaultEnd;
		let actualDays = days;
		if (days === -1) {
			const earliestMs = earliestDate
				? new Date(earliestDate).getTime()
				: new Date(MIN_DATE).getTime();
			actualDays = Math.max(1, Math.ceil((endMs - earliestMs) / DAY_MS));
		}
		const startMs = endMs - actualDays * DAY_MS;
		const preset = getPresetByDays(days);
		const intervalId = preferFiveMinute(
			preset ? getDefaultIntervalForRange(preset.id) : getMetricIntervalForDays(actualDays).interval
		);
		applyRangeSwitch(startMs, endMs, intervalId);
	}

	/** @param {{ start: string, end: string }} range */
	function handleDateRangeChange(range) {
		selectedRange = null;
		const startMs = new Date(range.start).getTime();
		const endMs = new Date(range.end).getTime();
		const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
		applyRangeSwitch(startMs, endMs, preferFiveMinute(getIntervalOptionsForDays(days).default));
	}

	/** Manual interval override from the dropdown. Keeps the current viewport and
	 *  refetches at the chosen grain. A later preset or calendar pick re-derives
	 *  the interval; pans/zooms preserve the pick until they cross a native fetch
	 *  threshold (see PICKER_ONLY_INTERVALS). */
	/** @param {string} value */
	function handleIntervalChange(value) {
		const startMs = viewStart || defaultStart;
		const endMs = viewEnd || defaultEnd;
		applyRangeSwitch(startMs, endMs, value);
	}

	/** @param {{ start: number, end: number }} range */
	function handlePowerViewportChange(range) {
		if (sync.isSuppressed()) return;
		viewStart = range.start;
		viewEnd = range.end;
		selectedRange = null;
		applyMetricSwitch(range);
	}

	/** Viewport change emitted by a derived-chart provider (financial OR emissions).
	 *  Both providers receive the same `viewStart`/`viewEnd` props and react to
	 *  the resulting state update; the generation chart owns its own viewport
	 *  internally so we push the new range through `sync.runSuppressed` to avoid
	 *  an echo. */
	/** @param {{ start: number, end: number }} range */
	function handleDerivedViewportChange(range) {
		if (sync.isSuppressed()) return;
		viewStart = range.start;
		viewEnd = range.end;
		selectedRange = null;
		applyMetricSwitch(range);
		if (powerChart) {
			sync.runSuppressed(() => powerChart?.setViewport(range.start, range.end));
		}
	}

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
			handleRangeSelect(rangeDays);
		}
		powerLoaded = true;
		powerHasData = hasData;
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
	class="flex-1 min-h-0 overflow-y-auto bg-light-warm-grey"
	style:view-transition-name="facility-hero"
>
	<div class="md:sticky md:top-0 md:z-40" bind:clientHeight={headerHeight}>
		<FacilityPanelHeader facility={selectedFacility} sanityFacility={data.sanityFacility} />
	</div>
	{#if selectedFacility}
		<div
			class="p-8 space-y-8"
			style="--hdr-h: {headerHeight}px; --col-top: calc(var(--hdr-h) + 2rem);"
		>
			<div bind:this={splitContainerEl} class="flex flex-col md:flex-row md:items-start">
				<!-- Main column — one unified card holding the range bar, metrics,
				     unit availability and the three charts as divided sections.
				     Resizable width; the sidebar takes the remainder. -->
				<div
					class="min-w-0 md:shrink-0 md:pr-4 {splitDrag.isDragging
						? ''
						: 'md:transition-[width] md:duration-200 md:ease-out'}"
					style:width={leftWidthPercent}
				>
					{#if !showEmptyState}
						<div class="overflow-hidden rounded-lg border border-mid-warm-grey/40 bg-white">
							<!-- Range / date picker -->
							<div class="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
								<span class="text-xs font-medium text-dark-grey">{dateRangeLabel}</span>
								<ChartRangeBar
									{selectedRange}
									{customDays}
									{displayInterval}
									startDate={pickerStartDate}
									endDate={pickerEndDate}
									minDate={MIN_DATE}
									{maxDate}
									{earliestDate}
									showIntervalDropdown={true}
									onrangeselect={handleRangeSelect}
									ondaterangechange={handleDateRangeChange}
									onintervalchange={handleIntervalChange}
								/>
							</div>

							<!-- Metrics. Flush grid; the card supplies the outer border. Fed by
							     the providers + generation chart below. -->
							<div class="border-t border-mid-warm-grey/40">
								<FacilityMetrics
									facility={selectedFacility}
									sanityFacility={data.sanityFacility}
									{summaryData}
									{emissionsData}
									{intervalData}
									{timeZone}
									{displayInterval}
									onpeakhighlight={handleHoverChange}
								/>
							</div>

							<!-- chartCardEl wraps the chart sections (not the range bar / metrics)
							     so pan/zoom click-outside treats clicks between charts as "still
							     engaged" but disengages on a range-bar / metrics click. -->
							<div bind:this={chartCardEl}>
								<!-- Generation -->
								<section class="border-t border-mid-warm-grey/40">
									<div class="flex items-center justify-between gap-4 px-6 pb-1 pt-4">
										<h3 class="m-0 text-sm font-semibold text-dark-grey">Generation</h3>
										<span
											class="rounded bg-light-warm-grey px-2 py-0.5 text-xs uppercase tracking-wider text-dark-grey"
										>
											{getIntervalSpec(displayInterval)?.label ?? displayInterval}
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
												facility={selectedFacility}
												powerData={data.powerData}
												{timeZone}
												{dateStart}
												{dateEnd}
												interval={activeInterval}
												metric={activeMetric}
												{displayInterval}
												chartHeight="h-[267px]"
												title={activeMetric === 'energy' ? 'Energy' : 'Power'}
												tooltipMode="floating"
												showContainer={false}
												{hoverTime}
												onhoverchange={handleHoverChange}
												onviewportchange={handlePowerViewportChange}
												onloadcomplete={handlePowerLoadComplete}
												onvisibledata={(d) => (intervalData = d)}
												panZoomMode="tap-to-engage"
												bind:panZoomEngaged
												bundleDerivedMetrics
											/>
										</div>
										{#if !chartReady}
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

								<FacilityFinancialDataProvider
									facility={selectedFacility}
									{timeZone}
									interval={activeInterval}
									{displayInterval}
									{viewStart}
									{viewEnd}
									{hoverTime}
									onhoverchange={handleHoverChange}
									onsummarydata={(d) => (summaryData = d)}
									onviewportchange={handleDerivedViewportChange}
								>
									<section class="border-t border-mid-warm-grey/40">
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
										facility={selectedFacility}
										{timeZone}
										interval={activeInterval}
										{displayInterval}
										{viewStart}
										{viewEnd}
										{hoverTime}
										onhoverchange={handleHoverChange}
										onsummarydata={(d) => (emissionsData = d)}
										onviewportchange={handleDerivedViewportChange}
									>
										<section class="border-t border-mid-warm-grey/40">
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
							</div>
						</div>
					{:else}
						<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
							<div
								class="flex items-center justify-between gap-4 border-b border-mid-warm-grey/40 px-6 py-3"
							>
								<h3 class="m-0 text-sm font-semibold text-dark-grey">Generation</h3>
							</div>
							<div class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
								<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
									<LineChart size={24} strokeWidth={1.5} />
								</div>
								<p class="m-0 text-sm font-medium text-dark-grey">No data available</p>
							</div>
						</div>
					{/if}
				</div>

				{#if !isMobile}
					<DragHandle
						axis="x"
						onstart={splitDrag.start}
						active={splitDrag.isDragging}
						class="h-auto self-stretch"
					/>
				{/if}

				<!-- Sidebar — fills the remaining width; sticky below the header. -->
				<div class="min-w-0 flex-1 space-y-8 md:pl-4 md:sticky md:top-[var(--col-top)]">
					<FacilityInfoPanel sanityFacility={data.sanityFacility} />
					<FacilityUnitsPanel
						facility={selectedFacility}
						sanityFacility={data.sanityFacility}
						timeZone={data.timeZone}
						{intervalData}
					/>
					<FacilityMediaPanel facility={selectedFacility} sanityFacility={data.sanityFacility} />
				</div>
			</div>

			<!-- NPI pollution — full width below the main row -->
			{#if hasNpi}
				<FacilityPollutionPanel facility={selectedFacility} />
			{/if}
		</div>
	{/if}
</div>
