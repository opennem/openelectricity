<script>
	/**
	 * FacilityChart - Reusable facility power visualization component
	 *
	 * Displays power generation data for a facility with unit-level breakdown,
	 * horizontal panning, client-side data caching, and fuel tech color coding.
	 */

	import {
		ChartStore,
		StratumChart
	} from '$lib/components/charts/v2';
	import { aggregateToInterval, aggregateToMonth } from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { analyzeUnits } from './unit-analysis.js';
	import { computeEnergyGridlines } from '$lib/components/charts/v2/energy-gridlines.js';
	import { formatXAxis, getDayStartDates } from '$lib/components/charts/v2/formatters.js';
	import chroma from 'chroma-js';
	import { untrack } from 'svelte';

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
	 * @property {string} [interval] - API interval (5m, 1d, 1M)
	 * @property {string} [metric] - API metric (power, energy)
	 * @property {string} [title] - Chart title
	 * @property {string} [chartHeight] - Chart height class
	 * @property {number} [chartHeightPx] - Chart height in pixels (overrides chartHeight when set)
	 * @property {boolean} [useDivergingStack] - Stack positive/negative values independently (default: false)
	 * @property {string} [dateStart] - Initial date start string (YYYY-MM-DD) for viewport when no seeded cache
	 * @property {string} [dateEnd] - Initial date end string (YYYY-MM-DD) for viewport when no seeded cache
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange] - Callback when viewport changes (for DateRangePicker sync)
	 * @property {((tableData: {data: any[], seriesNames: string[], seriesLabels: Record<string, string>}) => void)} [onvisibledata] - Callback with debounced visible data for external table
	 * @property {((interval: string) => void)} [ondisplayintervalchange] - Callback when display interval changes (power: '5m'/'30m', energy: '1d'/'1M')
	 * @property {boolean} [showIntervalToggle] - Whether to show the interval toggle buttons (default: true)
	 */

	/** @type {Props} */
	let {
		facility,
		powerData,
		timeZone,
		interval = '5m',
		metric = 'power',
		title = '',
		chartHeight = 'h-[400px]',
		chartHeightPx = 0,
		useDivergingStack = false,
		dateStart = '',
		dateEnd = '',
		onviewportchange,
		onvisibledata,
		ondisplayintervalchange,
		showIntervalToggle = true
	} = $props();

	/**
	 * Set the display interval from outside (e.g. ChartRangeBar dropdown)
	 * @param {string} intv - '5m' | '30m' | '1d' | '1M'
	 */
	export function setDisplayInterval(intv) {
		if (intv === '5m' || intv === '30m') {
			manualInterval = /** @type {'5m' | '30m'} */ (intv);
		} else if (intv === '1d' || intv === '1M') {
			manualEnergyInterval = /** @type {'1d' | '1M'} */ (intv);
		}
	}

	// ============================================
	// Derived: Timezone
	// ============================================

	/**
	 * Map offset to IANA timezone for Intl.DateTimeFormat (which doesn't support offsets)
	 * Uses DST-free zones: Brisbane (AEST +10), Perth (AWST +8)
	 */
	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	// ============================================
	// Derived: Unit Analysis
	// ============================================

	let analysis = $derived.by(() => {
		if (!facility) return null;
		return analyzeUnits(facility, getFuelTechColor);
	});

	let unitColours = $derived(analysis?.unitColours ?? {});
	let unitFuelTechMap = $derived(analysis?.unitFuelTechMap ?? {});
	let unitCodeDisplayMap = $derived(analysis?.unitCodeDisplayMap ?? {});
	let unitOrder = $derived(analysis?.unitOrder ?? []);
	let loadIds = $derived(analysis?.loadIds ?? []);
	let hasBatteryUnits = $derived(analysis?.hasBatteryUnits ?? false);
	let capacitySums = $derived(analysis?.capacitySums ?? { positive: 0, negative: 0 });

	// ============================================
	// Viewport State
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);

	/** Whether the user has manually picked an interval (overrides auto) */
	let manualInterval = $state(/** @type {'5m' | '30m' | null} */ (null));

	/** Auto-select 5m when zoomed into < 2 days, 30m otherwise */
	const AUTO_5M_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
	let autoInterval = $derived(
		/** @type {'5m' | '30m'} */ (viewEnd - viewStart <= AUTO_5M_THRESHOLD_MS ? '5m' : '30m')
	);

	// Clear manual override when auto interval changes (zoom crosses threshold)
	$effect(() => {
		const _auto = autoInterval; // track
		manualInterval = null;
	});

	/** @type {'5m' | '30m'} */
	let selectedInterval = $derived(manualInterval ?? autoInterval);

	/** Whether the user has manually picked an energy display interval */
	let manualEnergyInterval = $state(/** @type {'1d' | '1M' | null} */ (null));

	/** Auto-select monthly when viewport > 1 year, daily otherwise */
	const AUTO_MONTHLY_THRESHOLD_MS = 366 * 24 * 60 * 60 * 1000;
	let autoEnergyInterval = $derived(
		/** @type {'1d' | '1M'} */ (viewEnd - viewStart >= AUTO_MONTHLY_THRESHOLD_MS ? '1M' : '1d')
	);

	// Clear manual energy override when auto changes (zoom crosses threshold)
	$effect(() => {
		const _auto = autoEnergyInterval;
		manualEnergyInterval = null;
	});

	/** @type {'1d' | '1M'} */
	let selectedEnergyInterval = $derived(manualEnergyInterval ?? autoEnergyInterval);

	/** Whether we're showing energy data (1d interval) vs power (5m) */
	let isEnergyMetric = $derived(metric === 'energy');

	// Notify parent when effective display interval changes
	$effect(() => {
		// For coarse API intervals (3M, 1y), report the API interval directly
		const intv = (interval === '3M' || interval === '1y')
			? interval
			: isEnergyMetric ? selectedEnergyInterval : selectedInterval;
		ondisplayintervalchange?.(intv);
	});

	/** Minimum viewport duration: 1 hour for power, 5 days for energy */
	let MIN_VIEWPORT_MS = $derived(isEnergyMetric ? 5 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000);
	/** Maximum viewport duration: 16 days for power, 10 years for energy */
	let MAX_VIEWPORT_MS = $derived(isEnergyMetric ? 50 * 365 * 24 * 60 * 60 * 1000 : 16 * 24 * 60 * 60 * 1000);

	/** Prefetch buffer multiplier — energy uses wider buffers since intervals are daily */
	let fetchBufferMultiplier = $derived(isEnergyMetric ? 3 : 1);

	/** Track the last pan direction for prefetching */
	/** @type {number} */
	let lastPanDelta = $state(0);

	/** Whether we're currently in a pan gesture */
	let isPanning = $state(false);

	// ============================================
	// Data Manager
	// ============================================

	/**
	 * Get display label for a unit
	 * @param {string} unitCode
	 * @param {string} fuelTech
	 * @returns {string}
	 */
	function getLabel(unitCode, fuelTech) {
		const displayCode = unitCodeDisplayMap[unitCode] ?? unitCode;
		return `${displayCode} (${fuelTechNameMap[fuelTech] || fuelTech})`;
	}

	/**
	 * Get colour for a unit — needs dynamic unitColours
	 */
	let getColour = $derived.by(() => {
		const colourMap = unitColours;
		return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = analysis?.loadIds.includes(`power_${unitCode}`) ?? false;
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	});

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	/** @type {Map<string, ChartDataManager>} Background prefetched managers */
	let prefetchCache = new Map();

	// Initialize/reinitialize data manager when facility or interval/metric changes
	$effect(() => {
		if (!facility) {
			dataManager = null;
			prefetchCache.clear();
			return;
		}

		// Track interval and metric as dependencies
		const currentInterval = interval;
		const currentMetric = metric;
		const currentCode = facility.code;

		// Clear prefetch cache if facility changed
		const existingCode = untrack(() => dataManager?.facilityCode);
		if (existingCode && existingCode !== currentCode) {
			prefetchCache.clear();
		}

		// Skip recreation if existing manager already matches
		const existing = untrack(() => dataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === currentMetric
		) {
			return;
		}

		// Check prefetch cache before creating a new manager
		const prefetchKey = `${currentInterval}-${currentMetric}`;
		const prefetched = prefetchCache.get(prefetchKey);
		if (prefetched && prefetched.facilityCode === currentCode) {
			prefetchCache.delete(prefetchKey);
			dataManager = prefetched;

			// Still need to request the viewport range (may already be cached)
			const start = untrack(() => viewStart);
			const end = untrack(() => viewEnd);
			if (start && end) {
				const duration = end - start;
				const bufferMultiplier = currentMetric === 'energy' ? 3 : 1;
				const buffer = duration * bufferMultiplier;
				prefetched.requestRange(start - buffer, Math.min(end + buffer, Date.now()));
			}
			return;
		}

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId: facility.network_id,
			interval: currentInterval,
			metric: currentMetric,
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds,
			getLabel,
			getColour
		});

		// Only seed with server power data if the metric matches and data exists
		if (currentMetric === 'power' && powerData) {
			manager.seedCache(powerData);
		}

		// Use untrack so viewStart/viewEnd don't become dependencies of this effect.
		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);

		if (!start && !end) {
			// First load — set viewport from seeded cache
			if (manager.cacheStart !== null && manager.cacheEnd !== null) {
				viewStart = manager.cacheStart;
				viewEnd = Math.min(manager.cacheEnd, Date.now());
			} else if (dateStart && dateEnd) {
				// No seeded cache (e.g. energy mode on page load) — use date props
				const tz = timeZone || '+10:00';
				viewStart = new Date(dateStart + 'T00:00:00' + tz).getTime();
				viewEnd = Math.min(new Date(dateEnd + 'T23:59:59' + tz).getTime(), Date.now());
				const duration = viewEnd - viewStart;
				const bufferMultiplier = currentMetric === 'energy' ? 3 : 1;
				const buffer = duration * bufferMultiplier;
				manager.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, Date.now()));
			}
		} else {
			// Switching interval/metric — keep current viewport, fetch immediately
			// (no debounce) so data loads even during continuous zoom gestures
			const duration = end - start;
			const bufferMultiplier = currentMetric === 'energy' ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		dataManager = manager;
	});

	// Prefetch common ranges after initial load completes
	$effect(() => {
		const manager = dataManager;
		if (!manager || !manager.initialLoadComplete) return;
		if (!facility) return;

		// Only prefetch from the initial power mode (don't re-prefetch on every switch)
		if (manager.metric !== 'power') return;

		const now = Date.now();

		// 1. Extend power cache to 7 days
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
		manager.requestRange(sevenDaysAgo, now);

		// 2. Background energy/1d manager for 1-year range
		const energyKey = '1d-energy';
		if (prefetchCache.has(energyKey)) return;

		const energyManager = new ChartDataManager({
			facilityCode: facility.code,
			networkId: facility.network_id,
			interval: '1d',
			metric: 'energy',
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds,
			getLabel,
			getColour
		});

		const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
		energyManager.requestRange(oneYearAgo, now);
		prefetchCache.set(energyKey, energyManager);
	});

	// ============================================
	// Chart Store — created once, updated reactively
	// ============================================

	// Create chart store per facility — recreated when facility changes.
	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
	let chartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-chart'),
			title: title || facility.name || 'Facility',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: timeZone
		});
		chart.chartStyles.chartHeightClasses = chartHeight;
		if (chartHeightPx) chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.useDivergingStack = useDivergingStack;
		chart.lighterNegative = hasBatteryUnits;
		chart.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);

		return chart;
	});

	// Update chart height when panel resizes
	$effect(() => {
		if (chartStore && chartHeightPx) {
			chartStore.chartStyles.chartHeightPx = chartHeightPx;
		}
	});

	// Update series metadata when data manager provides processed data
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		const processed = dataManager.processedCache;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Update metric-dependent config (curve type, unit) reactively
	$effect(() => {
		if (!chartStore) return;

		const isEnergy = isEnergyMetric;
		chartStore.chartOptions.baseUnit = isEnergy ? 'Wh' : 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (isEnergy ? 'step' : 'straight');
	});

	// Update chart data/domain when viewport, interval, or data changes
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		const start = viewStart;
		const end = viewEnd;
		const displayInterval = selectedInterval;
		const energyDisplayInterval = selectedEnergyInterval;
		const isEnergy = isEnergyMetric;

		let visibleData = dataManager.getDataForRange(start, end);

		// Skip client-side aggregation when API interval is already coarse (3M, 1y)
		const apiInterval = interval;

		// Aggregate daily energy to monthly when selected (only if API returned daily data)
		if (isEnergy && apiInterval === '1d' && energyDisplayInterval === '1M' && visibleData.length > 0 && dataManager.seriesMeta) {
			visibleData = aggregateToMonth(
				visibleData,
				dataManager.seriesMeta.seriesNames,
				ianaTimeZone,
				'sum'
			);
		}

		// Aggregate to 30m for power mode when selected
		if (!isEnergy && displayInterval === '30m' && visibleData.length > 0 && dataManager.seriesMeta) {
			visibleData = aggregateToInterval(
				visibleData,
				'30m',
				dataManager.seriesMeta.seriesNames,
				'mean'
			);
		}

		chartStore.seriesData = visibleData;
		chartStore.xDomain = /** @type {[number, number]} */ ([start, end]);

		if (isEnergy && visibleData.length > 1) {
			const g = computeEnergyGridlines(visibleData, start, end, ianaTimeZone);
			chartStore.xGridlineTicks = g.gridlineTicks;
			chartStore.xTicks = g.ticks;
			chartStore.formatTickX = g.formatTick;
		} else {
			const dayStarts = getDayStartDates(visibleData, ianaTimeZone, timeZone);
			chartStore.xTicks = dayStarts;
			chartStore.xGridlineTicks = dayStarts;
			chartStore.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
		}
	});

	// Update reference lines and yDomain reactively
	$effect(() => {
		if (!chartStore) return;

		// No capacity reference lines for energy charts (MW doesn't apply to MWh)
		if (isEnergyMetric) {
			chartStore.yReferenceLines = [];
			chartStore.setYDomain(undefined);
			return;
		}

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

	/** Debounced callback for visible data — only fires after pan/zoom settles */
	/** @type {ReturnType<typeof setTimeout> | null} */
	let tableDebounceTimer = null;

	$effect(() => {
		// Track reactive dependencies
		const start = viewStart;
		const end = viewEnd;
		const displayInterval = selectedInterval;
		const energyDisplayInterval = selectedEnergyInterval;
		const isEnergy = isEnergyMetric;
		const manager = dataManager;
		const _cache = manager?.processedCache; // track cache changes
		const callback = onvisibledata;

		if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		if (!callback || !manager?.processedCache || !manager.seriesMeta) return;

		const meta = manager.seriesMeta;
		tableDebounceTimer = setTimeout(() => {
			let rows = manager.getDataForRange(start, end);
			if (isEnergy && interval === '1d' && energyDisplayInterval === '1M' && rows.length > 0) {
				rows = aggregateToMonth(rows, meta.seriesNames, ianaTimeZone, 'sum');
			} else if (!isEnergy && displayInterval === '30m' && rows.length > 0) {
				rows = aggregateToInterval(rows, '30m', meta.seriesNames, 'mean');
			}
			callback({
				data: rows,
				seriesNames: meta.seriesNames,
				seriesLabels: meta.seriesLabels
			});
		}, 300);
	});

	/**
	 * Show loading overlay when the chart has no visible data and data is being fetched.
	 */
	let showLoadingOverlay = $derived.by(() => {
		if (!dataManager || !chartStore) return false;
		if (chartStore.seriesData.length > 0) return false;

		// No data yet — show overlay if still loading or haven't loaded
		return !dataManager.initialLoadComplete || dataManager.isLoading || dataManager.hasPendingFetch;
	});

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

		// Request data for any uncached range (wider buffer for energy)
		const viewportWidth = viewEnd - viewStart;
		const buffer = viewportWidth * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, viewEnd + buffer);
	}

	function handlePanEnd() {
		isPanning = false;

		// Prefetch ahead in the pan direction (wider for energy)
		const viewportWidth = viewEnd - viewStart;
		const prefetch = viewportWidth * fetchBufferMultiplier;
		const now = Date.now();
		if (lastPanDelta < 0 && viewEnd < now) {
			// Was panning left (toward future) — prefetch ahead, clamped to now
			dataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
		} else if (lastPanDelta > 0) {
			// Was panning right (toward past) — prefetch behind
			dataManager?.requestRange(viewStart - prefetch, viewStart);
		}

	}

	// Reactively notify parent whenever viewport changes (pan, zoom, setViewport, initial load, metric switch)
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;
		onviewportchange?.({ start, end });
	});

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

		// Request data for any uncached range (wider buffer for energy)
		const buffer = newDuration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, viewEnd + buffer);
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

		// Prefetch with buffer so panning has data ready
		const duration = viewEnd - viewStart;
		const buffer = duration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, now));
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
		{#if showIntervalToggle}
		<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
			<button
				class="px-2.5 py-1 text-xs font-medium rounded transition-colors {!isEnergyMetric && selectedInterval === '5m'
					? 'bg-white text-dark-grey shadow-sm'
					: isEnergyMetric
						? 'text-mid-warm-grey cursor-not-allowed'
						: 'text-mid-grey hover:text-dark-grey'}"
				disabled={isEnergyMetric}
				onclick={() => { manualInterval = '5m'; }}
			>5min</button>
			<button
				class="px-2.5 py-1 text-xs font-medium rounded transition-colors {!isEnergyMetric && selectedInterval === '30m'
					? 'bg-white text-dark-grey shadow-sm'
					: isEnergyMetric
						? 'text-mid-warm-grey cursor-not-allowed'
						: 'text-mid-grey hover:text-dark-grey'}"
				disabled={isEnergyMetric}
				onclick={() => { manualInterval = '30m'; }}
			>30min</button>
			<button
				class="px-2.5 py-1 text-xs font-medium rounded transition-colors {isEnergyMetric && selectedEnergyInterval === '1d'
					? 'bg-white text-dark-grey shadow-sm'
					: !isEnergyMetric
						? 'text-mid-warm-grey cursor-not-allowed'
						: 'text-mid-grey hover:text-dark-grey'}"
				disabled={!isEnergyMetric}
				onclick={() => { manualEnergyInterval = '1d'; }}
			>Daily</button>
			<button
				class="px-2.5 py-1 text-xs font-medium rounded transition-colors {isEnergyMetric && selectedEnergyInterval === '1M'
					? 'bg-white text-dark-grey shadow-sm'
					: !isEnergyMetric
						? 'text-mid-warm-grey cursor-not-allowed'
						: 'text-mid-grey hover:text-dark-grey'}"
				disabled={!isEnergyMetric}
				onclick={() => { manualEnergyInterval = '1M'; }}
			>Monthly</button>
		</div>
		{/if}

	</div>
</div>

<!-- Main Chart -->
{#if chartStore}
	<div bind:this={chartContainerEl} class="border border-light-warm-grey rounded-lg p-4 relative">
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
			viewDomain={null}
			loadingRanges={dataManager?.loadingRanges ?? []}
		/>

		{#if showLoadingOverlay}
			<!-- Loading overlay — previous chart stays visible underneath -->
			<div class="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
				<div class="flex items-center gap-3 text-mid-warm-grey">
					<svg
						class="animate-spin h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span class="text-sm">Loading data...</span>
				</div>
			</div>
		{/if}

		<!-- Zoom buttons (centered) -->
		<div class="absolute top-24 right-6 flex items-center gap-0.5 bg-white/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm border border-light-warm-grey">
			<button
				class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMaxZoom ? 'text-mid-warm-grey cursor-not-allowed' : 'text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey'}"
				onclick={zoomOut}
				disabled={isAtMaxZoom}
				title="Zoom out"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
			<button
				class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMinZoom ? 'text-mid-warm-grey cursor-not-allowed' : 'text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey'}"
				onclick={zoomIn}
				disabled={isAtMinZoom}
				title="Zoom in"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
		</div>
	</div>

{:else}
	<!-- No facility — chart store not created yet -->
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeightPx ? '' : chartHeight}"
		style:height={chartHeightPx ? `${chartHeightPx}px` : undefined}
	>
		<div class="flex items-center gap-3 text-mid-warm-grey">
			<svg
				class="animate-spin h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm">Loading data...</span>
		</div>
	</div>
{/if}
