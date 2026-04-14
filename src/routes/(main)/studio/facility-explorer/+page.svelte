<script>
	/**
	 * Facility Explorer
	 *
	 * Displays power generation data for a selected facility
	 * with unit-level breakdown by fuel technology.
	 */

	import { goto, replaceState } from '$app/navigation';
	import { getContext, onDestroy, onMount } from 'svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import {
		FacilityChart,
		FacilityPriceChart,
		FacilitySummaryTable,
		FacilityDataTable,
		PollutionSection
	} from '$lib/components/charts/facility';
	import { analyzeUnits } from '$lib/components/charts/facility/unit-analysis.js';
	import { createDragHandler } from '$lib/components/ui/panel/drag-resize.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import {
		hasBidirectionalBattery,
		filterDerivedBatteryUnits
	} from '../../facilities/_utils/units';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { CircleAlert, SearchX, Calendar, ChartArea, Table2 } from '@lucide/svelte';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import FacilitySearchPopover from './_components/FacilitySearchPopover.svelte';
	import FacilitySpotlight from './_components/FacilitySpotlight.svelte';
	import SanityFacilityDetail from './_components/SanityFacilityDetail.svelte';
	import FacilityOeDetail from './_components/FacilityOeDetail.svelte';
	import {
		getMetricIntervalForDays,
		getHysteresisSwitch,
		MIN_DATE,
		getDateStartForRange,
		getDefaultDateEnd,
		buildFacilityExplorerUrl
	} from './_utils';

	/**
	 * Get color for a fuel tech code
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} FacilityListItem
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 */

	/**
	 * @typedef {Object} Props
	 * @property {{ facilities: Promise<FacilityListItem[]>, selectedCode: string|null, facility: any, powerData: any, timeZone: string, dateStart: string|null, dateEnd: string|null, range: number|null, sanityFacility: any|null, error: string|null }} data
	 */

	/** @type {Props} */
	let { data } = $props();

	/**
	 * Streamed list of all facilities. Populates once `data.facilities` resolves
	 * — the critical render uses `data.facility` (the selected one) and doesn't
	 * block on this.
	 * @type {FacilityListItem[]}
	 */
	let facilitiesList = $state([]);

	$effect(() => {
		let cancelled = false;
		data.facilities.then((list) => {
			if (!cancelled) facilitiesList = list;
		});
		return () => {
			cancelled = true;
		};
	});

	// Go fullscreen to remove nav/footer
	/** @type {{ setFullscreen: (value: boolean) => void } | undefined} */
	const layoutContext = getContext('layout-fullscreen');
	layoutContext?.setFullscreen(true);
	onDestroy(() => layoutContext?.setFullscreen(false));

	// Delay rendering until client-side to prevent SSR/hydration flash
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	// ============================================
	// State
	// ============================================

	let searchOpen = $state(false);
	let spotlightOpen = $state(false);
	/** @type {'chart' | 'data'} */
	let activeView = $state('chart');

	// Viewport state tracked from main chart for the secondary price chart
	let currentViewStart = $state(0);
	let currentViewEnd = $state(0);

	// Summary table data from FacilityPriceChart
	/** @type {{ mvData: any[], energyData: any[], mvSeriesNames: string[], energySeriesNames: string[], mvChartStore: any } | null} */
	let summaryData = $state(null);

	// Resizable pane for summary table (right side)
	const tableResize = createDragHandler({
		axis: 'x',
		min: 200,
		max: 600,
		initial: 350,
		storageKey: 'facility-explorer-table-width',
		invert: true
	});

	const viewButtons = [
		{ label: 'Chart', value: 'chart', icon: ChartArea, size: 'size-4' },
		{ label: 'Data', value: 'data', icon: Table2, size: 'size-4' }
	];

	let dateStart = $state(
		data.dateStart || getDateStartForRange(data.range ?? 7, data.facility?.units)
	);
	let dateEnd = $state(data.dateEnd || getDefaultDateEnd());

	// Pollution data (lazy-loaded client-side)
	/** @type {any[] | null} */
	let pollutionData = $state(null);
	let pollutionLoading = $state(false);

	$effect(() => {
		const code = data.selectedCode;
		const hasNpi = selectedFacility?.npi_id;

		if (!code || !hasNpi) {
			pollutionData = null;
			return;
		}

		pollutionLoading = true;
		pollutionData = null;

		fetch(`/api/facilities/${code}/pollution`)
			.then((r) => r.json())
			.then((json) => {
				if (data.selectedCode === code) {
					const d = json.response?.data;
					pollutionData = d?.length ? d : null;
				}
			})
			.catch(() => {
				if (data.selectedCode === code) pollutionData = null;
			})
			.finally(() => {
				if (data.selectedCode === code) pollutionLoading = false;
			});
	});

	// ============================================
	// Derived: Facility Selection
	// ============================================

	// Strip derived battery_charging/discharging units only when a bidirectional battery exists
	let selectedFacility = $derived.by(() => {
		const f = data.facility;
		if (!f?.units) return f;
		return {
			...f,
			units: filterDerivedBatteryUnits(f.units, hasBidirectionalBattery(f))
		};
	});
	let timeZone = $derived(data.timeZone);

	// Prev/next navigation (wrap-around)
	let currentIndex = $derived(facilitiesList.findIndex((f) => f.code === data.selectedCode));
	let len = $derived(facilitiesList.length);
	let prevFacility = $derived(len > 0 ? facilitiesList.at((currentIndex - 1 + len) % len) : null);
	let nextFacility = $derived(len > 0 ? facilitiesList.at((currentIndex + 1) % len) : null);

	// ============================================
	// Derived: Unit Analysis (for info panel and table)
	// ============================================

	let analysis = $derived.by(() => {
		if (!selectedFacility) return null;
		return analyzeUnits(selectedFacility, getFuelTechColor);
	});

	let unitColours = $derived(analysis?.unitColours ?? {});

	// ============================================
	// Event Handlers
	// ============================================

	/** @type {number | null} */
	let selectedRange = $state(data.range ?? 7);

	const rangeButtons = [
		{ label: '1D', value: '1' },
		{ label: '3D', value: '3' },
		{ label: '7D', value: '7' },
		{ label: '1M', value: '30' },
		{ label: '6M', value: '182' },
		{ label: '1Y', value: '365' },
		{ label: '5Y', value: '1825' },
		{ label: 'All', value: '-1' }
	];

	/**
	 * Build URL with current params
	 * @param {Record<string, string | null>} overrides
	 * @returns {string}
	 */
	function buildUrl(overrides = {}) {
		return buildFacilityExplorerUrl({
			facility: overrides.facility ?? data.selectedCode,
			dateStart: overrides.date_start !== undefined ? overrides.date_start : dateStart,
			dateEnd: overrides.date_end !== undefined ? overrides.date_end : dateEnd,
			range: overrides.range !== undefined ? overrides.range : selectedRange
		});
	}

	/**
	 * Handle facility selection from search or prev/next
	 * @param {string} code
	 */
	function handleFacilitySelect(code) {
		goto(buildUrl({ facility: code }));
	}

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let chartComponent = $state(undefined);

	/** Latest selectable date: today */
	let maxDate = $derived(new Date().toISOString().slice(0, 10));

	let datePickerOpen = $state(false);

	/** @type {import('$lib/components/ui/date-range-picker/DateRangePicker.svelte').default | undefined} */
	let datePickerRef = $state(undefined);

	/**
	 * Handle date range change from DateRangePicker — update viewport client-side.
	 * @param {{ start: string, end: string }} range
	 */
	function handleDateRangeChange(range) {
		if (range.start >= range.end) return;

		const startParts = range.start.split('-').map(Number);
		const endParts = range.end.split('-').map(Number);
		const startDay = new Date(startParts[0], startParts[1] - 1, startParts[2]);
		const endDay = new Date(endParts[0], endParts[1] - 1, endParts[2]);
		const dayDiff = (endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000);
		if (dayDiff < 1) return;

		selectedRange = null;

		const tz = timeZone || '+10:00';
		const startMs = new Date(range.start + 'T00:00:00' + tz).getTime();
		const endMs = new Date(range.end + 'T23:59:59' + tz).getTime();
		const days = (endMs - startMs) / (24 * 60 * 60 * 1000);

		const mi = getMetricIntervalForDays(days);
		activeInterval = mi.interval;
		activeMetric = mi.metric;

		if (data.selectedCode && chartComponent) {
			chartComponent.setViewport(startMs, endMs);
		}

		replaceState(buildUrl({ range: null }), {});
	}

	/**
	 * Handle interval change from interval dropdown
	 * @param {string} interval
	 */
	function handleIntervalChange(interval) {
		displayInterval = interval;
		if (interval === '3M' || interval === '1y') {
			activeInterval = interval;
			activeMetric = 'energy';
		} else if (interval === '1d' || interval === '1M') {
			activeInterval = '1d';
			activeMetric = 'energy';
		} else {
			// '5m' or '30m'
			activeInterval = '5m';
			activeMetric = 'power';
		}
	}

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	/**
	 * Handle viewport change from chart pan/zoom — sync DateRangePicker display
	 * and auto-switch metric when crossing thresholds.
	 * @param {{ start: number, end: number }} range
	 */
	function handleViewportChange(range) {
		currentViewStart = range.start;
		currentViewEnd = range.end;

		if (isPresetNavigation) {
			isPresetNavigation = false;
		} else {
			selectedRange = null;
		}
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		dateStart = new Date(range.start + offsetMs).toISOString().slice(0, 10);
		dateEnd = new Date(range.end + offsetMs).toISOString().slice(0, 10);

		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		const switchResult = getHysteresisSwitch(activeMetric, activeInterval, durationDays);

		// Auto-adjust display interval based on zoom level
		if (activeMetric === 'power') {
			displayInterval = durationDays < 2 ? '5m' : '30m';
		} else if (activeMetric === 'energy') {
			displayInterval = durationDays >= 366 ? '1M' : '1d';
		}

		if (switchResult) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = switchResult.metric;
				activeInterval = switchResult.interval;
			}, 300);
		}
	}

	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let tableData = $state(null);

	/**
	 * @param {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> }} d
	 */
	function handleVisibleData(d) {
		tableData = d;
	}

	// ============================================
	// Computed UI Values
	// ============================================

	/**
	 * Resolve initial days for metric/interval calculation.
	 * For -1 ("All"), compute actual days from dateStart.
	 */
	function getInitialDays() {
		const range = data.range ?? 3;
		if (range === -1) {
			const start = new Date(dateStart);
			const now = new Date();
			return Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
		}
		return range;
	}

	/** Active interval/metric — derived from initial range */
	const _init = getMetricIntervalForDays(getInitialDays());
	/** @type {string} */
	let activeInterval = $state(_init.interval);
	/** @type {string} */
	let activeMetric = $state(_init.metric);

	/** Display interval — set by FacilityChart toggle (power: '5m'/'30m', energy: '1d'/'1M') */
	/** @type {string} */
	let displayInterval = $state('30m');

	let intervalOptions = $derived(
		activeMetric === 'power'
			? [
					{ value: '5m', label: '5 min' },
					{ value: '30m', label: '30 min' }
				]
			: [
					{ value: '1d', label: 'Daily' },
					{ value: '1M', label: 'Monthly' },
					{ value: '3M', label: 'Quarterly' },
					{ value: '1y', label: 'Yearly' }
				]
	);

	/** Earliest data date for the selected facility (for "All" range) */
	let earliestDate = $derived.by(() => {
		if (!selectedFacility?.units?.length) return null;
		/** @type {string | null} */
		let earliest = null;
		for (const unit of selectedFacility.units) {
			const d = unit.data_first_seen;
			if (d && (!earliest || d < earliest)) earliest = d;
		}
		return earliest ? earliest.slice(0, 10) : null;
	});

	/** Guard: when true, handleViewportChange preserves selectedRange */
	let isPresetNavigation = true;

	/**
	 * Handle quick range selection (1D/3D/7D/1M/6M/1Y/5Y/All)
	 * @param {number} days
	 */
	function handleRangeSelect(days) {
		selectedRange = days;

		let actualDays = days;
		if (days === -1) {
			const refDate = earliestDate || MIN_DATE;
			const startDate = new Date(refDate);
			const nowDate = new Date();
			actualDays = Math.ceil((nowDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
		}

		const mi = getMetricIntervalForDays(actualDays);
		activeInterval = mi.interval;
		activeMetric = mi.metric;

		const tz = timeZone || '+10:00';
		const now = new Date();
		const start = new Date();
		start.setDate(now.getDate() - actualDays);
		dateStart = start.toISOString().slice(0, 10);
		dateEnd = now.toISOString().slice(0, 10);
		if (chartComponent) {
			isPresetNavigation = true;
			const startMs = new Date(dateStart + 'T00:00:00' + tz).getTime();
			const endMs = new Date(dateEnd + 'T23:59:59' + tz).getTime();
			chartComponent.setViewport(startMs, endMs);
		}

		replaceState(buildUrl({ range: String(days) }), {});
	}

	/**
	 * Handle keyboard shortcuts for facility navigation
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		// Skip when typing in an input or when search popover/spotlight is open
		const tag = /** @type {HTMLElement} */ (e.target).tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || searchOpen || spotlightOpen)
			return;

		if (e.key === '/') {
			e.preventDefault();
			spotlightOpen = true;
		} else if (e.key === 'ArrowLeft' && prevFacility) {
			e.preventDefault();
			handleFacilitySelect(prevFacility.code);
		} else if (e.key === 'ArrowRight' && nextFacility) {
			e.preventDefault();
			handleFacilitySelect(nextFacility.code);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{selectedFacility ? `${selectedFacility.name} — ` : ''}Facility Explorer</title>
</svelte:head>

<FacilitySpotlight
	facilities={facilitiesList}
	bind:open={spotlightOpen}
	onselect={handleFacilitySelect}
/>

{#if mounted}
{#if data.error && !selectedFacility}
	<div class="flex flex-col h-dvh items-center justify-center text-mid-grey">
		<CircleAlert size={32} class="mb-3 text-warm-grey" />
		<p class="text-sm font-medium text-dark-grey mb-1">Unable to load facility</p>
		<p class="text-xs">{data.error}</p>
	</div>
{:else if selectedFacility}
	<div class="flex flex-col h-dvh overflow-hidden">
		<!-- Top Bar: facility nav only -->
		<div class="flex items-center px-4 py-2 border-b border-warm-grey bg-white shrink-0" style="z-index: 99">
			<div class="flex items-center w-full justify-center">
				<button
					class="p-1 rounded-lg hover:bg-warm-grey text-dark-grey transition-colors"
					onclick={() => prevFacility && handleFacilitySelect(prevFacility.code)}
					title={prevFacility?.name}
				>
					<IconChevronLeft class="w-8 h-8" />
				</button>

				<div class="flex-1 flex justify-center sm:flex-initial sm:flex-none">
					<FacilitySearchPopover
						facilities={facilitiesList}
						label={selectedFacility.name}
						bind:open={searchOpen}
						onselect={handleFacilitySelect}
					/>
				</div>

				<button
					class="p-1 rounded-lg hover:bg-warm-grey text-dark-grey transition-colors"
					onclick={() => nextFacility && handleFacilitySelect(nextFacility.code)}
					title={nextFacility?.name}
				>
					<IconChevronLeft class="w-8 h-8 rotate-180" />
				</button>
			</div>
		</div>

		<!-- Controls bar -->
		<div class="flex items-center px-4 py-3 gap-4 border-b border-warm-grey bg-white shrink-0">
			<!-- Range: Switch on desktop, dropdown on mobile -->
			<div class="hidden sm:block">
				<Switch
					buttons={rangeButtons}
					selected={String(selectedRange ?? '')}
					onchange={(d) => handleRangeSelect(parseInt(d.value, 10))}
					xPad={6}
					yPad={3}
					textSize="xs"
					roundedSize="lg"
				/>
			</div>
			<div class="sm:hidden">
				<FormSelect
					selected={String(selectedRange ?? '')}
					options={rangeButtons.map((b) => ({ label: b.label, value: b.value }))}
					widthClass="w-auto"
					paddingX="px-4"
					paddingY="py-3"
					onchange={(opt) => handleRangeSelect(parseInt(/** @type {string} */ (opt.value), 10))}
				/>
			</div>

			<div class="w-px h-6 bg-warm-grey"></div>

			<!-- Date range picker popover -->
			<div class="relative" use:clickoutside onclickoutside={() => (datePickerOpen = false)}>
				<button
					class="flex items-center px-4 py-3 rounded-lg hover:bg-warm-grey"
					onclick={() => (datePickerOpen = !datePickerOpen)}
				>
					<Calendar size={18} class="text-mid-grey" />
				</button>

				{#if datePickerOpen}
					<div
						class="border border-mid-grey bg-white absolute top-14 left-1/2 -translate-x-1/2 rounded-lg z-50 shadow-md p-4 w-[220px]"
						in:fly={{ y: -5, duration: 150 }}
						out:fly={{ y: -5, duration: 150 }}
					>
						<DateRangePicker
							bind:this={datePickerRef}
							startDate={dateStart}
							endDate={dateEnd}
							minDate={MIN_DATE}
							{maxDate}
							size="sm"
							inlineCalendar
							onchange={(range) => {
								handleDateRangeChange(range);
								datePickerOpen = false;
							}}
						/>
					</div>
				{/if}
			</div>

			<div class="w-px h-6 bg-warm-grey"></div>

			<!-- Interval dropdown -->
			<FormSelect
				selected={displayInterval}
				options={intervalOptions}
				widthClass="w-auto"
				paddingX="px-4"
				paddingY="py-3"
				onchange={(opt) => handleIntervalChange(/** @type {string} */ (opt.value))}
			/>

			<div class="w-px h-6 bg-warm-grey"></div>

			<!-- Chart/Data toggle -->
			<SwitchWithIcons
				buttons={viewButtons}
				selected={activeView}
				onchange={(d) => {
					activeView = /** @type {'chart' | 'data'} */ (d.value);
				}}
			/>
		</div>

		<!-- Scrollable content area -->
		<div class="flex-1 overflow-y-auto min-h-0">
			<!-- Chart / Data -->
			<div class="p-4">
				<!-- Chart (always rendered, hidden when data view active) -->
				<div class="grid min-h-full" class:hidden={activeView !== 'chart'}>
					<div class="flex">
						<!-- Charts (left) -->
						<div class="flex-1 min-w-0">
							<div class="bg-light-warm-grey/30 rounded-xl p-4">
								<FacilityChart
									bind:this={chartComponent}
									facility={selectedFacility}
									powerData={data.powerData}
									{timeZone}
									{dateStart}
									{dateEnd}
									interval={activeInterval}
									metric={activeMetric}
									{displayInterval}
									onviewportchange={handleViewportChange}
									onvisibledata={handleVisibleData}
								/>

								{#if currentViewStart && currentViewEnd}
									<div class="mt-4">
										<FacilityPriceChart
											facility={selectedFacility}
											{timeZone}
											interval={activeInterval}
											{displayInterval}
											viewStart={currentViewStart}
											viewEnd={currentViewEnd}
											onsummarydata={(d) => { summaryData = d; }}
											onviewportchange={(range) => chartComponent?.setViewport(range.start, range.end)}
										/>
									</div>
								{/if}
							</div>
						</div>

						<!-- Drag handle -->
						<DragHandle axis="x" onstart={tableResize.start} active={tableResize.isDragging} />

						<!-- Summary table (right) -->
						<div
							class="shrink-0 overflow-y-auto"
							style="width: {tableResize.value}px;"
						>
							{#if summaryData && selectedFacility}
								<div class="border border-warm-grey rounded-lg">
									<FacilitySummaryTable
										facility={selectedFacility}
										mvData={summaryData.mvData}
										energyData={summaryData.energyData}
										mvSeriesNames={summaryData.mvSeriesNames}
										energySeriesNames={summaryData.energySeriesNames}
										mvChartStore={summaryData.mvChartStore}
										{unitColours}
										{timeZone}
									/>
								</div>
							{:else}
								<div class="flex items-center justify-center h-full text-xs text-mid-grey">
									Loading summary...
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Data table -->
				<div class:hidden={activeView !== 'data'}>
					{#if tableData}
						<div class="border border-warm-grey rounded-lg overflow-y-auto">
							<FacilityDataTable
								data={tableData.data}
								seriesNames={tableData.seriesNames}
								seriesLabels={tableData.seriesLabels}
								{timeZone}
							/>
						</div>
					{:else}
						<div class="flex items-center justify-center py-16 text-sm text-mid-grey">
							Loading data...
						</div>
					{/if}
				</div>
			</div>

			<!-- Three-column comparison -->
			<div class="grid grid-cols-3 border-t border-warm-grey">
				<!-- Left: OE API (filtered selected facility) -->
				<div class="border-r border-warm-grey overflow-y-auto">
					<FacilityOeDetail label="OE API" facility={selectedFacility} />
				</div>

				<!-- Middle: Single facility call (raw response) -->
				<div class="border-r border-warm-grey overflow-y-auto">
					<FacilityOeDetail label="Single facility call" facility={data.facility} />
				</div>

				<!-- Right: Sanity CMS data -->
				<div class="overflow-y-auto">
					<SanityFacilityDetail facility={data.sanityFacility} />
				</div>
			</div>

			<!-- Pollution data -->
			{#if selectedFacility?.npi_id}
				<div class="border-t border-warm-grey">
					{#if pollutionLoading}
						<div class="p-5 text-xs text-mid-grey">Loading pollution data...</div>
					{:else if pollutionData}
						<PollutionSection {pollutionData} />
					{:else}
						<div class="p-5">
							<div class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey">
								NPI Pollution Data
							</div>
							<p class="text-sm text-mid-grey">No pollution data available for this facility</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Empty State -->
	<div class="flex flex-col h-dvh items-center justify-center text-mid-grey">
		<SearchX size={32} class="mb-3 text-warm-grey" />
		<p class="text-sm">Select a facility to view its power generation data.</p>
	</div>
{/if}
{/if}
