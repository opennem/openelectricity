<script>
	/**
	 * FacilityChart - Reusable facility power visualization component
	 *
	 * Displays power generation data for a facility with unit-level breakdown,
	 * horizontal panning, client-side data caching, and fuel tech color coding.
	 */

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { createFacilityDataManager } from './facility-data-manager.js';
	import { createManagerStash } from '$lib/components/charts/v2/manager-stash.js';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { analyzeUnits, unitSeriesIds } from './unit-analysis.js';
	import { capacityAnnotations } from './capacity-annotations.js';
	import { makeUnitLabelGetter, makeLoadAwareColourGetter } from './helpers.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '$lib/components/charts/v2/chart-loading-state.js';
	import { combinedMetricsFor, buildCombinedMetricsUrl } from './energy-basis.js';
	import { untrack } from 'svelte';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { perfSpan } from '../v2/perf.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} facility - Facility object with units array
	 * @property {any} powerData - Power data from API
	 * @property {string} timeZone - Timezone offset string (+10:00 or +08:00)
	 * @property {string} [interval] - API interval (5m, 1d, 1M)
	 * @property {string} [metric] - API metric (power, energy)
	 * @property {string} [displayInterval] - Display interval for aggregation (5m, 30m, 1d, 1M)
	 * @property {string} [chartHeight] - Chart height class
	 * @property {number} [chartHeightPx] - Chart height in pixels (overrides chartHeight when set)
	 * @property {boolean} [useDivergingStack] - Stack positive/negative values independently (default: false)
	 * @property {string} [dateStart] - Initial date start string (YYYY-MM-DD) for viewport when no seeded cache
	 * @property {string} [dateEnd] - Initial date end string (YYYY-MM-DD) for viewport when no seeded cache
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange] - Callback when viewport changes (for DateRangePicker sync)
	 * @property {((tableData: {data: any[], seriesNames: string[], seriesLabels: Record<string, string>}) => void)} [onvisibledata] - Callback with debounced visible data for external table
	 * @property {boolean} [showAnnotations] - Whether to show capacity reference lines (default: false)
	 * @property {boolean} [showHeader] - Whether to show the chart title/header bar (default: true)
	 * @property {boolean} [showOptions] - Whether to show the chart options (download, etc) in the header (default: true)
	 * @property {boolean} [showZoomControls] - Whether to show the +/- zoom buttons (default: true). See `zoomMode` for placement.
	 * @property {'floating' | 'static' | 'none'} [zoomMode] - Zoom button placement: 'floating' (card overlay at the top-right that fades in on hover) or 'static' (flat buttons inline at the right of the options bar). Default: 'static'.
	 * @property {boolean} [showContainer] - Whether to wrap the chart in the default bordered + padded container (default: true). Set false to render the chart flush against the parent.
	 * @property {'strip' | 'floating' | 'none'} [tooltipMode] - Tooltip style: 'strip' above the chart (default), 'floating' overlaid at the cursor, or 'none'.
	 * @property {boolean} [showTooltipDate] - Whether the tooltip shows its date/time header (default: true).
	 * @property {boolean} [tightAxisClip] - Clip gridlines/axis labels to the exact chart area (default: false). Use for compact charts where gridlines shouldn't extend past the edges.
	 * @property {number} [overlayInsetPx] - Horizontal standoff (px) between overlay controls (zoom buttons, floating tooltip) and the chart's left/right edges. Use when the chart is rendered flush to its container and the overlays would otherwise touch the edge. Default 0.
	 * @property {string} [title] - Override the chart header title (defaults to facility.name).
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync. When set, the chart renders its crosshair/tooltip at this time.
	 * @property {((time: number | undefined) => void)} [onhoverchange] - Called when the local hover state changes so a parent can sync peer charts.
	 * @property {number | undefined} [focusTime] - External focus (pinned) time for cross-chart sync. When set, the chart pins its crosshair/tooltip at this time.
	 * @property {((time: number | undefined) => void)} [onfocuschange] - Called when the local focus state changes so a parent can sync peer charts.
	 * @property {((state: { hasData: boolean }) => void)} [onloadcomplete] - Called once the initial client-side fetch/seed settles. `hasData` reflects whether any data was found, letting a parent distinguish "still loading" from "no data" (e.g. to show an empty state). Stays accurate across panning.
	 * @property {'always' | 'tap-to-engage'} [panZoomMode] - 'always' (default) keeps pan/zoom active. 'tap-to-engage' gates pan/zoom behind the bindable `panZoomEngaged` flag.
	 * @property {boolean} [panZoomEngaged] - Bindable engagement state for tap-to-engage mode.
	 * @property {boolean} [enablePan] - Whether drag/wheel pan is enabled (default: true). Set false for a fixed-window snapshot chart (hover still works).
	 * @property {boolean} [resizable] - Whether to show the drag-to-resize handle below the chart (default: true). Set false for a fixed-height snapshot so the chart honours `chartHeight` and doesn't share the persisted resize height.
	 * @property {number | Array<any> | ((ticks: any[]) => any[])} [yTicks] - Y-axis ticks passed through to AxisY: a count, an explicit array, or a function that thins the scale's default ticks. Omit for the AxisY default (4).
	 * @property {boolean} [bundleDerivedMetrics] - Fetch via the combined `metric=<metric>,market_value,emissions` URL so this chart shares one request with the financial/emissions providers mounted alongside it. Only enable when those providers are present (the facility detail page); off elsewhere to avoid pulling unused metrics.
	 * @property {boolean} [prefetchRanges] - Whether to background-prefetch the 7-day power and 1-year energy ranges after the initial load (default: true). Disable for compact consumers (e.g. the unit detail sheet) where the prefetch would duplicate the main page's cache.
	 * @property {string[]} [hiddenUnitCodes] - Unit codes whose series are hidden from the chart (e.g. toggled off in the units panel). Mapped to `<metric>_<code>` series ids on the chart store.
	 */

	/** @typedef {import('$lib/components/charts/v2/ChartDataManager.svelte.js').default} ChartDataManager */

	/** @type {Props} */
	let {
		facility,
		powerData,
		timeZone,
		interval = '5m',
		metric = 'power',
		displayInterval = '30m',
		chartHeight = 'h-[400px]',
		chartHeightPx = 0,
		useDivergingStack = false,
		dateStart = '',
		dateEnd = '',
		onviewportchange,
		onvisibledata,
		showAnnotations = false,
		showHeader = true,
		showOptions = true,
		showZoomControls = true,
		zoomMode = /** @type {'floating' | 'static' | 'none'} */ ('static'),
		showContainer = true,
		tooltipMode = /** @type {'strip' | 'floating' | 'none'} */ ('strip'),
		showTooltipDate = true,
		tightAxisClip = false,
		overlayInsetPx = 0,
		title = '',
		hoverTime = undefined,
		onhoverchange,
		focusTime = undefined,
		onfocuschange,
		onloadcomplete,
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false),
		enablePan = true,
		resizable = true,
		yTicks = undefined,
		bundleDerivedMetrics = false,
		prefetchRanges = true,
		hiddenUnitCodes = []
	} = $props();

	// ============================================
	// Derived: Timezone
	// ============================================

	/**
	 * Map offset to IANA timezone for Intl.DateTimeFormat (which doesn't support offsets)
	 * Uses DST-free zones: Brisbane (AEST +10), Perth (AWST +8)
	 */
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));

	// ============================================
	// Derived: Unit Analysis
	// ============================================

	let analysis = $derived.by(() => {
		if (!facility) return null;
		return analyzeUnits(facility, getFuelTechColour);
	});

	let unitColours = $derived(analysis?.unitColours ?? {});
	let unitFuelTechMap = $derived(analysis?.unitFuelTechMap ?? {});
	let unitCodeDisplayMap = $derived(analysis?.unitCodeDisplayMap ?? {});
	let orderedCodes = $derived(analysis?.orderedCodes ?? []);
	let loadCodes = $derived(analysis?.loadCodes ?? []);
	let hasBatteryUnits = $derived(analysis?.hasBatteryUnits ?? false);
	let capacitySums = $derived(analysis?.capacitySums ?? { positive: 0, negative: 0 });

	/** Identity of the unit set — a units-only change (e.g. battery net ⇄ split)
	 *  must recreate the managers even though facility/interval/metric match. */
	let unitsKey = $derived(analysis?.unitsKey ?? '');

	// ============================================
	// Viewport State
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);

	/** Whether we're showing energy data (1d interval) vs power (5m) */
	let isEnergyMetric = $derived(metric === 'energy');

	/** Minimum viewport duration: 1 hour for power, 5 days for energy */
	let MIN_VIEWPORT_MS = $derived(isEnergyMetric ? 5 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000);
	/** Maximum viewport duration: 16 days for power, 10 years for energy */
	let MAX_VIEWPORT_MS = $derived(
		isEnergyMetric ? 50 * 365 * 24 * 60 * 60 * 1000 : 16 * 24 * 60 * 60 * 1000
	);

	/** Prefetch buffer multiplier — energy uses wider buffers since intervals are daily */
	let fetchBufferMultiplier = $derived(isEnergyMetric ? 3 : 1);

	/** Whether we're currently in a pan gesture */
	let isPanning = $state(false);

	// ============================================
	// Data Manager
	// ============================================

	// The factories return closures over plain values only — they're handed to
	// ChartDataManagers, whose async continuations can outlive this component.
	let getLabel = $derived(makeUnitLabelGetter(unitCodeDisplayMap, fuelTechNameMap));
	let getColour = $derived(makeLoadAwareColourGetter(unitColours, loadCodes, getFuelTechColour));

	/**
	 * When `bundleDerivedMetrics` is on, fetch via the combined
	 * `metric=<metric>,market_value,emissions` URL so this chart shares a single
	 * request with the financial/emissions providers (whose basis metric matches
	 * this chart's). Returns `null` otherwise so the manager uses its default URL.
	 *
	 * @param {string} code
	 * @param {string} metricForBundle
	 * @returns {((params: URLSearchParams) => string) | null}
	 */
	function bundledFetchUrl(code, metricForBundle) {
		if (!bundleDerivedMetrics) return null;
		return buildCombinedMetricsUrl(code, combinedMetricsFor(metricForBundle));
	}

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	/** Guards the one-shot empty-window retry (see the load-completion effect): set
	 *  once a facility's first window settles, so only that initial window can
	 *  auto-retry — a later grain switch keeps the user's viewport. Reset per facility. */
	let firstWindowSettled = false;

	/**
	 * Stashed managers keyed `${interval}-${metric}-${seriesKey}` — background
	 * prefetches plus previously-active managers kept warm so switching back to
	 * a range renders instantly from cache. Keys include the seriesKey so
	 * managers for different unit sets (battery net ⇄ split) coexist and a flip
	 * back revives the warm cache instead of refetching.
	 */
	const managerStash = createManagerStash();

	/**
	 * Stash the outgoing manager for instant back-switch, or retire it when it
	 * belongs to another facility (facility-navigation policy lives here; the
	 * LRU mechanics live in manager-stash.js).
	 * @param {ChartDataManager | null | undefined} manager
	 * @param {string} currentCode
	 */
	function stashOrDispose(manager, currentCode) {
		if (!manager) return;
		if (manager.cacheKey !== currentCode) {
			manager.dispose();
			return;
		}
		managerStash.stash(`${manager.interval}-${manager.metric}-${manager.seriesKey}`, manager);
	}

	/**
	 * Convert a YYYY-MM-DD date range (interpreted in the network tz) to epoch-ms
	 * bounds, clamping the end to now. Shared by the initial date-prop seed and the
	 * empty-window retry.
	 * @param {string} ds
	 * @param {string} de
	 * @param {string} tz - network offset e.g. '+10:00'
	 * @returns {{ startMs: number, endMs: number }}
	 */
	function dateBoundsMs(ds, de, tz) {
		const t = tz || '+10:00';
		return {
			startMs: new Date(ds + 'T00:00:00' + t).getTime(),
			endMs: Math.min(new Date(de + 'T23:59:59' + t).getTime(), Date.now())
		};
	}

	// Initialize/reinitialize data manager when facility or interval/metric changes
	$effect(() => {
		if (!facility) {
			untrack(() => dataManager)?.dispose();
			dataManager = null;
			managerStash.clear();
			return;
		}

		// Track interval, metric and the unit set as dependencies
		const currentInterval = interval;
		const currentMetric = metric;
		const currentCode = facility.code;
		const currentUnitsKey = unitsKey;

		// Clear prefetch cache if facility changed
		const existingCode = untrack(() => dataManager?.cacheKey);
		if (existingCode && existingCode !== currentCode) {
			managerStash.clear();
			// Re-arm the empty-window retry (see the load-completion effect) for the
			// new facility.
			firstWindowSettled = false;
		}

		// Skip recreation if existing manager already matches
		const existing = untrack(() => dataManager);
		if (
			existing &&
			existing.cacheKey === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === currentMetric &&
			existing.seriesKey === currentUnitsKey
		) {
			return;
		}

		// Check the stash before creating a new manager
		const prefetchKey = `${currentInterval}-${currentMetric}-${currentUnitsKey}`;
		const prefetched = managerStash.take(prefetchKey);
		if (prefetched && prefetched.cacheKey === currentCode) {
			stashOrDispose(existing, currentCode);
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
		// Unreachable in practice (the stash is cleared on facility change), but a
		// taken manager for another facility must not leak.
		prefetched?.dispose();

		// Read powerData without tracking — seeding is handled by a separate effect
		const currentPowerData = untrack(() => powerData);

		const manager = createFacilityDataManager({
			facilityCode: currentCode,
			networkId: facility.network_id,
			interval: currentInterval,
			metric: currentMetric,
			unitFuelTechMap,
			orderedCodes,
			loadCodes,
			getLabel,
			getColour,
			buildFetchUrl: bundledFetchUrl(currentCode, currentMetric)
		});

		// Seed with server power data if available synchronously
		if (currentMetric === 'power' && currentPowerData) {
			manager.seedCache(currentPowerData);
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
				const { startMs, endMs } = dateBoundsMs(dateStart, dateEnd, timeZone);
				viewStart = startMs;
				viewEnd = endMs;
				const buffer = (endMs - startMs) * fetchBufferMultiplier;
				manager.requestRange(startMs - buffer, Math.min(endMs + buffer, Date.now()));
			}
		} else {
			// Switching interval/metric — keep current viewport, fetch immediately
			// (no debounce) so data loads even during continuous zoom gestures
			const buffer = (end - start) * fetchBufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		// Keep the outgoing manager's cache warm for an instant back-switch.
		stashOrDispose(existing, currentCode);
		dataManager = manager;
	});

	// Seed manager with server power data when it arrives asynchronously
	$effect(() => {
		const manager = dataManager;
		const data = powerData;
		if (!manager || !data) return;
		if (manager.metric !== 'power') return;
		// Already has cached data — don't re-seed
		if (manager.cacheStart !== null) return;

		manager.seedCache(data);

		// Set viewport from seeded cache if not yet set
		const start = viewStart;
		const end = viewEnd;
		if (!start && !end && manager.cacheStart !== null && manager.cacheEnd !== null) {
			viewStart = manager.cacheStart;
			viewEnd = Math.min(manager.cacheEnd, Date.now());
		}
	});

	// Prefetch common ranges after initial load completes.
	// Uses untrack for requestRange calls to prevent cache $state from
	// becoming dependencies (which would cause a feedback loop on every merge).
	// Skipped for fixed-window snapshots (enablePan false) — they can't pan, so
	// the 7-day power and 1-year energy prefetches would be pure waste — and for
	// compact consumers that opt out via `prefetchRanges` (e.g. the unit sheet).
	$effect(() => {
		if (!enablePan || !prefetchRanges) return;
		const manager = dataManager;
		if (!manager || !manager.initialLoadComplete) return;
		if (!facility) return;

		// Only prefetch from the initial power mode (don't re-prefetch on every switch)
		if (manager.metric !== 'power') return;

		const currentCode = facility.code;
		const currentNetworkId = facility.network_id;
		const currentUnitsKey = unitsKey;

		untrack(() => {
			const now = Date.now();

			// 1. Extend power cache to 7 days
			const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
			manager.requestRange(sevenDaysAgo, now);

			// 2. Background energy/1d manager for 1-year range
			const energyKey = `1d-energy-${currentUnitsKey}`;
			if (managerStash.has(energyKey)) return;

			const energyManager = createFacilityDataManager({
				facilityCode: currentCode,
				networkId: currentNetworkId,
				interval: '1d',
				metric: 'energy',
				unitFuelTechMap,
				orderedCodes,
				loadCodes,
				getLabel,
				getColour,
				buildFetchUrl: bundledFetchUrl(currentCode, 'energy')
			});

			const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
			energyManager.requestRange(oneYearAgo, now);
			managerStash.stash(energyKey, energyManager);
		});
	});

	// Retire all managers on unmount so in-flight fetches settle as no-ops
	// instead of calling back into destroyed component state.
	$effect(() => {
		return () => {
			dataManager?.dispose();
			managerStash.clear();
		};
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
		chart.chartStyles.snapTicks = true;
		if (yTicks !== undefined) chart.yTicks = yTicks;
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

	// Keep chart title in sync with the `title` prop (e.g. Power ↔ Energy)
	$effect(() => {
		if (chartStore) {
			chartStore.title = title || facility?.name || 'Facility';
		}
	});

	// Mirror the tooltip date toggle into the store.
	$effect(() => {
		if (chartStore) chartStore.chartTooltips.showDate = showTooltipDate;
	});

	// Update series metadata when data manager provides processed data
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		const processed = dataManager.processedCache;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Hide externally-toggled units (e.g. from the units panel). Series ids carry
	// the metric prefix (power_<code> / energy_<code>); unknown ids are harmless.
	$effect(() => {
		if (!chartStore) return;
		chartStore.hiddenSeriesNames = unitSeriesIds(metric, hiddenUnitCodes);
	});

	// Update metric-dependent config (curve type, unit) reactively
	$effect(() => {
		if (!chartStore) return;

		const isEnergy = isEnergyMetric;
		chartStore.chartOptions.baseUnit = isEnergy ? 'Wh' : 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (isEnergy ? 'step' : 'straight');
	});

	// Memoises the slice + display aggregation on (cache identity, slice indices,
	// options) so pan ticks within one native sample — and effect re-runs from
	// unrelated dependencies — reuse the previous rows array. The stable reference
	// makes the `seriesData` assignment below a signal no-op on a hit.
	const visibleAggregation = createVisibleAggregation();

	// Update chart data/domain when viewport, interval, or data changes
	$effect(() => {
		const manager = dataManager;
		if (!chartStore || !manager?.processedCache) return;

		perfSpan('chart:viewport-effect', () => {
			const start = viewStart;
			const end = viewEnd;
			const currentDisplayInterval = displayInterval;
			const isEnergy = isEnergyMetric;

			// Aggregate the fetched native grain to the selected display interval
			// (30m from 5m, or season/half/fy/month from coarser energy data). Power
			// averages (mean MW); energy volume sums.
			const visibleData = visibleAggregation(manager.processedCache, {
				viewStart: start,
				viewEnd: end,
				apiInterval: interval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone,
				method: isEnergy ? 'sum' : 'mean'
			});

			chartStore.seriesData = visibleData;
			const [domainStart, domainEnd] = chartStore.xDomain ?? [];
			if (domainStart !== start || domainEnd !== end) {
				chartStore.xDomain = /** @type {[number, number]} */ ([start, end]);
			}

			applyFacilityTimeAxis(chartStore, {
				data: visibleData,
				viewStart: start,
				viewEnd: end,
				ianaTimeZone,
				timeZone,
				isEnergy,
				displayInterval: currentDisplayInterval
			});
		});
	});

	// Update reference lines and yDomain reactively (rules in capacity-annotations.js)
	$effect(() => {
		if (!chartStore) return;

		const { yReferenceLines, yDomain } = capacityAnnotations({
			isEnergyMetric,
			showAnnotations,
			isProportion: chartStore.chartOptions.isDataTransformTypeProportion,
			isChangeSince: chartStore.chartOptions.isDataTransformTypeChangeSince,
			isLine: chartStore.chartOptions.isChartTypeLine,
			capacitySums,
			hasBatteryUnits
		});
		chartStore.yReferenceLines = yReferenceLines;
		chartStore.setYDomain(yDomain);
	});

	/** Debounced callback for visible data — only fires after pan/zoom settles */
	/** @type {ReturnType<typeof setTimeout> | null} */
	let tableDebounceTimer = null;

	$effect(() => {
		// Track reactive dependencies — capture everything the debounced callback
		// needs as plain values so the timer (which may fire after this effect is
		// destroyed during facility navigation) never reads a stale `$derived`.
		const start = viewStart;
		const end = viewEnd;
		const currentDisplayInterval = displayInterval;
		const currentInterval = interval;
		const currentIana = ianaTimeZone;
		const isEnergy = isEnergyMetric;
		const manager = dataManager;
		const _cache = manager?.processedCache; // track cache changes
		const callback = onvisibledata;

		if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		if (!callback || !manager?.processedCache || !manager.seriesMeta) return;

		const meta = manager.seriesMeta;
		tableDebounceTimer = setTimeout(() => {
			// Usually a memo hit — the viewport effect computed the same slice with
			// the same options 300ms ago.
			const rows = visibleAggregation(manager.processedCache, {
				viewStart: start,
				viewEnd: end,
				apiInterval: currentInterval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone: currentIana,
				method: isEnergy ? 'sum' : 'mean'
			});
			callback({
				data: rows,
				seriesNames: meta.seriesNames,
				seriesLabels: meta.seriesLabels
			});
		}, 300);

		// Cancel a pending timer when this effect is destroyed (e.g. the chart is
		// unmounted on facility navigation) so it can't fire against stale state.
		return () => {
			if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		};
	});

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(dataManager, chartStore));

	// ============================================
	// Pan / Zoom Handlers
	// ============================================

	const { handlePanStart, handlePan, handlePanEnd, handleZoom, zoomIn, zoomOut } =
		createViewportGestures({
			viewport: () => ({ start: viewStart, end: viewEnd }),
			apply: (start, end) => {
				viewStart = start;
				viewEnd = end;
			},
			minDurationMs: () => MIN_VIEWPORT_MS,
			maxDurationMs: () => MAX_VIEWPORT_MS,
			onGestureStart: () => {
				isPanning = true;
				// Clear hover during pan
				chartStore?.clearHover();
			},
			onGestureEnd: () => {
				isPanning = false;
			},
			// Request data for any uncached range (wider buffer for energy)
			onMove: (start, end) => {
				const buffer = (end - start) * fetchBufferMultiplier;
				dataManager?.requestRange(start - buffer, end + buffer);
			},
			// Prefetch ahead in the pan direction (wider for energy)
			onPanEnd: (direction, start, end) => {
				const prefetch = (end - start) * fetchBufferMultiplier;
				if (direction === -1) {
					dataManager?.requestRange(end, Math.min(end + prefetch, Date.now()));
				} else {
					dataManager?.requestRange(start - prefetch, start);
				}
			}
		});

	// Reactively notify parent whenever viewport changes (pan, zoom, setViewport, initial load, metric switch)
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;
		onviewportchange?.({ start, end });
	});

	// Report load completion to the parent once the in-flight fetch settles.
	// `initialLoadComplete` flips true after the first seed/fetch settles (even when
	// empty); `cacheStart` is a stable "data was found" signal that survives panning.
	// If the first settled window is empty, retry once from this facility's own
	// default range before reporting "no data" — this self-heals a client-side nav
	// that left a stale viewport (e.g. a retired plant queried in a recent window),
	// without discarding the viewport on every navigation.
	$effect(() => {
		const manager = dataManager;
		if (!manager?.initialLoadComplete) return;
		// Wait for the in-flight fetch to settle so a still-empty retry is observed
		// too, not just the moment data first arrives.
		if (manager.hasPendingFetch) return;

		const hasData = manager.cacheStart !== null;
		const canRetry = !firstWindowSettled;
		firstWindowSettled = true;
		// If a facility's first settled window is empty, re-seed from its own default
		// range and refetch once before reporting "no data" — self-heals a stale
		// viewport left by a client-side nav (e.g. a retired plant queried in the
		// previous facility's recent window). Skipped when the viewport is already
		// that default range (a genuinely-empty facility on fresh mount — refetching
		// the same window would just come back empty).
		if (!hasData && canRetry) {
			const ds = untrack(() => dateStart);
			const de = untrack(() => dateEnd);
			if (ds && de) {
				const { startMs, endMs } = dateBoundsMs(
					ds,
					de,
					untrack(() => timeZone)
				);
				if (untrack(() => viewStart) !== startMs || untrack(() => viewEnd) !== endMs) {
					viewStart = startMs;
					viewEnd = endMs;
					const buffer = (endMs - startMs) * untrack(() => fetchBufferMultiplier);
					manager.requestRange(startMs - buffer, Math.min(endMs + buffer, Date.now()), {
						immediate: true
					});
					return;
				}
			}
		}
		onloadcomplete?.({ hasData });
	});

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
		onhoverchange?.(time);
	}

	function handleHoverEnd() {
		chartStore?.clearHover();
		onhoverchange?.(undefined);
	}

	// Sync externally-driven hover time (from peer charts) into the local chart
	// store. Only active when the parent has opted in via `onhoverchange` —
	// otherwise the effect would interpret a missing prop as "clear" and wipe
	// the hover the moment the user's own handler set it.
	$effect(() => {
		if (!onhoverchange) return;
		const t = hoverTime;
		if (!chartStore) return;
		if (chartStore.hoverTime === t) return;
		if (t === undefined) {
			chartStore.clearHover();
		} else {
			chartStore.setHover(t);
		}
	});

	/**
	 * @param {number} time
	 */
	function handleFocus(time) {
		if (isPanning) return;
		chartStore?.toggleFocus(time);
		onfocuschange?.(chartStore?.focusTime);
	}

	// Sync externally-driven focus time (from peer charts) into the local chart
	// store. Gated on `onfocuschange` for the same reason as the hover effect above.
	$effect(() => {
		if (!onfocuschange) return;
		const t = focusTime;
		if (!chartStore) return;
		if (chartStore.focusTime === t) return;
		if (t === undefined) {
			chartStore.clearFocus();
		} else {
			chartStore.setFocus(t);
		}
	});

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

		// If an interval/metric switch is pending (the props have changed but the
		// data-manager $effect hasn't swapped the manager yet), don't fetch against
		// the stale manager — e.g. selecting "All" flips to energy/1y, but the live
		// manager is still power/5m and would request a multi-year 5m range the API
		// rejects. The init $effect creates the correct manager and fetches this
		// viewport immediately.
		if (dataManager && (dataManager.interval !== interval || dataManager.metric !== metric)) {
			return;
		}

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

<!-- Main Chart -->
{#if chartStore}
	<div class="group relative {showContainer ? 'rounded-lg p-4' : ''}">
		<StratumChart
			chart={chartStore}
			{showHeader}
			{showOptions}
			{tooltipMode}
			{tightAxisClip}
			zoomMode={showZoomControls ? zoomMode : 'none'}
			onzoomin={zoomIn}
			onzoomout={zoomOut}
			{isAtMinZoom}
			{isAtMaxZoom}
			zoomOverlayInsetPx={overlayInsetPx}
			tooltipInsetPx={overlayInsetPx}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			onpanstart={handlePanStart}
			onpan={handlePan}
			onpanend={handlePanEnd}
			onzoom={handleZoom}
			{enablePan}
			{panZoomMode}
			bind:engaged={panZoomEngaged}
			viewDomain={null}
			loadingRanges={dataManager?.loadingRanges ?? []}
			{resizable}
			heightStorageKey="facility-chart-height-generation"
			minHeight={160}
			maxHeight={700}
		/>

		{#if showLoadingOverlay}
			<!-- Loading overlay — previous chart stays visible underneath -->
			<div class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
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
					<span class="text-sm">Loading data...</span>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<!-- No facility — chart store not created yet -->
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeightPx
			? ''
			: chartHeight}"
		style:height={chartHeightPx ? `${chartHeightPx}px` : undefined}
	>
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
			<span class="text-sm">Loading data...</span>
		</div>
	</div>
{/if}
