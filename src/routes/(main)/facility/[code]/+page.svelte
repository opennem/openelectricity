<script>
	import { onMount } from 'svelte';
	import { LineChart } from '@lucide/svelte';
	import {
		FacilityChart,
		FacilityPriceChart,
		FacilityMarketValueChart,
		FacilityFinancialDataProvider,
		FacilityEmissionsIntensityChart,
		FacilityEmissionsVolumeChart,
		FacilityEmissionsDataProvider,
		FacilityPollutionPanel
	} from '$lib/components/charts/facility';
	import { formatDateRange, ChartRangeBar } from '$lib/components/charts/v2';
	import FacilityPanelHeader from '../../facilities/_components/FacilityPanelHeader.svelte';
	import {
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../../facilities/_utils/units';
	import isCommissioningCheck from '../../facilities/_utils/is-commissioning';

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
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import { createViewportSync } from './_utils/viewport-sync.js';
	import {
		CHARTS_FRACTION_COOKIE,
		CHARTS_FRACTION_MIN,
		CHARTS_FRACTION_MAX
	} from './_utils/charts-fraction.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let selectedFacility = $derived.by(() => {
		const f = data.facility;
		if (!f?.units) return f;
		const hasBidirectional = hasBidirectionalBattery(f);
		const filtered = filterDerivedBatteryUnits(f.units, hasBidirectional);
		// Mark commissioning units client-side (same as /facilities page)
		const units = filtered.map((/** @type {any} */ unit) => {
			if (isCommissioningCheck(unit, { hasBidirectionalBattery: hasBidirectional })) {
				return { ...unit, isCommissioning: true, status_id: 'commissioning' };
			}
			return unit;
		});
		return { ...f, units };
	});

	let timeZone = $derived(data.timeZone);
	let rangeDays = $derived(data.rangeDays ?? 7);

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

	const sync = createViewportSync();

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let powerChart = $state(undefined);

	let activeInterval = $state('5m');
	let activeMetric = $state('power');
	let displayInterval = $state('30m');

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
	let selectedRange = $state(data.rangeDays ?? 7);

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

	/** Measured live so both columns can stick just below the header. */
	let headerHeight = $state(0);

	const splitDrag = createDragHandler({
		axis: 'x',
		min: CHARTS_FRACTION_MIN,
		max: CHARTS_FRACTION_MAX,
		initial: data.chartsFraction,
		scale: () => splitContainerEl?.clientWidth ?? 1,
		persist: {
			read: () => data.chartsFraction,
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

	$effect(() => {
		// Reset chart-viewport-driven state when the underlying facility changes.
		const _code = data.facility?.code;
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = '30m';
		panZoomEngaged = false;
	});

	const DAY_MS = 24 * 60 * 60 * 1000;

	/** Span of the current view in days — drives the interval options offered for
	 *  a custom (calendar) range when no preset is active. */
	let customDays = $derived(
		Math.max(1, Math.ceil(((viewEnd || defaultEnd) - (viewStart || defaultStart)) / DAY_MS))
	);

	/** Display intervals that only the explicit picker produces (pan/zoom never
	 *  auto-derives them). A small pan that doesn't cross a native threshold must
	 *  not clobber one of these back to a native grain. */
	const COARSE_PICKER_INTERVALS = new Set(['7d', 'season', 'quarter', 'half', 'fy']);

	/** Hysteresis-aware metric/interval switching for pan/zoom — keeps the
	 *  current axis where it is unless duration crosses a 13/15-day (and
	 *  300/365-day, 1500/1825-day) threshold. Display interval is recomputed
	 *  every tick from the (possibly newly-targeted) metric/interval. */
	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / DAY_MS;
		const next = getHysteresisSwitch(activeMetric, activeInterval, durationDays);

		// Preserve an explicit coarse pick (Season/Quarter/Half/Fin-Year/Week)
		// across small pans that don't cross a native fetch threshold.
		if (!next && COARSE_PICKER_INTERVALS.has(displayInterval)) return;

		displayInterval = getDisplayIntervalForDays(
			next?.metric ?? activeMetric,
			next?.interval ?? activeInterval,
			durationDays
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
		const intervalId = preset
			? getDefaultIntervalForRange(preset.id)
			: getMetricIntervalForDays(actualDays).interval;
		applyRangeSwitch(startMs, endMs, intervalId);
	}

	/** @param {{ start: string, end: string }} range */
	function handleDateRangeChange(range) {
		selectedRange = null;
		const startMs = new Date(range.start).getTime();
		const endMs = new Date(range.end).getTime();
		const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
		applyRangeSwitch(startMs, endMs, getIntervalOptionsForDays(days).default);
	}

	/** Manual interval override from the dropdown. Keeps the current viewport and
	 *  refetches at the chosen grain. A later range/pan re-derives the interval
	 *  automatically (memoryless), so the override sticks until then. */
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

	let hasPowerData = $derived(
		Boolean(
			data.powerData?.data?.length &&
			data.powerData.data[0].results?.some((/** @type {any} */ r) => r.data?.length)
		)
	);

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

<svelte:head>
	<title>{selectedFacility?.name ?? 'Facility'} — Open Electricity</title>
</svelte:head>

<div class="flex-1 min-h-0 overflow-y-auto bg-light-warm-grey">
	<div class="md:sticky md:top-0 md:z-40" bind:clientHeight={headerHeight}>
		<FacilityPanelHeader facility={selectedFacility} sanityFacility={data.sanityFacility} />
	</div>
	{#if selectedFacility}
		<div class="p-8 space-y-8">
			<!-- md:items-start keeps the columns at their natural heights — flex's
			     default `stretch` align would equalise them and leave sticky no
			     room to slide. --col-top hoists the sticky-top expression out of
			     the per-column class strings so both stay in lockstep. -->
			<div
				bind:this={splitContainerEl}
				class="flex flex-col md:flex-row md:items-start min-h-0"
				style="--hdr-h: {headerHeight}px; --col-top: calc(var(--hdr-h) + 2rem);"
			>
				<div
					class="md:shrink-0 md:pr-4 md:sticky md:top-[var(--col-top)] space-y-4 {splitDrag.isDragging
						? ''
						: 'md:transition-[width] md:duration-200 md:ease-out'}"
					style:width={leftWidthPercent}
				>
					<div class="space-y-10">
						{#if hasPowerData}
							<!-- Range/date picker — sits outside chartCardEl so clicking the
							     bar disengages tap-to-engage pan/zoom (deliberate: choosing a
							     new range is a different interaction modality from chart
							     manipulation). -->
							<div class="flex items-center justify-between gap-4 flex-wrap">
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

							<!-- chartCardEl wraps the chart cards (not the range bar) so
							     pan/zoom click-outside detection treats clicks between cards
							     as "still engaged" but disengages on a range-bar click. -->
							<div bind:this={chartCardEl} class="space-y-8">
								<!-- Generation card — full width. The interval badge stays here
								     as the per-chart aggregation cue; the shared date range
								     lives in the bar above. -->
								<div class="relative rounded-lg border border-mid-warm-grey/40 bg-white">
									<div
										class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
									>
										<h3 class="text-sm font-semibold text-dark-grey m-0">Generation</h3>
										<span
											class="px-2 py-0.5 rounded bg-light-warm-grey text-dark-grey text-xs uppercase tracking-wider"
										>
											{getIntervalSpec(displayInterval)?.label ?? displayInterval}
										</span>
									</div>
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
										panZoomMode="tap-to-engage"
										bind:panZoomEngaged
									/>
								</div>

								<FacilityFinancialDataProvider
									facility={selectedFacility}
									{timeZone}
									interval={activeInterval}
									{displayInterval}
									{viewStart}
									{viewEnd}
									{hoverTime}
									onhoverchange={handleHoverChange}
									onviewportchange={handleDerivedViewportChange}
								>
									<div class="relative rounded-lg border border-mid-warm-grey/40 bg-white">
										<div
											class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
										>
											<h3 class="text-sm font-semibold text-dark-grey m-0">Market</h3>
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
									</div>
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
										onviewportchange={handleDerivedViewportChange}
									>
										<div class="relative rounded-lg border border-mid-warm-grey/40 bg-white">
											<div
												class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
											>
												<h3 class="text-sm font-semibold text-dark-grey m-0">Emissions</h3>
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
										</div>
									</FacilityEmissionsDataProvider>
								{/if}
							</div>
						{:else}
							<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
								<div
									class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
								>
									<h3 class="text-sm font-semibold text-dark-grey m-0">Generation</h3>
								</div>
								<div class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
									<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
										<LineChart size={24} strokeWidth={1.5} />
									</div>
									<p class="text-sm font-medium text-dark-grey m-0">No data available</p>
								</div>
							</div>
						{/if}

						{#if hasNpi}
							<FacilityPollutionPanel facility={selectedFacility} />
						{/if}
					</div>
				</div>

				{#if !isMobile}
					<DragHandle
						axis="x"
						onstart={splitDrag.start}
						active={splitDrag.isDragging}
						class="h-auto self-stretch"
					/>
				{/if}

				<div class="flex-1 min-w-0 md:pl-4 md:sticky md:top-[var(--col-top)] space-y-10">
					<FacilityInfoPanel sanityFacility={data.sanityFacility} facility={selectedFacility} />
					<FacilityUnitsPanel facility={selectedFacility} />
				</div>
			</div>
		</div>
	{/if}
</div>
