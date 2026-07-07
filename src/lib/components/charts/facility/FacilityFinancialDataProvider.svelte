<script>
	/**
	 * FacilityFinancialDataProvider — owns the shared state for the facility
	 * financial charts (Price line + Market Value stacked area). Two sibling
	 * components (`FacilityPriceChart`, `FacilityMarketValueChart`) render from
	 * the context this provider sets up, so a single data fetch powers both.
	 *
	 * When `active` is false, no data managers are created and no fetches fire
	 * — safe to always wrap even when financial charts are hidden.
	 */

	import { ChartStore } from '$lib/components/charts/v2';
	import { aggregateForDisplay } from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { analyzeUnits } from './unit-analysis.js';
	import { makeUnitLabelGetter, makeLoadAwareColourGetter } from './helpers.js';
	import { applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { untrack } from 'svelte';
	import { setFacilityFinancialDataContext } from './FacilityFinancialDataContext.svelte.js';
	import {
		getBasisMetric,
		combinedMetricsFor,
		buildCombinedMetricsUrl,
		rewriteSeriesPrefix,
		sumSeries,
		buildEnergyMap,
		toEnergySeriesRows,
		createBasisColour
	} from './energy-basis.js';
	import { LINE_COLOUR } from './colours.js';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '../v2/chart-loading-state.js';
	import {
		createPriceYScale,
		formatPriceTick,
		PRICE_Y_DOMAIN,
		PRICE_Y_TICKS,
		PRICE_LINEAR_RANGE
	} from './price-y-scale.js';

	/**
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} SummaryData
	 * @property {any[]} mvData
	 * @property {any[]} energyData
	 * @property {string[]} mvSeriesNames
	 * @property {string[]} energySeriesNames
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} mvChartStore
	 */

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {string} timeZone
	 * @property {string} [interval]
	 * @property {string} [displayInterval]
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {string} [priceChartHeight]
	 * @property {string} [mvChartHeight]
	 * @property {number | Array<any> | ((ticks: any[]) => any[])} [yTicks] - Y-axis ticks for the market-value chart: a count, an explicit array, or a function thinning the scale's default ticks. (The price chart uses a fixed hybrid axis.) Omit for the AxisY default.
	 * @property {boolean} [active] - When false, skip manager instantiation (no fetch fires).
	 * @property {boolean} [showTooltipDate] - Whether the tooltips show their date/time header (default: true).
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onhoverchange] - Called when a financial chart's local hover changes.
	 * @property {number | undefined} [focusTime] - External focus (pinned) time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onfocuschange] - Called when a financial chart's local focus changes.
	 * @property {((data: SummaryData) => void)} [onsummarydata]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportchange]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		facility,
		timeZone,
		interval = '5m',
		displayInterval = '30m',
		viewStart,
		viewEnd,
		priceChartHeight = 'h-[200px]',
		mvChartHeight = 'h-[200px]',
		yTicks = undefined,
		active = true,
		showTooltipDate = true,
		hoverTime = undefined,
		onhoverchange,
		focusTime = undefined,
		onfocuschange,
		onsummarydata,
		onviewportchange,
		children
	} = $props();

	// Mirror the tooltip date toggle into both chart stores.
	$effect(() => {
		if (priceChartStore) priceChartStore.chartTooltips.showDate = showTooltipDate;
		if (mvChartStore) mvChartStore.chartTooltips.showDate = showTooltipDate;
	});

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isEnergyInterval = $derived(interval !== '5m');

	// Price = market_value / energy. For energy intervals the API serves `energy`
	// (MWh) natively; the 5m/30m power grains derive it from power × hours.
	// See energy-basis.js for the shared rules.
	let basisMetric = $derived(getBasisMetric(interval));
	let combinedMetrics = $derived(combinedMetricsFor(basisMetric));

	// ============================================
	// Unit Analysis
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

	// The factories return closures over plain values only — they're handed to
	// ChartDataManagers, whose async continuations can outlive this component.
	let getLabel = $derived(makeUnitLabelGetter(unitCodeDisplayMap, fuelTechNameMap));
	let getMvColour = $derived(
		makeLoadAwareColourGetter(
			unitColours,
			rewriteSeriesPrefix(loadIds, 'market_value'),
			'market_value',
			getFuelTechColor
		)
	);

	let getBasisColour = $derived.by(() =>
		createBasisColour({ basisMetric, unitColours, loadIds, getFuelTechColor })
	);

	// ============================================
	// Data Managers — gated by `active`
	// ============================================

	/** @type {ChartDataManager | null} */
	let mvDataManager = $state(null);
	/** Denominator basis: energy (MWh) for energy intervals, power (MW) for 5m/30m. */
	/** @type {ChartDataManager | null} */
	let basisDataManager = $state(null);

	$effect(() => {
		if (!active || !facility) {
			untrack(() => mvDataManager)?.dispose();
			mvDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentCode = facility.code;
		const networkId = facility.network_id;

		const existing = untrack(() => mvDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === 'market_value'
		) {
			return;
		}

		// `unitOrder` and `loadIds` come from analyzeUnits as `power_…` series
		// IDs. The MV data manager produces `market_value_…` IDs, so rewrite the
		// prefix or processFacilityPower's `unitOrder.filter(...)` call falls
		// through to the raw API order and the chart stack misorders.
		const mvUnitOrder = rewriteSeriesPrefix(unitOrder, 'market_value');
		const mvLoadsToInvert = rewriteSeriesPrefix(loadIds, 'market_value');

		const metricParam = combinedMetrics;
		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: 'market_value',
			unitFuelTechMap,
			unitOrder: mvUnitOrder,
			loadsToInvert: mvLoadsToInvert,
			getLabel,
			getColour: getMvColour,
			// One combined URL shared with the emissions provider + generation chart
			// so the API computes all metrics once and the in-flight dedup collapses
			// the managers into a single request.
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		// Retire the replaced manager so its in-flight fetches become no-ops.
		existing?.dispose();
		mvDataManager = manager;
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

		const existing = untrack(() => basisDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === currentBasis
		) {
			return;
		}

		// `unitOrder`/`loadIds` are `power_…` IDs; rewrite to the basis prefix so
		// processFacilityPower orders/inverts the right series (`energy_…` for
		// energy intervals).
		const basisUnitOrder = rewriteSeriesPrefix(unitOrder, currentBasis);
		const basisLoadsToInvert = rewriteSeriesPrefix(loadIds, currentBasis);

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: currentBasis,
			unitFuelTechMap,
			unitOrder: basisUnitOrder,
			loadsToInvert: basisLoadsToInvert,
			getLabel,
			getColour: getBasisColour,
			// One combined URL shared with the emissions provider + generation chart
			// so the API computes all metrics once and the in-flight dedup collapses
			// the managers into a single request.
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		// Retire the replaced manager so its in-flight fetches become no-ops.
		existing?.dispose();
		basisDataManager = manager;
	});

	// Retire the managers on unmount so in-flight fetches settle as no-ops
	// instead of calling back into destroyed component state.
	$effect(() => {
		return () => {
			mvDataManager?.dispose();
			basisDataManager?.dispose();
		};
	});

	// Fetch data when viewport changes — both managers
	$effect(() => {
		if (!active) return;
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;

		const duration = end - start;
		const bufferMultiplier = isEnergyInterval ? 3 : 1;
		const buffer = duration * bufferMultiplier;
		const bufferedStart = start - buffer;
		const bufferedEnd = Math.min(end + buffer, Date.now());

		mvDataManager?.requestRange(bufferedStart, bufferedEnd);
		basisDataManager?.requestRange(bufferedStart, bufferedEnd);
	});

	// ============================================
	// Visible Data (aggregated)
	// ============================================

	/**
	 * @param {ChartDataManager | null} manager
	 * @param {'sum' | 'mean'} aggMode
	 * @returns {any[]}
	 */
	function getVisibleData(manager, aggMode) {
		if (!manager?.processedCache || !manager.seriesMeta) return [];

		return aggregateForDisplay(
			manager.getDataForRange(viewStart, viewEnd),
			manager.seriesMeta.seriesNames,
			{
				apiInterval: manager.interval,
				displayInterval,
				ianaTimeZone,
				method: aggMode
			}
		);
	}

	// Visible, display-aggregated rows — computed once per (cache, viewport,
	// interval) change and shared by priceData, the summary callback, and the
	// market-value chart effect. Energy basis sums native MWh; the power basis
	// averages MW (× hours downstream).
	let mvVisibleRows = $derived(getVisibleData(mvDataManager, 'sum'));
	let basisVisibleRows = $derived(
		getVisibleData(basisDataManager, isEnergyInterval ? 'sum' : 'mean')
	);

	// ============================================
	// Derived Price Data — price = total_market_value / (total_power × interval_hours)
	// ============================================

	let priceData = $derived.by(() => {
		if (!mvDataManager?.processedCache || !basisDataManager?.processedCache) return [];

		const mvSeriesNames = mvDataManager.seriesMeta?.seriesNames ?? [];
		const basisSeriesNames = basisDataManager.seriesMeta?.seriesNames ?? [];

		const energyMap = buildEnergyMap(basisVisibleRows, basisSeriesNames, {
			isEnergyInterval,
			displayInterval,
			ianaTimeZone
		});

		return mvVisibleRows.map((row) => {
			const mvTotal = sumSeries(row, mvSeriesNames);
			const energy = energyMap.get(row.time) ?? 0;
			return {
				date: row.date,
				time: row.time,
				price: energy > 0 ? mvTotal / energy : null
			};
		});
	});

	// ============================================
	// Summary data callback
	// ============================================

	// Debounced: the summary feeds the metrics section, where a ~0.3s settle is
	// invisible — without it this recomputes on every pan/zoom tick. The timer
	// callback only reads the plain values captured here.
	$effect(() => {
		if (!onsummarydata) return;
		if (!mvDataManager?.processedCache || !basisDataManager?.processedCache || !mvChartStore)
			return;

		const mvRows = mvVisibleRows;
		const basisRows = basisVisibleRows;
		const mvSeriesNames = mvDataManager.seriesMeta?.seriesNames ?? [];
		const basisSeriesNames = basisDataManager.seriesMeta?.seriesNames ?? [];
		const chartStore = mvChartStore;
		const energyOpts = { isEnergyInterval, displayInterval, ianaTimeZone };

		const timer = setTimeout(() => {
			// Energy intervals already carry `energy_<unit>` (MWh); power grains
			// convert MW → MWh via the interval length.
			const { rows: energyRows, seriesNames: energySeriesNames } = toEnergySeriesRows(
				basisRows,
				basisSeriesNames,
				energyOpts
			);

			onsummarydata({
				mvData: mvRows,
				energyData: energyRows,
				mvSeriesNames,
				energySeriesNames,
				mvChartStore: chartStore
			});
		}, 300);

		return () => clearTimeout(timer);
	});

	// ============================================
	// Price Chart Store (line chart)
	// ============================================

	let priceChartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-price-chart'),
			title: 'Price',
			prefix: '',
			displayPrefix: '',
			baseUnit: '$/MWh',
			chartType: 'line',
			timeZone: timeZone
		});

		chart.chartStyles.chartHeightClasses = priceChartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
		chart.hideDataOptions = true;
		chart.hideChartTypeOptions = true;
		// Single-series line — the floating-tooltip total just repeats the value.
		chart.chartTooltips.showTotal = false;
		// Hybrid axis: linear $0–$300, log above $300 and below $0, on a fixed
		// domain so the structure stays comparable across facilities and ranges.
		chart.yScale = createPriceYScale();
		chart.setYDomain([...PRICE_Y_DOMAIN]);
		chart.yTicks = PRICE_Y_TICKS;
		chart.solidLineRange = PRICE_LINEAR_RANGE;
		chart.useFormatY = true;
		chart.formatY = formatPriceTick;

		return chart;
	});

	$effect(() => {
		if (!priceChartStore) return;

		priceChartStore.seriesNames = ['price'];
		priceChartStore.seriesColours = { price: LINE_COLOUR };
		priceChartStore.seriesLabels = { price: 'Av. Price ($/MWh)' };
		priceChartStore.seriesData = priceData;
		priceChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		// Always step-after: each interval's price is held until the next reading.
		priceChartStore.chartOptions.selectedCurveType = /** @type {any} */ ('step');

		applyFacilityTimeAxis(priceChartStore, {
			data: priceData,
			viewStart,
			viewEnd,
			ianaTimeZone,
			timeZone,
			isEnergy: isEnergyInterval,
			displayInterval
		});
	});

	// ============================================
	// Market Value Chart Store (stacked area)
	// ============================================

	let mvChartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-market-value-chart'),
			title: 'Market Value',
			prefix: '',
			displayPrefix: 'k',
			baseUnit: '$',
			chartType: 'stacked-area',
			timeZone: timeZone
		});

		chart.chartStyles.chartHeightClasses = mvChartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
		if (yTicks !== undefined) chart.yTicks = yTicks;
		chart.useFormatY = true;
		chart.formatY = (/** @type {number} */ d) => {
			const converted = chart.convertAndFormatValue(d);
			return '$' + converted + chart.chartOptions.displayPrefix;
		};

		return chart;
	});

	$effect(() => {
		if (!mvChartStore || !mvDataManager?.processedCache) return;

		const processed = mvDataManager.processedCache;
		mvChartStore.seriesNames = processed.seriesNames;
		mvChartStore.seriesColours = processed.seriesColours;
		mvChartStore.seriesLabels = processed.seriesLabels;
	});

	$effect(() => {
		if (!mvChartStore || !mvDataManager?.processedCache) return;

		const visibleData = mvVisibleRows;

		mvChartStore.seriesData = visibleData;
		mvChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		mvChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyInterval ? 'step' : 'straight'
		);

		applyFacilityTimeAxis(mvChartStore, {
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

	let lastPanDelta = 0;

	function handlePanStart() {
		priceChartStore?.clearHover();
		mvChartStore?.clearHover();
	}

	/** @param {number} deltaMs */
	function handlePan(deltaMs) {
		let newStart = viewStart - deltaMs;
		let newEnd = viewEnd - deltaMs;

		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - (viewEnd - viewStart);
		}

		lastPanDelta = deltaMs;
		onviewportchange?.({ start: newStart, end: newEnd });
	}

	function handlePanEnd() {
		const duration = viewEnd - viewStart;
		const bufferMultiplier = isEnergyInterval ? 3 : 1;
		const prefetch = duration * bufferMultiplier;
		const now = Date.now();

		if (lastPanDelta < 0 && viewEnd < now) {
			mvDataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
			basisDataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
		} else if (lastPanDelta > 0) {
			mvDataManager?.requestRange(viewStart - prefetch, viewStart);
			basisDataManager?.requestRange(viewStart - prefetch, viewStart);
		}
	}

	/**
	 * @param {number} factor
	 * @param {number} centerMs
	 */
	function handleZoom(factor, centerMs) {
		const duration = viewEnd - viewStart;
		const newDuration = duration / factor;

		const ratio = (centerMs - viewStart) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}

		onviewportchange?.({ start: newStart, end: newEnd });
	}

	// Wheel zoom / pan is handled by `InteractionLayer` inside StratumChart —
	// it fires our existing onpan/onzoom callbacks directly.

	// ============================================
	// Loading overlay state
	// ============================================

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(mvDataManager, mvChartStore));

	// ============================================
	// Tooltip formatting
	// ============================================

	const dollarFormatter = getNumberFormat(0);

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
	 * @param {number} value
	 */
	function formatDollarValue(chart, value) {
		return '$' + chart.convertAndFormatValue(value) + chart.chartOptions.displayPrefix;
	}

	/** @param {number} value */
	function formatPriceValue(value) {
		return '$' + dollarFormatter.format(value);
	}

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
	// Publish context (getters preserve reactivity across consumers)
	// ============================================

	setFacilityFinancialDataContext({
		get priceChartStore() {
			return priceChartStore;
		},
		get mvChartStore() {
			return mvChartStore;
		},
		get priceLoadingRanges() {
			return [...(mvDataManager?.loadingRanges ?? []), ...(basisDataManager?.loadingRanges ?? [])];
		},
		get mvLoadingRanges() {
			return mvDataManager?.loadingRanges ?? [];
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
		getTooltipData,
		formatPriceValue,
		formatDollarValue
	});
</script>

{#if children}
	{@render children()}
{/if}
