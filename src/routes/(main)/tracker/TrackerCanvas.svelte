<script>
	/**
	 * TrackerCanvas — the tracker page's chart machinery.
	 *
	 * Owns the shared range control, the three always-mounted synced charts
	 * (Generation, Price⇄Market Value, Emissions Intensity⇄Volume) and the
	 * headless providers feeding the fuel-tech table and overlays. Split toggles
	 * flip metric props on a single chart instance — the viewport lives in the
	 * chart host, so there is no remount and the previous frame stays up under
	 * the loading veil while the new metric arrives.
	 *
	 * The page owns the URL-parsed state (region/group/modes/panel) and passes
	 * it down; the canvas hands its live range control up via `oncontrolschange`
	 * so the nav bar drives the charts directly, and reports range changes back
	 * through `onrangechange`.
	 */

	import { onMount, tick, untrack } from 'svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import {
		getIntervalSpec,
		isRollingInterval
	} from '$lib/components/charts/facility/range-interval-config.js';
	import {
		createNetworkMarketData,
		RENEWABLES_SERIES_ID,
		DEMAND_GROSS_SERIES_ID
	} from '$lib/components/charts/network/network-market-data.svelte.js';
	import { displayFullTransform } from '$lib/components/charts/v2/dataProcessing.js';
	import {
		applyBucketFilter,
		applyBucketFilterToDisplayRows,
		bucketFilterKindFor,
		bucketFilterPredicate
	} from '$lib/components/charts/v2/bucket-filter.js';
	import { createNetworkFuelTechSeries } from '$lib/components/charts/network/network-fueltech-series.svelte.js';
	import { createMarketSeriesProvider } from '$lib/components/charts/network/network-series-provider.svelte.js';
	import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { formatRangeLabel } from '$lib/components/charts/v2/time-format-policy.js';
	import { perfSpan } from '$lib/components/charts/v2/perf.js';
	import { hasSpotPrice } from './tracker-regions.js';
	import ChartCard from './ChartCard.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import { createTrackerPrefetchPlan } from './tracker-prefetch.js';
	import { DEFAULT_RANGE_DAYS, normaliseRange, resolvePriceMode } from './tracker-model.js';
	import {
		CURTAILMENT_SERIES,
		curtailmentOverlayFor,
		DEMAND_LINE_COLOUR,
		RENEWABLES_LINE_COLOUR
	} from './tracker-overlays.js';
	import {
		buildFuelTechTableRows,
		computeCurtailmentRows,
		computeOverlaySummary,
		contributionDenominatorMWh
	} from './table-model.js';
	import { formatTrackerPercentageValue } from './table-format.js';

	/** @typedef {import('./types.js').TrackerRange} TrackerRange */
	/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */
	/** @typedef {import('./types.js').GenerationSnapshot} GenerationSnapshot */
	/** @typedef {import('$lib/components/charts/network/headless-series-provider.svelte.js').HeadlessSeriesProvider} HeadlessSeriesProvider */

	/** @type {{
	 *   region: string,
	 *   group: string,
	 *   priceMode: import('./types.js').PriceMode,
	 *   emissionsMode: import('./types.js').EmissionsMode,
	 *   overlays: TrackerOverlay[],
	 *   tablePanelOpen: boolean,
	 *   bucketFilter?: string | null,
	 *   contributionMode?: import('./types.js').ContributionMode,
	 *   initialRange: TrackerRange,
	 *   initialNowMs?: number,
	 *   oncontrolschange?: (controls: { range: typeof range, getRangeLabel: () => string }) => void,
	 *   onrangechange?: (range: TrackerRange) => void,
	 *   onpricemodechange?: (mode: import('./types.js').PriceMode) => void,
	 *   onemissionsmodechange?: (mode: import('./types.js').EmissionsMode) => void,
	 *   onoverlayschange?: (overlays: TrackerOverlay[]) => void,
	 *   onpaneltoggle?: (open: boolean) => void
	 * }} */
	let {
		region,
		group,
		priceMode,
		emissionsMode,
		overlays,
		tablePanelOpen,
		bucketFilter = null,
		contributionMode = 'generation',
		initialRange,
		initialNowMs,
		oncontrolschange,
		onrangechange,
		onpricemodechange,
		onemissionsmodechange,
		onoverlayschange,
		onpaneltoggle
	} = $props();

	const DAY_MS = 86_400_000;

	// The live anchor is fixed at mount — the tracker has no live-edge ticker,
	// so the default viewport (and the charts' initial dates) never move.
	const anchorEnd = untrack(() =>
		Number.isFinite(initialNowMs) ? /** @type {number} */ (initialNowMs) : Date.now()
	);
	const anchorStart = anchorEnd - DEFAULT_RANGE_DAYS * DAY_MS;
	let network = $derived(regionToNetwork(region));
	let timeZone = $derived(network.timeZone);
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let dateStart = $derived(toNetworkDateString(anchorStart, timeZone));
	let dateEnd = $derived(toNetworkDateString(anchorEnd, timeZone));
	let viewStart = $state(0);
	let viewEnd = $state(0);

	// Component instances — raw, so the exports objects aren't wrapped in
	// proxies. The casts keep the declared union: a bare `undefined` initialiser
	// would narrow every read below to `never`.
	let generationChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let priceChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let emissionsChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let generationDisplayPrefix = $derived(
		/** @type {SiPrefix} */ (generationChart?.getDisplayPrefix() ?? 'M')
	);

	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	let panZoomEngaged = $state(false);

	/** Whether any synced chart is in a gesture. */
	let gestureActive = $state(false);

	/** Last settled viewport, shared by the table, overlays, URL and range label.
	 *  A latch — it holds through gestures, so it can't be a plain derived. */
	let settledWindow = $state.raw({ start: 0, end: 0 });
	$effect(() => {
		if (gestureActive) return;
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;
		const previous = untrack(() => settledWindow);
		if (previous.start === start && previous.end === end) return;
		settledWindow = { start, end };
	});
	/** The settled window with the mount anchor as the pre-report fallback. */
	let viewWindow = $derived({
		start: settledWindow.start || anchorStart,
		end: settledWindow.end || anchorEnd
	});

	/** Fuel-tech groups toggled off via the table — hides chart series and
	 *  excludes them from the intensity ratio, never from table denominators.
	 *  Keyed to the grouping that produced the ids: a grouping change renames
	 *  every series, so stale toggles would silently hide unrelated groups. */
	let hiddenState = $state.raw({ group: '', ids: /** @type {string[]} */ ([]) });
	let hiddenSeries = $derived(hiddenState.group === group ? hiddenState.ids : []);
	/** Latest generation visible-data snapshot — feeds the table. Kept (stale)
	 *  through refetches so the table never blanks. */
	let generationDataset = $state.raw(/** @type {GenerationSnapshot | null} */ (null));
	let containerWidth = $state(0);

	/** Table panel width (% of the row). Owned here — the drag handle sits in
	 *  the gap between the charts column and the panel, outside the panel
	 *  container, matching the chart cards' handles. */
	let panelSize = $state(30);
	let panelResizing = $state(false);
	const PANEL_MIN_PX = 320;

	/** @param {PointerEvent} e */
	function startPanelDrag(e) {
		e.preventDefault();
		panelResizing = true;
		const startX = e.clientX;
		const startSize = panelSize;

		/** @param {PointerEvent} moveEvent */
		function onMove(moveEvent) {
			if (!containerWidth) return;
			// The panel sits to the right — dragging left grows it.
			const deltaPct = ((startX - moveEvent.clientX) / containerWidth) * 100;
			const minPct = (PANEL_MIN_PX / containerWidth) * 100;
			panelSize = Math.min(80, Math.max(minPct, startSize + deltaPct));
		}

		function onUp() {
			panelResizing = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	}

	// ============================================
	// Card modes and overlay toggles
	// ============================================

	let regionHasSpotPrice = $derived(hasSpotPrice(region));
	// The mode the price card actually renders — 'au' has no spot price, so the
	// card falls back to market value without losing the user's selection.
	let effectivePriceMode = $derived(resolvePriceMode(region, priceMode));
	let priceIsMarketValue = $derived(effectivePriceMode === 'market_value');
	let emissionsIsIntensity = $derived(emissionsMode === 'intensity');

	// Chart overlays — URL-owned toggles driven from the table's summary rows.
	let showDemandLine = $derived(overlays.includes('demand'));
	let showRenewablesLine = $derived(overlays.includes('renewables'));
	/** Curtailment series toggled onto the generation chart, in band order. */
	let shownCurtailment = $derived(
		CURTAILMENT_SERIES.filter((series) => overlays.includes(series.overlay))
	);
	let shownCurtailmentIds = $derived(shownCurtailment.map((series) => series.id));

	// ============================================
	// Range control and headless providers
	// ============================================

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: anchorStart, end: anchorEnd }),
		setViewport: (start, end) => {
			viewStart = start;
			viewEnd = end;
		},
		charts: () => [
			generationChart,
			priceChart,
			emissionsChart,
			marketData,
			mvData,
			emissionsData,
			demandData,
			curtailmentData,
			shareData
		],
		timeZone: () => timeZone,
		initialRangeDays: DEFAULT_RANGE_DAYS,
		includeRolling: true
	});

	let energyMetric = $derived(range.activeMetric === 'energy');
	let isRollingDisplay = $derived(isRollingInterval(range.displayInterval));
	let intervalBadge = $derived(
		getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval
	);

	// Headless providers — same cache/dedup/reconcile path as the charts. Each
	// is `enabled`-gated on the surface that consumes it: with the table panel
	// closed and the overlays off, only the three chart metrics fetch at all.
	const marketData = createNetworkMarketData({
		region: () => region,
		basis: () => range.activeMetric,
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || (showRenewablesLine && isRollingDisplay)
	});
	// Per-fuel-tech market value and emissions feed the table's Av price and
	// Emissions/Intensity columns; each shares its fetch with the matching chart.
	const mvData = createNetworkFuelTechSeries({
		region: () => region,
		group: () => group,
		metric: 'market_value',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen
	});
	const emissionsData = createNetworkFuelTechSeries({
		region: () => region,
		group: () => group,
		metric: 'emissions',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen
	});
	// Legacy-parity extras, all official OE series (not derived): operational
	// demand, the solar/wind curtailment pair, and the renewable share.
	const demandData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'demand_energy' : 'demand'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || showDemandLine
	});
	const curtailmentData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'curtailment_energy' : 'curtailment'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || shownCurtailment.length > 0
	});
	const shareData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => 'renewable_share',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || (showRenewablesLine && !isRollingDisplay)
	});

	// Interval-aware nav readout — bucket names at FY/quarter/season grains,
	// clock times at sub-daily ones. Hoisted to the page via oncontrolschange.
	let rangeLabel = $derived(
		formatRangeLabel(viewWindow.start, viewWindow.end, range.displayInterval, ianaTimeZone)
	);

	/** Rolling windows keep all source months; filters select only output samples. */
	let nativeFilterPredicate = $derived.by(() => {
		if (!bucketFilter || isRollingDisplay) return null;
		return bucketFilterPredicate(
			bucketFilterKindFor(range.displayInterval),
			bucketFilter,
			ianaTimeZone
		);
	});

	/**
	 * Rolling prices divide 12-month market-value and energy sums.
	 * @type {'market_value' | 'price' | 'price_vw'}
	 */
	let priceMetric = $derived(
		priceIsMarketValue ? 'market_value' : isRollingDisplay ? 'price_vw' : 'price'
	);
	/** @type {'emissions_intensity' | 'emissions'} */
	let emissionsMetric = $derived(emissionsIsIntensity ? 'emissions_intensity' : 'emissions');

	// Warm the range presets most likely to follow the live view.
	const GENERATION_PREFETCH_PLAN = createTrackerPrefetchPlan('energy');
	let pricePrefetchPlan = $derived(createTrackerPrefetchPlan(priceMetric));
	let emissionsPrefetchPlan = $derived(createTrackerPrefetchPlan(emissionsMetric));

	let loadSeriesIds = $derived(loadGroupsFor(getGroup(group)));

	// Debounced URL state uses the settled window, not gesture frames.
	let activeRange = $derived(
		range.selectedRange == null
			? normaliseRange({
					kind: 'custom',
					startMs: settledWindow.start,
					endMs: settledWindow.end,
					intervalId: range.displayInterval
				})
			: normaliseRange({
					kind: 'preset',
					days: range.selectedRange,
					intervalId: range.displayInterval
				})
	);
	$effect(() => {
		if (!settledWindow.start || !settledWindow.end) return;
		const snapshot = activeRange;
		const timer = setTimeout(() => onrangechange?.(snapshot), 300);
		return () => clearTimeout(timer);
	});

	// ============================================
	// Provider row access
	// ============================================

	/** Display-grain options for the extras — they track the central Interval
	 *  control exactly like the charts. Per-bucket quantities (energy basis)
	 *  aggregate by sum; instantaneous ones by mean. */
	let displayRowOpts = $derived({
		displayInterval: range.displayInterval,
		ianaTimeZone,
		method: /** @type {'sum' | 'mean'} */ (range.activeMetric === 'energy' ? 'sum' : 'mean'),
		bucketFilter
	});
	let shareRowOpts = $derived({ ...displayRowOpts, method: /** @type {const} */ ('mean') });

	/** Summaries use native rows whenever display rows would overlap (rolling
	 *  windows) or carry a synthetic band close (calendar filters). */
	let summariesUseNativeRows = $derived(isRollingDisplay || !!bucketFilter);

	/**
	 * Native-grain rows with the calendar filter applied to every side of the
	 * table ratios alike.
	 * @param {HeadlessSeriesProvider} provider
	 * @param {number} start
	 * @param {number} end
	 */
	function nativeRows(provider, start, end) {
		return applyBucketFilter(provider.getVisibleRows(start, end), nativeFilterPredicate);
	}

	/**
	 * Rows for a window summary — native when display rows can't be summed
	 * safely, otherwise the same display-grain rows the chart renders.
	 * @param {HeadlessSeriesProvider} provider
	 * @param {number} start
	 * @param {number} end
	 * @param {typeof displayRowOpts} opts
	 */
	function summaryRows(provider, start, end, opts) {
		return summariesUseNativeRows
			? nativeRows(provider, start, end)
			: provider.getDisplayRows(start, end, opts);
	}

	// ============================================
	// Fuel-tech table feed
	// ============================================

	/** Use the generation snapshot's bounds so table rows and window stay aligned. */
	let tableWindow = $derived({
		start: generationDataset?.start ?? viewWindow.start,
		end: generationDataset?.end ?? viewWindow.end
	});

	/** Use native rows when display rows overlap or contain a synthetic band close. */
	let tableGenerationDataset = $derived(
		summariesUseNativeRows && generationDataset?.nativeData
			? { ...generationDataset, data: generationDataset.nativeData }
			: generationDataset
	);

	/** Recompute table rows when chart or provider data changes. */
	let tableRows = $derived.by(() => {
		if (!tableGenerationDataset) return null;
		const { start, end } = tableWindow;
		return perfSpan('canvas:table-rows', () =>
			buildFuelTechTableRows({
				generationData: tableGenerationDataset,
				mvRows: nativeRows(mvData, start, end),
				emissionsRows: nativeRows(emissionsData, start, end),
				demandRows: nativeRows(marketData, start, end),
				basis: range.activeMetric,
				demandBasis: range.activeMetric,
				mode: contributionMode,
				hiddenSeries,
				loadSeriesIds
			})
		);
	});
	let tableRowIds = $derived((tableRows ?? []).map((row) => row.id));

	/** Veil region and grouping changes; dim values for all other refreshes. */
	let settledStructureKey = $state('');
	let tableStructurePending = $derived(
		settledStructureKey !== '' && settledStructureKey !== `${region}|${group}`
	);
	let tableValuesPending = $derived(
		mvData.isPending || emissionsData.isPending || marketData.isPending || range.rangeSwitchPending
	);

	/** Curtailment sits outside the fuel-tech grouping but shares the table's
	 *  contribution denominator. Rows list top-down like the fuel techs. */
	let curtailmentRows = $derived.by(() => {
		if (!tableGenerationDataset) return [];
		const { start, end } = tableWindow;
		return computeCurtailmentRows({
			rows: summaryRows(curtailmentData, start, end, displayRowOpts),
			series: [...CURTAILMENT_SERIES].reverse(),
			basis: range.activeMetric,
			denominatorMWh: contributionDenominatorMWh({
				generationRows: tableGenerationDataset.data,
				seriesNames: tableGenerationDataset.seriesNames,
				basis: range.activeMetric,
				mode: contributionMode,
				demandRows: nativeRows(marketData, start, end),
				demandBasis: range.activeMetric,
				loadSeriesIds
			})
		});
	});

	let overlaySummary = $derived(
		computeOverlaySummary({
			demandRows: summaryRows(demandData, viewWindow.start, viewWindow.end, displayRowOpts),
			marketRows: nativeRows(marketData, viewWindow.start, viewWindow.end),
			shareRows: summaryRows(shareData, viewWindow.start, viewWindow.end, shareRowOpts),
			basis: range.activeMetric
		})
	);

	// ============================================
	// Generation chart overlays
	// ============================================

	/** Stable empty value avoids redundant overlay updates. */
	const EMPTY_OVERLAYS = /** @type {any[]} */ ([]);

	/** One year of lead-in plus room for half-year bucket alignment. */
	const ROLLING_LEAD_MS = 580 * DAY_MS;

	/**
	 * Derive rolling renewable share from renewable and demand window sums.
	 * @param {number} startMs
	 * @param {number} endMs
	 */
	function rollingShareRows(startMs, endMs) {
		const transform = displayFullTransform({
			apiInterval: '1M',
			displayInterval: range.displayInterval,
			method: 'sum',
			ianaTimeZone
		});
		if (!transform) return [];
		const rows = marketData.getVisibleRows(startMs - ROLLING_LEAD_MS, endMs);
		const rolled = transform(rows, [RENEWABLES_SERIES_ID, DEMAND_GROSS_SERIES_ID]);
		const samplePredicate = bucketFilterPredicate(
			bucketFilterKindFor(range.displayInterval),
			bucketFilter,
			ianaTimeZone
		);
		/** @type {any[]} */
		const out = [];
		for (const row of rolled) {
			if (row.time < startMs || row.time > endMs) continue;
			const renewables = row[RENEWABLES_SERIES_ID];
			const demand = row[DEMAND_GROSS_SERIES_ID];
			out.push({
				date: row.date,
				time: row.time,
				renewable_share:
					typeof renewables === 'number' && typeof demand === 'number' && demand > 0
						? (renewables / demand) * 100
						: null
			});
		}
		return applyBucketFilterToDisplayRows(out, samplePredicate, ianaTimeZone);
	}

	let overlayLines = $derived.by(() => {
		if (!showDemandLine && !showRenewablesLine) return EMPTY_OVERLAYS;
		const { start, end } = viewWindow;
		/** @type {any[]} */
		const lines = [];
		if (showDemandLine) {
			lines.push({
				id: 'demand',
				label: 'Demand',
				data: demandData.getDisplayRows(start, end, displayRowOpts),
				valueKey: 'demand',
				colour: DEMAND_LINE_COLOUR,
				scale: 'y'
			});
		}
		if (showRenewablesLine) {
			lines.push({
				id: 'renewable-share',
				label: 'Renewables',
				data: isRollingDisplay
					? rollingShareRows(start, end)
					: shareData.getDisplayRows(start, end, shareRowOpts),
				valueKey: 'renewable_share',
				colour: RENEWABLES_LINE_COLOUR,
				scale: 'percent',
				tooltipUnit: '%',
				formatTooltipValue: formatTrackerPercentageValue
			});
		}
		return lines;
	});

	/** Hatched curtailment bands riding the generation stack's top. */
	let overlayAreas = $derived.by(() => {
		if (!shownCurtailment.length) return EMPTY_OVERLAYS;
		return [
			{
				id: 'curtailment',
				data: curtailmentData.getDisplayRows(viewWindow.start, viewWindow.end, displayRowOpts),
				series: shownCurtailment.map(({ id, colour, label }) => ({ id, colour, label }))
			}
		];
	});

	// ============================================
	// Series and overlay toggles
	// ============================================

	/** @param {TrackerOverlay} overlay @param {boolean} [exclusive] */
	function toggleOverlay(overlay, exclusive = false) {
		if (exclusive) {
			// Solo the overlay: hide every fuel-tech series in the current grouping.
			hiddenState = { group, ids: tableRowIds };
			onoverlayschange?.([overlay]);
			return;
		}
		onoverlayschange?.(
			overlays.includes(overlay)
				? overlays.filter((item) => item !== overlay)
				: [...overlays, overlay]
		);
	}

	/** @param {string} id @param {boolean} [exclusive] */
	function toggleCurtailment(id, exclusive = false) {
		const overlay = curtailmentOverlayFor(id);
		if (overlay) toggleOverlay(overlay, exclusive);
	}

	/** @param {string} series @param {boolean} [exclusive] */
	function toggleSeries(series, exclusive = false) {
		if (exclusive) {
			hiddenState = { group, ids: tableRowIds.filter((id) => id !== series) };
			onoverlayschange?.([]);
			return;
		}
		const ids = hiddenSeries;
		const visibleCount = tableRowIds.filter((id) => !ids.includes(id)).length;
		// Toggling off the last visible series restores everything instead.
		if (!ids.includes(series) && visibleCount === 1) {
			showAllSeries();
			onoverlayschange?.([]);
			return;
		}
		hiddenState = {
			group,
			ids: ids.includes(series) ? ids.filter((item) => item !== series) : [...ids, series]
		};
	}

	function showAllSeries() {
		hiddenState = { group, ids: [] };
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	// ============================================
	// Coordinated chart switching
	// ============================================

	// Hold all three charts during range, interval and region changes, then
	// release them together. Polling also detects switches served from cache.
	let chartsSwitchPending = $state(false);
	/** Include the range control's synchronous pending state to prevent early swaps. */
	let chartsHoldFrame = $derived(chartsSwitchPending || range.rangeSwitchPending);
	// Imperative only; no reactive proxy is needed.
	let chartsLoaded = { gen: false, price: false, emissions: false };

	function armCoordinatedSwitch() {
		chartsLoaded = { gen: false, price: false, emissions: false };
		chartsSwitchPending = true;
	}

	$effect(() => {
		if (range.rangeSwitchPending) armCoordinatedSwitch();
	});

	// Region changes also replace every chart manager.
	let lastChartRegion = untrack(() => region);
	$effect(() => {
		const current = region;
		if (current === lastChartRegion) return;
		lastChartRegion = current;
		armCoordinatedSwitch();
	});

	/** @param {'gen' | 'price' | 'emissions'} key */
	function markChartLoaded(key) {
		if (chartsLoaded[key]) return;
		chartsLoaded[key] = true;
		if (chartsLoaded.gen && chartsLoaded.price && chartsLoaded.emissions) {
			range.settle();
			chartsSwitchPending = false;
		}
	}

	$effect(() => {
		if (!chartsSwitchPending) return;
		// Delay the first poll until switch effects have replaced old managers.
		const sweep = setInterval(() => {
			if (generationChart?.isSettled()) markChartLoaded('gen');
			if (priceChart?.isSettled()) markChartLoaded('price');
			if (emissionsChart?.isSettled()) markChartLoaded('emissions');
		}, 200);
		return () => clearInterval(sweep);
	});

	/** @param {GenerationSnapshot} payload */
	function handleGenerationData(payload) {
		generationDataset = payload;
		// The debounced snapshot belongs to the current region and grouping.
		settledStructureKey = `${region}|${group}`;
		markChartLoaded('gen');
	}

	// ============================================
	// Range snapshot API (page URL sync + popstate restore)
	// ============================================

	/** @param {TrackerRange} snapshot */
	export async function applyRangeSnapshot(snapshot) {
		// Programmatic range changes end any active gesture.
		gestureActive = false;
		const next = normaliseRange(snapshot);
		if (next.kind === 'preset') range.handleRangeSelect(next.days);
		else {
			range.handleDateRangeChange({
				start: new Date(next.startMs).toISOString(),
				end: new Date(next.endMs).toISOString()
			});
		}
		if (next.intervalId !== range.displayInterval) range.handleIntervalChange(next.intervalId);
		await tick();
	}

	onMount(() => {
		oncontrolschange?.({ range, getRangeLabel: () => rangeLabel });
		applyRangeSnapshot(initialRange);
	});
</script>

<div class="flex min-h-0 flex-1 flex-row" bind:clientWidth={containerWidth}>
	<!-- No space-y: each card's full-gap drag handle is the spacer between cards.
	     Right padding yields to the panel drag handle when the panel is open —
	     the handle IS the gap between the columns. -->
	<div
		class="min-w-0 flex-1 overflow-y-auto py-4 pl-4 md:py-6 md:pl-6 {tablePanelOpen
			? ''
			: 'pr-4 md:pr-6'}"
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (panZoomEngaged = false)}
	>
		<ChartCard
			title="Generation"
			badge={intervalBadge}
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-generation"
		>
			{#snippet children(heightPx)}
				<NetworkChart
					bind:this={generationChart}
					{region}
					{bucketFilter}
					metric={range.activeMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind="stacked"
					nightShading
					{timeZone}
					{dateStart}
					{dateEnd}
					title={energyMetric ? 'Energy' : 'Power'}
					chartHeightPx={heightPx}
					generationUnitOptions
					{overlayLines}
					{overlayAreas}
					showContainer={false}
					tooltipMode="floating"
					hiddenSeriesNames={hiddenSeries}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => range.handleDerivedViewportChange(next, generationChart)}
					onviewportsettle={range.handleViewportSettle}
					onvisibledata={handleGenerationData}
					onloadcomplete={() => markChartLoaded('gen')}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					{gestureActive}
					ongesturechange={(active) => (gestureActive = active)}
					loadingLabel={rangeLabel}
					holdFrame={chartsHoldFrame}
					prefetchPlan={GENERATION_PREFETCH_PLAN}
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Market"
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-price"
		>
			{#snippet actions()}
				{#if regionHasSpotPrice}
					<SwitchTabs
						buttons={[
							{ label: 'Price', value: 'price' },
							{ label: 'Market value', value: 'market_value' }
						]}
						selected={priceMode}
						onChange={(value) =>
							onpricemodechange?.(/** @type {import('./types.js').PriceMode} */ (value))}
					/>
				{:else}
					<span class="text-xs text-mid-grey"> No national spot price — showing market value </span>
				{/if}
			{/snippet}
			{#snippet children(heightPx)}
				<NetworkChart
					bind:this={priceChart}
					{region}
					{bucketFilter}
					metric={priceMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind={priceIsMarketValue ? 'stacked' : 'line'}
					{timeZone}
					{dateStart}
					{dateEnd}
					title={priceIsMarketValue
						? 'Market value'
						: isRollingDisplay
							? 'Volume-weighted price'
							: 'Spot price'}
					chartHeightPx={heightPx}
					showContainer={false}
					tooltipMode="floating"
					hiddenSeriesNames={priceIsMarketValue ? hiddenSeries : []}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => range.handleDerivedViewportChange(next, priceChart)}
					onviewportsettle={range.handleViewportSettle}
					onloadcomplete={() => markChartLoaded('price')}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					{gestureActive}
					ongesturechange={(active) => (gestureActive = active)}
					loadingLabel={rangeLabel}
					holdFrame={chartsHoldFrame}
					prefetchPlan={pricePrefetchPlan}
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Emissions"
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-emissions"
		>
			{#snippet actions()}
				<SwitchTabs
					buttons={[
						{ label: 'Intensity', value: 'intensity' },
						{ label: 'Volume', value: 'volume' }
					]}
					selected={emissionsMode}
					onChange={(value) =>
						onemissionsmodechange?.(/** @type {import('./types.js').EmissionsMode} */ (value))}
				/>
			{/snippet}
			{#snippet children(heightPx)}
				<NetworkChart
					bind:this={emissionsChart}
					{region}
					{bucketFilter}
					metric={emissionsMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind={emissionsIsIntensity ? 'line' : 'stacked'}
					{timeZone}
					{dateStart}
					{dateEnd}
					title={emissionsIsIntensity ? 'Intensity' : 'Volume'}
					chartHeightPx={heightPx}
					showContainer={false}
					tooltipMode="floating"
					hiddenSeriesNames={emissionsIsIntensity ? [] : hiddenSeries}
					excludedFuelTechGroups={emissionsIsIntensity ? hiddenSeries : []}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => range.handleDerivedViewportChange(next, emissionsChart)}
					onviewportsettle={range.handleViewportSettle}
					onloadcomplete={() => markChartLoaded('emissions')}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					{gestureActive}
					ongesturechange={(active) => (gestureActive = active)}
					loadingLabel={rangeLabel}
					holdFrame={chartsHoldFrame}
					prefetchPlan={emissionsPrefetchPlan}
				/>
			{/snippet}
		</ChartCard>
	</div>

	{#if tablePanelOpen}
		<!-- Panel divider — sits in the gap between the columns, outside the
		     panel container, matching the chart cards' handles. -->
		<!-- w-4: same gap length as the chart cards' h-4 drag handles. -->
		<DragHandle
			axis="x"
			onstart={startPanelDrag}
			active={panelResizing}
			alwaysShowGrip
			class="w-4 rounded-md"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize table panel"
		/>
		<ResizablePanel
			open
			direction="left"
			defaultSize={panelSize}
			minSize={PANEL_MIN_PX}
			containerSize={containerWidth}
			showDragHandle={false}
			externalResizing={panelResizing}
			onclose={() => onpaneltoggle?.(false)}
			class="z-20 flex bg-white"
		>
			{#snippet header()}<span class="hidden"></span>{/snippet}
			<FuelTechPanel
				rows={tableRows}
				valuesPending={tableValuesPending}
				structurePending={tableStructurePending}
				structureKey={settledStructureKey}
				basis={range.activeMetric}
				displayPrefix={generationDisplayPrefix}
				{group}
				{contributionMode}
				hiddenCount={hiddenSeries.length}
				{rangeLabel}
				{curtailmentRows}
				shownCurtailment={shownCurtailmentIds}
				{overlaySummary}
				{showDemandLine}
				{showRenewablesLine}
				ontoggle={toggleSeries}
				oncurtailmenttoggle={toggleCurtailment}
				ondemandlinetoggle={(exclusive) => toggleOverlay('demand', exclusive)}
				onrenewableslinetoggle={(exclusive) => toggleOverlay('renewables', exclusive)}
				onshowall={showAllSeries}
				onclose={() => onpaneltoggle?.(false)}
			/>
		</ResizablePanel>
	{:else}
		<!-- Keep the reopen action at the panel edge. -->
		<button
			type="button"
			onclick={() => onpaneltoggle?.(true)}
			aria-label="Show fuel tech table"
			class="z-20 flex w-10 shrink-0 cursor-pointer items-start justify-center border-l border-warm-grey bg-white pt-3 text-dark-grey transition-colors hover:bg-warm-grey"
		>
			<PanelRightOpen class="size-5" />
		</button>
	{/if}
</div>
