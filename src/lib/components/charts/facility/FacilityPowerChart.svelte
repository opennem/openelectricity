<script>
	/**
	 * FacilityPowerChart - Reusable facility power visualization component
	 *
	 * Displays power generation data for a facility with unit-level breakdown,
	 * horizontal panning, client-side data caching, and fuel tech color coding.
	 */

	import {
		ChartStore,
		StratumChart,
		processForChart
	} from '$lib/components/charts/v2';
	import { aggregateToInterval } from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { loadFuelTechs, fuelTechNameMap } from '$lib/fuel_techs';
	import detailedGroup from '$lib/fuel-tech-groups/detailed';
	import { buildUnitColourMap, transformFacilityPowerData } from './helpers.js';
	import chroma from 'chroma-js';
	import { untrack } from 'svelte';

	/** Fuel tech display order from detailed group */
	const fuelTechOrder = detailedGroup.order;

	/**
	 * Get color for a fuel tech code
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} Props
	 * @property {any} facility - Facility object with units array
	 * @property {any} powerData - Power data from API
	 * @property {string} timeZone - Timezone offset string (+10:00 or +08:00)
	 * @property {string} [title] - Chart title
	 * @property {string} [chartHeight] - Chart height class
	 * @property {boolean} [useDivergingStack] - Stack positive/negative values independently (default: false)
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange] - Callback when viewport changes (for DateRangePicker sync)
	 */

	/** @type {Props} */
	let {
		facility,
		powerData,
		timeZone,
		title = '',
		chartHeight = 'h-[400px]',
		useDivergingStack = false,
		onviewportchange
	} = $props();

	// ============================================
	// Derived: Timezone
	// ============================================

	/**
	 * Map offset to IANA timezone for Intl.DateTimeFormat (which doesn't support offsets)
	 * Uses DST-free zones: Brisbane (AEST +10), Perth (AWST +8)
	 */
	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	/**
	 * Get start of day in the facility's timezone
	 * @param {Date} date
	 * @returns {Date}
	 */
	function getStartOfDay(date) {
		const formatter = new Intl.DateTimeFormat('en-AU', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: ianaTimeZone
		});
		const parts = formatter.formatToParts(date);
		const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
		const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
		const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');

		const offsetHours = timeZone === '+08:00' ? 8 : 10;
		return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
	}

	/**
	 * Compute day-start dates from series data for gridlines
	 * @param {any[]} data - Series data with date property
	 * @returns {Date[]}
	 */
	function getDayStartDates(data) {
		if (!data?.length) return [];

		const dayStarts = new Set();
		/** @type {Date[]} */
		const result = [];

		for (const d of data) {
			const date = d.date || new Date(d.time);
			const dayStart = getStartOfDay(date);
			const key = dayStart.getTime();

			if (!dayStarts.has(key)) {
				dayStarts.add(key);
				result.push(dayStart);
			}
		}

		return result.sort((a, b) => a.getTime() - b.getTime());
	}

	// ============================================
	// Derived: Unit Analysis
	// ============================================

	let unitColours = $derived.by(() => {
		if (!facility?.units) return {};
		return buildUnitColourMap(facility.units, getFuelTechColor);
	});

	let unitFuelTechMap = $derived.by(() => {
		if (!facility?.units) return {};

		/** @type {Record<string, string>} */
		const map = {};
		for (const unit of facility.units) {
			map[unit.code] = unit.fueltech_id;
		}
		return map;
	});

	let unitOrder = $derived.by(() => {
		if (!facility?.units) return [];

		const unitPairs = facility.units.map((/** @type {any} */ unit) => ({
			id: `power_${unit.code}`,
			fueltech: unit.fueltech_id
		}));

		unitPairs.sort((/** @type {any} */ a, /** @type {any} */ b) => {
			const aIndex = fuelTechOrder.indexOf(a.fueltech);
			const bIndex = fuelTechOrder.indexOf(b.fueltech);
			const aPos = aIndex === -1 ? 999 : aIndex;
			const bPos = bIndex === -1 ? 999 : bIndex;
			return aPos - bPos;
		});

		return unitPairs.map((/** @type {any} */ p) => p.id);
	});

	/** @type {string[]} */
	let loadIds = $derived.by(() => {
		if (!facility?.units) return [];
		const ids = [];
		for (const unit of facility.units) {
			if (loadFuelTechs.includes(unit.fueltech_id)) {
				ids.push(`power_${unit.code}`);
			}
		}
		return ids;
	});

	const BATTERY_FUEL_TECHS = ['battery'];

	let hasBatteryUnits = $derived(
		facility?.units?.some((/** @type {any} */ u) => BATTERY_FUEL_TECHS.includes(u.fueltech_id))
	);

	let capacitySums = $derived.by(() => {
		if (!facility?.units) return { positive: 0, negative: 0 };

		let positive = 0;
		let negative = 0;

		const allBattery = facility.units.every((/** @type {any} */ u) =>
			BATTERY_FUEL_TECHS.includes(u.fueltech_id)
		);

		for (const unit of facility.units) {
			const capacity = Number(unit.capacity_maximum || unit.capacity_registered) || 0;
			if (loadFuelTechs.includes(unit.fueltech_id)) {
				negative += capacity;
			} else if (allBattery && unit.fueltech_id === 'battery') {
				positive += capacity;
				negative += capacity;
			} else {
				positive += capacity;
			}
		}

		return { positive, negative };
	});

	// ============================================
	// Viewport State
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);

	/** @type {'5m' | '30m'} */
	let selectedInterval = $state('30m');

	/** Minimum viewport duration: 1 hour */
	const MIN_VIEWPORT_MS = 1 * 60 * 60 * 1000;
	/** Maximum viewport duration: 14 days */
	const MAX_VIEWPORT_MS = 14 * 24 * 60 * 60 * 1000;

	/** Track the last pan direction for prefetching */
	/** @type {number} */
	let lastPanDelta = $state(0);

	/** Whether we're currently in a pan gesture */
	let isPanning = $state(false);

	// ============================================
	// Data Manager
	// ============================================

	/**
	 * Label reducer for processForChart
	 * @param {any} acc
	 * @param {any} d
	 * @returns {any}
	 */
	function labelReducer(acc, d) {
		const unitCode = d.unit?.code || d.id;
		const fuelTech = d.unit?.fueltech_id || d.fueltech_id || 'unknown';
		acc[d.id] = `${unitCode} (${fuelTechNameMap[fuelTech] || fuelTech})`;
		return acc;
	}

	/**
	 * Colour reducer for processForChart — needs dynamic unitColours
	 * We create a function that closes over the current unitColours
	 */
	let colourReducer = $derived.by(() => {
		const colourMap = unitColours;
		return (/** @type {any} */ acc, /** @type {any} */ d) => {
			const unitCode = d.unit?.code || d.id;
			const fuelTech = d.unit?.fueltech_id || d.fueltech_id || 'unknown';
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = loadFuelTechs.includes(fuelTech);
			acc[d.id] = isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
			return acc;
		};
	});

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	// Initialize/reinitialize data manager when facility changes
	$effect(() => {
		if (!facility || !powerData) {
			dataManager = null;
			return;
		}

		const manager = new ChartDataManager({
			facilityCode: facility.code,
			networkId: facility.network_id,
			interval: '5m',
			metric: 'power',
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds,
			labelReducer,
			colourReducer
		});

		// Seed with server data
		manager.seedCache(powerData);

		// Initialize viewport to the data range
		if (manager.cacheStart !== null && manager.cacheEnd !== null) {
			viewStart = manager.cacheStart;
			viewEnd = manager.cacheEnd;
		}

		dataManager = manager;
	});

	// ============================================
	// Chart Store — created once, updated reactively
	// ============================================

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
	let chartStore = $state(null);

	// Create chart store once when facility/data changes (not on viewport changes)
	$effect(() => {
		if (!dataManager || !dataManager.processedCache) {
			chartStore = null;
			return;
		}

		const processed = dataManager.processedCache;

		const chart = new ChartStore({
			key: Symbol('facility-chart'),
			title: facility?.name || 'Facility Power',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: timeZone
		});
		chart.chartStyles.chartHeightClasses = chartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.useDivergingStack = useDivergingStack;
		chart.lighterNegative = hasBatteryUnits;

		chart.seriesNames = processed.seriesNames;
		chart.seriesColours = processed.seriesColours;
		chart.seriesLabels = processed.seriesLabels;
		chart.formatTickX = formatXAxis;

		// Set initial data from viewport — use untrack so this effect doesn't
		// re-run on every pan frame (Effect 2 handles viewport updates)
		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		const visibleData = dataManager.getDataForRange(start, end);
		chart.seriesData = visibleData;
		chart.xDomain = /** @type {[number, number]} */ ([start, end]);

		const dayStarts = getDayStartDates(visibleData);
		chart.xTicks = dayStarts;
		chart.xGridlineTicks = dayStarts;

		chartStore = chart;
	});

	// Update chart data/domain when viewport or interval changes (without recreating the store)
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		// Read viewport + interval to track as dependencies
		const start = viewStart;
		const end = viewEnd;
		const interval = selectedInterval;

		let visibleData = dataManager.getDataForRange(start, end);

		// Client-side aggregation to 30m
		if (interval === '30m' && visibleData.length > 0 && dataManager.seriesMeta) {
			visibleData = aggregateToInterval(
				visibleData,
				'30m',
				dataManager.seriesMeta.seriesNames,
				'mean'
			);
		}

		chartStore.seriesData = visibleData;
		chartStore.xDomain = /** @type {[number, number]} */ ([start, end]);

		const dayStarts = getDayStartDates(visibleData);
		chartStore.xTicks = dayStarts;
		chartStore.xGridlineTicks = dayStarts;
	});

	// Update reference lines and yDomain reactively
	$effect(() => {
		if (!chartStore) return;

		const isProportion = chartStore.chartOptions.isDataTransformTypeProportion;
		const isChangeSince = chartStore.chartOptions.isDataTransformTypeChangeSince;
		const isLine = chartStore.chartOptions.isChartTypeLine;

		if (isProportion) {
			chartStore.yReferenceLines = [];
			chartStore.setYDomain(undefined);
			return;
		}

		if (isLine || isChangeSince) {
			const maxCapacity = Math.max(capacitySums.positive, capacitySums.negative);
			if (maxCapacity > 0) {
				chartStore.yReferenceLines = [
					{
						value: maxCapacity,
						label: 'Capacity',
						colour: 'var(--chart-1)'
					}
				];
				const padding = 0.15;
				chartStore.setYDomain([0, maxCapacity * (1 + padding)]);
			} else {
				chartStore.yReferenceLines = [];
				chartStore.setYDomain(undefined);
			}
			return;
		}

		const refLines = [];
		if (capacitySums.positive > 0) {
			refLines.push({
				value: capacitySums.positive,
				label: 'Generation Capacity',
				colour: 'var(--chart-1)'
			});
		}
		if (capacitySums.negative > 0) {
			refLines.push({
				value: -capacitySums.negative,
				label: 'Load Capacity',
				colour: 'var(--chart-1)'
			});
		}
		chartStore.yReferenceLines = refLines;

		const padding = 0.15;
		const yMax = capacitySums.positive > 0 ? capacitySums.positive * (1 + padding) : undefined;
		const yMin = capacitySums.negative > 0 ? -capacitySums.negative * (1 + padding) : undefined;
		if (yMax !== undefined || yMin !== undefined) {
			const minValue = hasBatteryUnits ? (yMin ?? -(yMax ?? 0)) : (yMin ?? 0);
			chartStore.setYDomain([minValue, yMax ?? 0]);
		} else {
			chartStore.setYDomain(undefined);
		}
	});

	let isDataReady = $derived(chartStore !== null);

	// ============================================
	// Formatters
	// ============================================

	/**
	 * Format date for X axis ticks (day starts only)
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatXAxis(d) {
		if (!(d instanceof Date)) return String(d);

		return new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: ianaTimeZone
		}).format(d);
	}

	// ============================================
	// Pan Handlers
	// ============================================

	function handlePanStart() {
		isPanning = true;
		// Clear hover during pan
		chartStore?.clearHover();
	}

	/**
	 * Handle pan movement — shift viewport by time delta
	 * @param {number} deltaMs
	 */
	function handlePan(deltaMs) {
		// deltaMs is positive when dragging right (moving backward in time)
		// We invert: dragging right should show earlier data
		let newStart = viewStart - deltaMs;
		let newEnd = viewEnd - deltaMs;

		// Clamp: don't allow panning past current time
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - (viewEnd - viewStart);
		}

		viewStart = newStart;
		viewEnd = newEnd;
		lastPanDelta = deltaMs;

		// Request data for any uncached range
		dataManager?.requestRange(viewStart, viewEnd);
	}

	function handlePanEnd() {
		isPanning = false;

		// Prefetch 1x viewport ahead in the pan direction
		const viewportWidth = viewEnd - viewStart;
		const now = Date.now();
		if (lastPanDelta < 0 && viewEnd < now) {
			// Was panning left (toward future) — prefetch ahead, clamped to now
			dataManager?.requestRange(viewEnd, Math.min(viewEnd + viewportWidth, now));
		} else if (lastPanDelta > 0) {
			// Was panning right (toward past) — prefetch behind
			dataManager?.requestRange(viewStart - viewportWidth, viewStart);
		}

		// Notify parent of viewport change
		onviewportchange?.({ start: viewStart, end: viewEnd });
	}

	// ============================================
	// Zoom Handler
	// ============================================

	/**
	 * Handle zoom — scale viewport around the cursor/pinch center point.
	 * @param {number} factor - Zoom factor (>1 = zoom in, <1 = zoom out)
	 * @param {number} centerMs - Time position to anchor the zoom to
	 */
	function handleZoom(factor, centerMs) {
		const duration = viewEnd - viewStart;
		const newDuration = Math.min(Math.max(duration / factor, MIN_VIEWPORT_MS), MAX_VIEWPORT_MS);

		// Anchor zoom to cursor position — keep centerMs at the same screen proportion
		const ratio = (centerMs - viewStart) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		// Clamp to present
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}

		viewStart = newStart;
		viewEnd = newEnd;

		// Request data for any uncached range
		dataManager?.requestRange(viewStart, viewEnd);

		// Notify parent of viewport change
		onviewportchange?.({ start: viewStart, end: viewEnd });
	}

	// ============================================
	// Wheel Zoom (on container div, outside SVG)
	// ============================================

	/** @type {HTMLDivElement | undefined} */
	let chartContainerEl = $state(undefined);

	/**
	 * Wheel zoom handler — attached imperatively with { passive: false }
	 * on the chart container div so preventDefault() works.
	 * Only activates when Cmd (Mac) or Ctrl (Win/Linux) is held.
	 * @param {WheelEvent} event
	 */
	function handleWheel(event) {
		if (!event.metaKey && !event.ctrlKey) return;

		event.preventDefault();

		const factor = Math.pow(1.002, -event.deltaY);

		// Approximate cursor position in time-domain using the div's width
		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
		const centerMs = viewStart + ratio * (viewEnd - viewStart);

		handleZoom(factor, centerMs);
	}

	// Attach wheel listener imperatively with { passive: false }
	$effect(() => {
		const el = chartContainerEl;
		if (!el) return;

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	// ============================================
	// Button Zoom
	// ============================================

	/** Zoom factor per button click */
	const BUTTON_ZOOM_FACTOR = 1.5;

	function zoomIn() {
		const center = (viewStart + viewEnd) / 2;
		handleZoom(BUTTON_ZOOM_FACTOR, center);
	}

	function zoomOut() {
		const center = (viewStart + viewEnd) / 2;
		handleZoom(1 / BUTTON_ZOOM_FACTOR, center);
	}

	let isAtMinZoom = $derived(viewEnd - viewStart <= MIN_VIEWPORT_MS);
	let isAtMaxZoom = $derived(viewEnd - viewStart >= MAX_VIEWPORT_MS);

	// ============================================
	// Hover/Focus Handlers
	// ============================================

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		if (isPanning) return;
		chartStore?.setHover(time, key);
	}

	function handleHoverEnd() {
		chartStore?.clearHover();
	}

	/**
	 * @param {number} time
	 */
	function handleFocus(time) {
		if (isPanning) return;
		chartStore?.toggleFocus(time);
	}

	// ============================================
	// Public Methods
	// ============================================

	/**
	 * Set viewport to a specific time range (e.g. from DateRangePicker)
	 * @param {number} startMs
	 * @param {number} endMs
	 */
	export function setViewport(startMs, endMs) {
		const now = Date.now();
		viewStart = startMs;
		viewEnd = Math.min(endMs, now);
		dataManager?.requestRange(viewStart, viewEnd);
	}

	/**
	 * Get unit colours map for use in parent component (e.g., units table)
	 * @returns {Record<string, string>}
	 */
	export function getUnitColours() {
		return unitColours;
	}
</script>

<!-- Chart Header -->
<div class="flex flex-wrap items-center justify-between gap-1 mb-1">
	{#if title}
		<h3 class="text-sm font-medium text-dark-grey">{title}</h3>
	{/if}

	<div class="flex items-center gap-2">
		<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
			{#each ['5m', '30m'] as interval}
				<button
					class="px-2.5 py-1 text-xs font-medium rounded transition-colors {selectedInterval === interval
						? 'bg-white text-dark-grey shadow-sm'
						: 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (selectedInterval = /** @type {'5m' | '30m'} */ (interval))}
				>
					{interval === '5m' ? '5 min' : '30 min'}
				</button>
			{/each}
		</div>

		<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
			<button
				class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMaxZoom ? 'text-mid-warm-grey cursor-not-allowed' : 'text-mid-grey hover:text-dark-grey hover:bg-white'}"
				onclick={zoomOut}
				disabled={isAtMaxZoom}
				title="Zoom out"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
			<button
				class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMinZoom ? 'text-mid-warm-grey cursor-not-allowed' : 'text-mid-grey hover:text-dark-grey hover:bg-white'}"
				onclick={zoomIn}
				disabled={isAtMinZoom}
				title="Zoom in"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
		</div>
	</div>
</div>

<!-- Main Chart -->
{#if isDataReady && chartStore}
	<div bind:this={chartContainerEl} class="border border-light-warm-grey rounded-lg p-4">
		<StratumChart
			chart={chartStore}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			onpanstart={handlePanStart}
			onpan={handlePan}
			onpanend={handlePanEnd}
			onzoom={handleZoom}
			enablePan={true}
			loadingRanges={dataManager?.loadingRanges ?? []}
		/>
	</div>
{:else if powerData !== null && !isDataReady}
	<!-- No data found -->
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeight}"
	>
		<div class="text-center text-mid-grey">
			<p class="text-sm">No power data found</p>
			<p class="text-xs mt-1">Data may not be available for this facility</p>
		</div>
	</div>
{:else if powerData === null}
	<div class="flex items-center justify-center py-12">
		<div class="flex items-center gap-3 text-mid-warm-grey">
			<svg
				class="animate-spin h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span>Loading power data...</span>
		</div>
	</div>
{/if}
