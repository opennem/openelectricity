<script>
	/**
	 * FacilityDerivedRateProvider — the shared machinery behind the facility
	 * derived-rate chart pairs (Price + Market Value, Intensity + Emissions
	 * Volume). Each pair runs a volume ChartDataManager and a basis manager on
	 * the same combined URL (`metric=<basis>,market_value,emissions`, where
	 * `<basis>` is `energy` for energy intervals and `power` for 5m/30m — so
	 * all managers across the wrappers collapse to one network round-trip per
	 * range), derives a rate line (volume ÷ energy), builds two ChartStores
	 * (rate line + stacked volume) and publishes everything through a named
	 * context.
	 *
	 * The per-pair variation points — the volume metric, the ChartStore
	 * factories, the rate derivation and series, the summary payload and the
	 * context shape — arrive through the `recipe` prop built by the thin
	 * wrappers (`FacilityFinancialDataProvider`, `FacilityEmissionsDataProvider`).
	 *
	 * When `active` is false, no data managers are created and no fetches fire
	 * — safe to always wrap even when the charts are hidden.
	 */

	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { createFacilityDataManager } from './facility-data-manager.js';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { analyzeUnits, unitSeriesIds } from './unit-analysis.js';
	import { makeUnitLabelGetter, makeLoadAwareColourGetter } from './helpers.js';
	import { applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { untrack } from 'svelte';
	import { getBasisMetric, combinedMetricsFor, buildCombinedMetricsUrl } from './energy-basis.js';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '../v2/chart-loading-state.js';

	/** @typedef {import('$lib/components/charts/v2/ChartDataManager.svelte.js').default} ChartDataManager */
	/** @typedef {import('./derived-rate-recipe.js').RateSeriesInputs} RateSeriesInputs */
	/** @typedef {import('./derived-rate-recipe.js').DerivedRateRecipe} DerivedRateRecipe */

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {any | null} [rateSourceFacility] - Unit set the derived rate lines are computed from, when it should differ from the displayed `facility` (see the financial wrapper's `priceFacility`). Only honoured by recipes with `supportsRateSourceFacility`.
	 * @property {string} timeZone
	 * @property {string} [interval]
	 * @property {string} [displayInterval]
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {string} [rateChartHeight]
	 * @property {string} [volumeChartHeight]
	 * @property {number | Array<any> | ((ticks: any[]) => any[])} [yTicks] - Y-axis ticks for the volume chart: a count, an explicit array, or a function thinning the scale's default ticks. (Rate charts may use a fixed axis instead.) Omit for the AxisY default.
	 * @property {boolean} [active] - When false, skip manager instantiation (no fetch fires).
	 * @property {boolean} [showTooltipDate] - Whether the tooltips show their date/time header (default: true).
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onhoverchange] - Called when a chart's local hover changes.
	 * @property {number | undefined} [focusTime] - External focus (pinned) time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onfocuschange] - Called when a chart's local focus changes.
	 * @property {((data: any) => void)} [onsummarydata] - Visible-range summary for the metrics section; shaped by `recipe.buildSummaryPayload`.
	 * @property {((range: { start: number, end: number }) => void)} [onviewportchange]
	 * @property {string[]} [hiddenUnitCodes] - Unit codes whose series are hidden from the volume chart (e.g. toggled off in the units panel). The derived rate line stays facility-wide.
	 * @property {DerivedRateRecipe} recipe
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		facility,
		rateSourceFacility = null,
		timeZone,
		interval = '5m',
		displayInterval = '30m',
		viewStart,
		viewEnd,
		rateChartHeight = 'h-[200px]',
		volumeChartHeight = 'h-[200px]',
		yTicks = undefined,
		active = true,
		showTooltipDate = true,
		hoverTime = undefined,
		onhoverchange,
		focusTime = undefined,
		onfocuschange,
		onsummarydata,
		onviewportchange,
		hiddenUnitCodes = [],
		recipe,
		children
	} = $props();

	// Mirror the tooltip date toggle into both chart stores.
	$effect(() => {
		if (rateChartStore) rateChartStore.chartTooltips.showDate = showTooltipDate;
		if (volumeChartStore) volumeChartStore.chartTooltips.showDate = showTooltipDate;
	});

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isEnergyInterval = $derived(interval !== '5m');

	// Rate = volume metric / energy. For energy intervals the API serves `energy`
	// (MWh) natively; the 5m/30m power grains derive it from power × hours.
	// See energy-basis.js for the shared rules.
	let basisMetric = $derived(getBasisMetric(interval));
	let combinedMetrics = $derived(combinedMetricsFor(basisMetric));

	/** Fetch/prefetch buffer multiplier — wider for the energy basis since its
	 *  intervals are daily+. */
	let fetchBufferMultiplier = $derived(isEnergyInterval ? 3 : 1);

	/**
	 * Fetch window for a viewport — buffered each side (wider for the energy
	 * basis since its intervals are daily+), clamped to now on the future edge.
	 * @param {number} start
	 * @param {number} end
	 * @returns {[number, number]}
	 */
	function bufferedRange(start, end) {
		const buffer = (end - start) * fetchBufferMultiplier;
		return [start - buffer, Math.min(end + buffer, Date.now())];
	}

	// ============================================
	// Unit Analysis
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

	/** Identity of the unit set — a units-only change (e.g. battery net ⇄ split)
	 *  must recreate the managers even though facility/interval/metric match. */
	let unitsKey = $derived(analysis?.unitsKey ?? '');

	// The factories return closures over plain values only — they're handed to
	// ChartDataManagers, whose async continuations can outlive this component.
	let getLabel = $derived(makeUnitLabelGetter(unitCodeDisplayMap, fuelTechNameMap));
	let getSeriesColour = $derived(
		makeLoadAwareColourGetter(unitColours, loadCodes, getFuelTechColour)
	);

	// ── Rate unit set ─────────────────────────────────────────────
	// The derived rate lines may decompose by direction (generation vs load),
	// so they may need a different unit set from the displayed one: the battery
	// net view prices from the SPLIT units (see the `rateSourceFacility` prop).
	// Reuses the display analysis when no distinct rate set is supplied, so the
	// common case doesn't run analyzeUnits (unit sort + colour ramps) twice.
	let rateAnalysis = $derived(
		rateSourceFacility ? analyzeUnits(rateSourceFacility, getFuelTechColour) : analysis
	);
	let rateLoadCodes = $derived(rateAnalysis?.loadCodes ?? []);
	let rateUnitsKey = $derived(rateAnalysis?.unitsKey ?? '');
	/** When the rate unit set matches the displayed one, the rate reuses the
	 *  volume/basis managers; otherwise it runs its own pair (see below). */
	let hasOwnRateManagers = $derived(rateUnitsKey !== unitsKey);

	let rateGenFuelTechs = $derived(
		(rateAnalysis?.orderedCodes ?? [])
			.filter((code) => !rateLoadCodes.includes(code))
			.map((code) => rateAnalysis?.unitFuelTechMap?.[code] ?? '')
	);
	let rateLoadFuelTechs = $derived(
		rateLoadCodes.map((code) => rateAnalysis?.unitFuelTechMap?.[code] ?? '')
	);
	let hasLoadRateLine = $derived(rateLoadCodes.length > 0);

	// Lazy view for `recipe.getRateSeries` — the getters are only evaluated when
	// a recipe reads them (inside the rate chart effect, so reads stay tracked).
	/** @type {RateSeriesInputs} */
	const rateSeriesInputs = {
		get hasLoadRateLine() {
			return hasLoadRateLine;
		},
		get genFuelTechs() {
			return rateGenFuelTechs;
		},
		get loadFuelTechs() {
			return rateLoadFuelTechs;
		}
	};

	// ============================================
	// Data Managers — gated by `active`
	// ============================================

	/** @type {ChartDataManager | null} */
	let volumeDataManager = $state(null);
	/** Denominator basis: energy (MWh) for energy intervals, power (MW) for 5m/30m. */
	/** @type {ChartDataManager | null} */
	let basisDataManager = $state(null);

	$effect(() => {
		if (!active || !facility) {
			untrack(() => volumeDataManager)?.dispose();
			volumeDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentCode = facility.code;
		const networkId = facility.network_id;
		const currentUnitsKey = unitsKey;
		const volumeMetric = recipe.volumeMetric;

		const existing = untrack(() => volumeDataManager);
		if (
			existing &&
			existing.cacheKey === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === volumeMetric &&
			existing.seriesKey === currentUnitsKey
		) {
			return;
		}

		const metricParam = combinedMetrics;
		const manager = createFacilityDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: volumeMetric,
			unitFuelTechMap,
			orderedCodes,
			loadCodes,
			getLabel,
			getColour: getSeriesColour,
			// One combined URL shared across the derived-rate providers + the
			// generation chart so the API computes all metrics once and the
			// in-flight dedup collapses the managers into a single request.
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const [from, to] = bufferedRange(start, end);
			manager.requestRange(from, to, { immediate: true });
		}

		// Retire the replaced manager so its in-flight fetches become no-ops.
		existing?.dispose();
		volumeDataManager = manager;
	});

	$effect(() => {
		if (!active || !facility) {
			untrack(() => basisDataManager)?.dispose();
			basisDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentBasis = basisMetric;
		const metricParam = combinedMetrics;
		const currentCode = facility.code;
		const networkId = facility.network_id;
		const currentUnitsKey = unitsKey;

		const existing = untrack(() => basisDataManager);
		if (
			existing &&
			existing.cacheKey === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === currentBasis &&
			existing.seriesKey === currentUnitsKey
		) {
			return;
		}

		const manager = createFacilityDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: currentBasis,
			unitFuelTechMap,
			orderedCodes,
			loadCodes,
			getLabel,
			getColour: getSeriesColour,
			// One combined URL shared across the derived-rate providers + the
			// generation chart so the API computes all metrics once and the
			// in-flight dedup collapses the managers into a single request.
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const [from, to] = bufferedRange(start, end);
			manager.requestRange(from, to, { immediate: true });
		}

		// Retire the replaced manager so its in-flight fetches become no-ops.
		existing?.dispose();
		basisDataManager = manager;
	});

	// Rate managers — only when the rate unit set differs from the displayed
	// one (battery net view pricing from the split units). They fetch the same
	// combined URL as the active managers, so the in-flight dedup and the HTTP
	// cache collapse them into the same network requests; only the unit maps
	// (and therefore the processed series) differ.
	/** @type {ChartDataManager | null} */
	let ownRateVolumeManager = $state(null);
	/** @type {ChartDataManager | null} */
	let ownRateBasisManager = $state(null);

	$effect(() => {
		if (!recipe.supportsRateSourceFacility || !active || !facility || !hasOwnRateManagers) {
			untrack(() => ownRateVolumeManager)?.dispose();
			untrack(() => ownRateBasisManager)?.dispose();
			ownRateVolumeManager = null;
			ownRateBasisManager = null;
			return;
		}

		const currentInterval = interval;
		const currentBasis = basisMetric;
		const metricParam = combinedMetrics;
		const currentCode = facility.code;
		const networkId = facility.network_id;
		const currentRateUnitsKey = rateUnitsKey;
		const currentAnalysis = rateAnalysis;
		const volumeMetric = recipe.volumeMetric;

		const existingVolume = untrack(() => ownRateVolumeManager);
		const existingBasis = untrack(() => ownRateBasisManager);
		if (
			existingVolume &&
			existingBasis &&
			existingVolume.cacheKey === currentCode &&
			existingVolume.interval === currentInterval &&
			existingBasis.metric === currentBasis &&
			existingVolume.seriesKey === currentRateUnitsKey
		) {
			return;
		}

		const shared = {
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			unitFuelTechMap: currentAnalysis?.unitFuelTechMap ?? {},
			orderedCodes: currentAnalysis?.orderedCodes ?? [],
			loadCodes: currentAnalysis?.loadCodes ?? [],
			getLabel: makeUnitLabelGetter(currentAnalysis?.unitCodeDisplayMap ?? {}, fuelTechNameMap),
			getColour: makeLoadAwareColourGetter(
				currentAnalysis?.unitColours ?? {},
				currentAnalysis?.loadCodes ?? [],
				getFuelTechColour
			),
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		};
		const volumeManager = createFacilityDataManager({ ...shared, metric: volumeMetric });
		const basisManager = createFacilityDataManager({ ...shared, metric: currentBasis });

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const [from, to] = bufferedRange(start, end);
			volumeManager.requestRange(from, to, { immediate: true });
			basisManager.requestRange(from, to, { immediate: true });
		}

		existingVolume?.dispose();
		existingBasis?.dispose();
		ownRateVolumeManager = volumeManager;
		ownRateBasisManager = basisManager;
	});

	// Retire the managers on unmount so in-flight fetches settle as no-ops
	// instead of calling back into destroyed component state.
	$effect(() => {
		return () => {
			volumeDataManager?.dispose();
			basisDataManager?.dispose();
			ownRateVolumeManager?.dispose();
			ownRateBasisManager?.dispose();
		};
	});

	// Fetch data when viewport changes — all managers
	$effect(() => {
		if (!active) return;
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;

		const [from, to] = bufferedRange(start, end);
		volumeDataManager?.requestRange(from, to);
		basisDataManager?.requestRange(from, to);
		ownRateVolumeManager?.requestRange(from, to);
		ownRateBasisManager?.requestRange(from, to);
	});

	// ============================================
	// Visible Data (aggregated)
	// ============================================

	// One slice+aggregation memo per manager role — a hit returns the same rows
	// array, so dependent $deriveds and chart stores skip their own recomputes.
	const visibleMemos = {
		volume: createVisibleAggregation(),
		basis: createVisibleAggregation(),
		ownRateVolume: createVisibleAggregation(),
		ownRateBasis: createVisibleAggregation()
	};

	/**
	 * @param {ChartDataManager | null} manager
	 * @param {'sum' | 'mean'} aggMode
	 * @param {keyof typeof visibleMemos} role
	 * @returns {any[]}
	 */
	function getVisibleData(manager, aggMode, role) {
		if (!manager?.processedCache || !manager.seriesMeta) return [];

		return visibleMemos[role](manager.processedCache, {
			viewStart,
			viewEnd,
			apiInterval: manager.interval,
			displayInterval,
			ianaTimeZone,
			method: aggMode
		});
	}

	// Visible, display-aggregated rows — computed once per (cache, viewport,
	// interval) change and shared by the rate rows, the summary callback and
	// the volume chart effect. Energy basis sums native MWh; the power basis
	// averages MW (× hours downstream).
	let volumeVisibleRows = $derived(getVisibleData(volumeDataManager, 'sum', 'volume'));
	let basisVisibleRows = $derived(
		getVisibleData(basisDataManager, isEnergyInterval ? 'sum' : 'mean', 'basis')
	);

	// ============================================
	// Derived Rate Data — rate = volume metric / energy, via recipe.deriveRateRows
	// ============================================

	// The rate rows reuse the display managers when the unit sets match, and
	// the dedicated rate managers otherwise.
	let rateVolumeManager = $derived(
		/** @type {ChartDataManager | null} */ (
			hasOwnRateManagers ? ownRateVolumeManager : volumeDataManager
		)
	);
	let rateBasisManager = $derived(
		/** @type {ChartDataManager | null} */ (
			hasOwnRateManagers ? ownRateBasisManager : basisDataManager
		)
	);
	let rateVolumeRows = $derived(
		hasOwnRateManagers
			? getVisibleData(ownRateVolumeManager, 'sum', 'ownRateVolume')
			: volumeVisibleRows
	);
	let rateBasisRows = $derived(
		hasOwnRateManagers
			? getVisibleData(ownRateBasisManager, isEnergyInterval ? 'sum' : 'mean', 'ownRateBasis')
			: basisVisibleRows
	);

	let rateData = $derived.by(() => {
		if (!rateVolumeManager?.processedCache || !rateBasisManager?.processedCache) return [];

		return recipe.deriveRateRows({
			volumeRows: rateVolumeRows,
			volumeSeriesNames: rateVolumeManager.seriesMeta?.seriesNames ?? [],
			basisRows: rateBasisRows,
			basisSeriesNames: rateBasisManager.seriesMeta?.seriesNames ?? [],
			basisMetric,
			loadCodes: rateLoadCodes,
			energyOpts: { isEnergyInterval, displayInterval, ianaTimeZone }
		});
	});

	// ============================================
	// Summary data callback
	// ============================================

	// Debounced: the summary feeds the metrics section, where a ~0.3s settle is
	// invisible — without it this recomputes on every pan/zoom tick. The timer
	// callback only reads the plain values captured here. The basis-side
	// captures are gated by the (static) recipe flag so recipes that don't use
	// them never pick up their dependencies.
	$effect(() => {
		if (!onsummarydata) return;
		if (!volumeDataManager?.processedCache) return;
		if (recipe.summaryRequiresBasis && (!basisDataManager?.processedCache || !volumeChartStore))
			return;

		const volumeRows = volumeVisibleRows;
		const volumeSeriesNames = volumeDataManager.seriesMeta?.seriesNames ?? [];
		const basisRows = recipe.summaryRequiresBasis ? basisVisibleRows : [];
		const basisSeriesNames = recipe.summaryRequiresBasis
			? (basisDataManager?.seriesMeta?.seriesNames ?? [])
			: [];
		const chartStore = recipe.summaryRequiresBasis ? volumeChartStore : null;
		const energyOpts = recipe.summaryRequiresBasis
			? { isEnergyInterval, displayInterval, ianaTimeZone }
			: null;

		const timer = setTimeout(() => {
			onsummarydata(
				recipe.buildSummaryPayload({
					volumeRows,
					volumeSeriesNames,
					basisRows,
					basisSeriesNames,
					volumeChartStore: chartStore,
					energyOpts
				})
			);
		}, 300);

		return () => clearTimeout(timer);
	});

	// ============================================
	// Rate Chart Store (line chart)
	// ============================================

	let rateChartStore = $derived.by(() => {
		if (!facility) return null;

		return recipe.createRateChart({ timeZone, heightClasses: rateChartHeight });
	});

	$effect(() => {
		if (!rateChartStore) return;

		const rateSeries = recipe.getRateSeries(rateSeriesInputs);
		rateChartStore.seriesNames = rateSeries.seriesNames;
		rateChartStore.seriesColours = rateSeries.seriesColours;
		rateChartStore.seriesLabels = rateSeries.seriesLabels;
		rateChartStore.seriesData = rateData;
		rateChartStore.setXDomain(viewStart, viewEnd);
		rateChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			recipe.getRateCurveType(isEnergyInterval)
		);

		applyFacilityTimeAxis(rateChartStore, {
			data: rateData,
			viewStart,
			viewEnd,
			ianaTimeZone,
			timeZone,
			isEnergy: isEnergyInterval,
			displayInterval
		});
	});

	// ============================================
	// Volume Chart Store (stacked area)
	// ============================================

	let volumeChartStore = $derived.by(() => {
		if (!facility) return null;

		return recipe.createVolumeChart({ timeZone, heightClasses: volumeChartHeight, yTicks });
	});

	$effect(() => {
		if (!volumeChartStore || !volumeDataManager?.processedCache) return;

		const processed = volumeDataManager.processedCache;
		volumeChartStore.seriesNames = processed.seriesNames;
		volumeChartStore.seriesColours = processed.seriesColours;
		volumeChartStore.seriesLabels = processed.seriesLabels;
	});

	// Hide externally-toggled units from the volume stack. The derived rate
	// line (Σ volume / Σ energy) intentionally stays facility-wide — it's a
	// single physical measure, not a per-unit series.
	$effect(() => {
		if (!volumeChartStore) return;
		volumeChartStore.hiddenSeriesNames = unitSeriesIds(recipe.volumeMetric, hiddenUnitCodes);
	});

	$effect(() => {
		if (!volumeChartStore || !volumeDataManager?.processedCache) return;

		const visibleData = volumeVisibleRows;

		volumeChartStore.seriesData = visibleData;
		volumeChartStore.setXDomain(viewStart, viewEnd);
		volumeChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyInterval ? 'step' : 'straight'
		);

		applyFacilityTimeAxis(volumeChartStore, {
			data: visibleData,
			viewStart,
			viewEnd,
			ianaTimeZone,
			timeZone,
			isEnergy: isEnergyInterval,
			displayInterval
		});
	});

	// ============================================
	// Pan / Zoom / Wheel Handlers
	// ============================================
	// Wheel zoom / pan is handled by `InteractionLayer` inside StratumChart —
	// it fires the same onpan/onzoom callbacks directly. The provider doesn't
	// own the viewport, so `apply` forwards to the page controller; fetching
	// happens in the viewport effect when the new range flows back down.

	const { handlePanStart, handlePan, handlePanEnd, handleZoom } = createViewportGestures({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		apply: (start, end) => onviewportchange?.({ start, end }),
		onGestureStart: () => {
			rateChartStore?.clearHover();
			volumeChartStore?.clearHover();
		},
		onPanEnd: (direction, start, end) => {
			const prefetch = (end - start) * fetchBufferMultiplier;
			if (direction === -1) {
				const to = Math.min(end + prefetch, Date.now());
				volumeDataManager?.requestRange(end, to);
				basisDataManager?.requestRange(end, to);
			} else {
				volumeDataManager?.requestRange(start - prefetch, start);
				basisDataManager?.requestRange(start - prefetch, start);
			}
		}
	});

	// ============================================
	// Loading overlay state
	// ============================================

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(volumeDataManager, volumeChartStore));

	// ============================================
	// Tooltip formatting
	// ============================================

	let tooltipDateFormatter = $derived(
		new Intl.DateTimeFormat('en-AU', {
			timeZone: ianaTimeZone,
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	/**
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function getTooltipData(chart) {
		const data = chart.hoverData || chart.focusData;
		if (!data) return null;

		const key = chart.chartTooltips.valueKey || chart.hoverKey;
		const value = data && key !== undefined ? data[key] : undefined;
		const total = chart.visibleSeriesNames.reduce(
			(sum, name) => sum + (Number(data[name]) || 0),
			0
		);

		return {
			data,
			key,
			value: value !== undefined ? Number(value) : undefined,
			total,
			label: key ? chart.seriesLabels[key] : undefined,
			colour: key ? chart.seriesColours[key] : undefined,
			date: data.date ? tooltipDateFormatter.format(data.date) : ''
		};
	}

	// ============================================
	// Publish context (getters preserve reactivity across consumers) — the
	// recipe maps this generic shape onto the wrapper's named context. The
	// recipe is a static config object, so capturing its initial value here is
	// intentional (`untrack` documents that and keeps the compiler quiet);
	// reactivity flows through the getters below, not through `recipe`.
	// ============================================

	const publishContext = untrack(() => recipe).setContext;

	publishContext({
		get rateChartStore() {
			return rateChartStore;
		},
		get volumeChartStore() {
			return volumeChartStore;
		},
		get rateLoadingRanges() {
			return [
				...(rateVolumeManager?.loadingRanges ?? []),
				...(rateBasisManager?.loadingRanges ?? [])
			];
		},
		get volumeLoadingRanges() {
			return volumeDataManager?.loadingRanges ?? [];
		},
		get showLoadingOverlay() {
			return showLoadingOverlay;
		},
		get timeZone() {
			return timeZone;
		},
		get viewStart() {
			return viewStart;
		},
		get viewEnd() {
			return viewEnd;
		},
		get hasViewportHandler() {
			return !!onviewportchange;
		},
		get hoverTime() {
			return hoverTime;
		},
		get onhoverchange() {
			return onhoverchange;
		},
		get focusTime() {
			return focusTime;
		},
		get onfocuschange() {
			return onfocuschange;
		},
		handlePanStart,
		handlePan,
		handlePanEnd,
		handleZoom,
		getTooltipData
	});
</script>

{#if children}
	{@render children()}
{/if}
