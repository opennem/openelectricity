<script>
	/**
	 * NetworkChart — reusable network-level visualisation for the Explorer.
	 *
	 * Network analogue of `FacilityChart`: drives a `ChartStore` + `ChartDataManager`
	 * through `StratumChart`, reusing the same pan/zoom, gap-aware caching and
	 * display-aggregation pipeline. Data comes from `/api/network/data` instead of
	 * the facility endpoint, and series are fuel-tech groups (Generation), a
	 * single spot-price line (Price), or market series — demand, curtailment and
	 * flows plus their `_energy` variants — configured via `market-metrics.js`.
	 */

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import {
		formatIntervalQuantityUnit,
		getIntervalSpec,
		isRollingInterval
	} from '$lib/components/charts/facility/range-interval-config.js';
	import {
		applyBucketFilter,
		bucketFilterKindFor,
		bucketFilterPredicate
	} from '$lib/components/charts/v2/bucket-filter.js';
	import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { createChartHost } from '$lib/components/charts/v2/chart-host.svelte.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '$lib/components/charts/v2/chart-loading-state.js';
	import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
	import { processNetworkData } from './process-network-data.js';
	import {
		processEmissionsIntensity,
		deriveIntensityDisplayRows,
		INTENSITY_SERIES_ID
	} from './process-emissions-intensity.js';
	import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
	import {
		createPriceYScale,
		formatPriceTick,
		PRICE_Y_DOMAIN,
		PRICE_Y_TICKS,
		PRICE_LINEAR_RANGE
	} from '$lib/components/charts/facility/price-y-scale.js';
	import { processMarketData } from './process-market-data.js';
	import {
		processPriceVw,
		deriveVwPriceDisplayRows,
		VW_PRICE_SERIES_ID
	} from './process-price-vw.js';
	import { LINE_COLOUR } from '$lib/components/charts/facility/colours.js';
	import { getMarketMetricConfig } from './market-metrics.js';
	import { getGroup, loadGroupsFor } from './groups.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { formatPrice } from '$lib/utils/formatters';
	import { fetchBufferMultiplierForInterval } from '../v2/fetch-window.js';
	import { ianaFromOffset, offsetMsFromOffset } from '../v2/network-time.js';
	import { perfSpan } from '../v2/perf.js';
	import nighttimes from '$lib/utils/nighttimes';
	import {
		automaticGenerationEnergyPrefix,
		generationUnitMaximumFractionDigits
	} from './generation-units.js';

	/**
	 * @typedef {Object} Props
	 * @property {string} region - Explorer region value ('_all', 'nsw1'…, 'wem')
	 * @property {'power' | 'energy' | 'market_value' | 'emissions' | 'emissions_intensity' | 'price' | 'price_vw' | 'demand' | 'demand_energy' | 'demand_gross' | 'demand_gross_energy' | 'curtailment' | 'curtailment_energy' | 'curtailment_wind' | 'curtailment_wind_energy' | 'curtailment_solar' | 'curtailment_solar_energy' | 'flows' | 'flows_energy' | 'renewable_generation' | 'renewable_generation_energy' | 'renewable_generation_storage' | 'renewable_generation_storage_energy' | 'renewable_share' | 'renewable_share_storage' | 'renewables' | 'renewables_energy'} [metric] - API metric
	 * @property {string} [interval] - Native OE interval (5m, 1h, 1d, 1M…)
	 * @property {string} [displayInterval] - Display interval for aggregation
	 * @property {string | null} [bucketFilter] - Recurring calendar-period filter id
	 * @property {string} [group] - Fuel-tech grouping value (Generation only)
	 * @property {'stacked' | 'line'} [chartKind] - Stacked area (generation) or line (price)
	 * @property {string} [timeZone] - Network offset string ('+10:00' / '+08:00')
	 * @property {string} [dateStart] - Initial viewport start (YYYY-MM-DD)
	 * @property {string} [dateEnd] - Initial viewport end (YYYY-MM-DD)
	 * @property {string} [title] - Chart header title
	 * @property {string} [chartHeight] - Height class
	 * @property {number} [chartHeightPx] - Height in px (overrides chartHeight)
	 * @property {boolean} [showContainer] - Wrap in bordered/padded container
	 * @property {boolean} [showHeader] - Show the chart header bar
	 * @property {'strip' | 'floating' | 'none'} [tooltipMode]
	 * @property {boolean} [generationUnitOptions] - Expose MW/GW for generation
	 *   power and MWh/GWh/TWh for generation energy. Energy defaults to TWh once
	 *   the largest visible positive stack reaches six MWh digits.
	 * @property {boolean} [useDivergingStack] - Stack positive/negative independently
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync
	 * @property {((time: number | undefined) => void)} [onhoverchange]
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange]
	 * @property {((range: {start: number, end: number}) => void)} [onviewportsettle] - Fired once
	 *   when a pan/zoom gesture comes to rest — parents apply grain switches here
	 * @property {boolean} [gestureActive] - Whether a peer chart is being manipulated
	 * @property {((active: boolean) => void)} [ongesturechange] - Reports this chart's gesture state
	 * @property {((tableData: {data: any[], nativeData: any[], start: number, end: number, seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string>, groupFuelTechs?: Record<string, string[]>}) => void)} [onvisibledata] - `data` is chart-ready; `nativeData` keeps the native cadence for window summaries.
	 * @property {((info: {hasData: boolean}) => void)} [onloadcomplete] - Fired whenever a settled
	 *   fetch leaves the manager idle; the first fire is the initial load, where
	 *   parents apply their default range preset
	 * @property {string[]} [hiddenSeriesNames] - Series ids to hide, e.g. a market
	 *   split whose source is toggled off elsewhere on the page. Applied on top of
	 *   the chart's own legend toggles, so it wins until the caller clears it.
	 * @property {string[]} [excludedFuelTechGroups] - Fuel-tech groups omitted
	 *   before an emissions-intensity ratio is calculated.
	 * @property {'always' | 'tap-to-engage'} [panZoomMode]
	 * @property {boolean} [panZoomEngaged]
	 * @property {number} [minDateMs] - Viewport left-edge floor (default: EARLIEST_DATA_MS)
	 * @property {boolean} [nightShading] - Shade nighttime bands like the homepage
	 *   7-day chart; only renders at sub-daily grain, coarser grains clear it
	 * @property {boolean} [resizable] - Show the drag-to-resize handle below the
	 *   chart. Resizable charts should rely on `chartHeight`/the persisted height
	 *   rather than `chartHeightPx`, which would clobber a restored height.
	 * @property {string} [heightStorageKey] - localStorage key persisting the
	 *   resized height; share one key across a split pair so toggling keeps it
	 * @property {string} [loadingLabel] - Target window shown in the loading veil
	 * @property {boolean} [holdFrame] - Keep the rendered frame until all synced charts are ready
	 * @property {{ widenMultiplier?: number, grains?: Array<{ interval: string, metric: string, seriesKey?: string, windowMs: number }> } | null} [prefetchPlan]
	 *   - Idle plan for widening the current cache and warming likely next intervals
	 * @property {Array<{ id: string, data: any[], valueKey: string, colour: string, scale?: 'y' | 'percent', strokeWidth?: number, label?: string, tooltipUnit?: string, formatTooltipValue?: (value: number) => string }>} [overlayLines]
	 *   - Lines drawn above the stack from independent row sets (e.g. demand,
	 *   renewable share); `scale: 'percent'` adds a right-hand 0–100% axis
	 * @property {Array<{ id: string, data: any[], series: Array<{ id: string, colour: string, label?: string, tooltipUnit?: string, formatTooltipValue?: (value: number) => string }> }>} [overlayAreas]
	 *   - Hatched bands stacked on top of the rendered stack (e.g. curtailment)
	 */

	/** @type {Props} */
	let {
		region,
		metric = 'power',
		interval = '5m',
		displayInterval = '30m',
		bucketFilter = null,
		group = 'detailed',
		chartKind = 'stacked',
		timeZone = '+10:00',
		dateStart = '',
		dateEnd = '',
		title = '',
		chartHeight = 'h-[300px]',
		chartHeightPx = 0,
		showContainer = true,
		showHeader = true,
		tooltipMode = /** @type {'strip' | 'floating' | 'none'} */ ('floating'),
		generationUnitOptions = false,
		useDivergingStack = false,
		hoverTime = undefined,
		onhoverchange,
		onviewportchange,
		onviewportsettle,
		gestureActive = false,
		ongesturechange,
		onvisibledata,
		onloadcomplete,
		hiddenSeriesNames = /** @type {string[]} */ ([]),
		excludedFuelTechGroups = /** @type {string[]} */ ([]),
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false),
		minDateMs = EARLIEST_DATA_MS,
		nightShading = false,
		resizable = false,
		heightStorageKey = undefined,
		loadingLabel = '',
		holdFrame = false,
		prefetchPlan = null,
		overlayLines = /** @type {any[]} */ ([]),
		overlayAreas = /** @type {any[]} */ ([])
	} = $props();

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isPriceKind = $derived(chartKind === 'line');
	let isMarketValueMetric = $derived(metric === 'market_value');
	let marketConfig = $derived(getMarketMetricConfig(metric));
	let isEmissionsMetric = $derived(metric === 'emissions');
	let isIntensityMetric = $derived(metric === 'emissions_intensity');
	let isVwPriceMetric = $derived(metric === 'price_vw');
	let isEnergyMetric = $derived(metric === 'energy' || metric.endsWith('_energy'));

	/** Resolve specialised line metrics before the generic price branch. */
	let panelKind = $derived(
		isIntensityMetric
			? /** @type {const} */ ('intensity')
			: isEmissionsMetric
				? /** @type {const} */ ('emissions')
				: isMarketValueMetric
					? /** @type {const} */ ('market-value')
					: isVwPriceMetric
						? /** @type {const} */ ('price-vw')
						: marketConfig
							? /** @type {const} */ ('market')
							: isPriceKind
								? /** @type {const} */ ('price')
								: /** @type {const} */ ('generation')
	);

	/** Default header title per panel kind — the constructors and the title
	 *  sync effect both read this so the ladder lives once. */
	let defaultTitle = $derived(
		{
			intensity: 'Emissions Intensity',
			emissions: 'Emissions',
			'market-value': 'Market Value',
			'price-vw': 'Price',
			market: 'Market',
			price: 'Price',
			generation: 'Generation'
		}[panelKind]
	);

	/** Ratios are derived after their component quantities have been summed. */
	let sumsForDisplay = $derived(
		isEnergyMetric ||
			isMarketValueMetric ||
			isEmissionsMetric ||
			isIntensityMetric ||
			isVwPriceMetric
	);

	/** Fine grain (sub-daily) drives the power-style viewport limits. */
	let fineGrain = $derived(interval === '5m' || interval === '1h');

	// ============================================
	// Series processing config
	// ============================================

	let groupConfig = $derived(getGroup(group));
	let loadGroupsToInvert = $derived(loadGroupsFor(groupConfig));
	let intensityFilterKey = $derived([...excludedFuelTechGroups].sort().join(','));

	/**
	 * Build a processor for the requested metric and native interval.
	 * Prefetched managers may use a different interval from the visible chart.
	 * @param {string} targetMetric
	 * @param {string} targetInterval
	 */
	function createResponseProcessor(targetMetric, targetInterval) {
		const tz = timeZone || '+10:00';
		if (panelKind === 'intensity') {
			return (/** @type {any} */ resp) =>
				processEmissionsIntensity(resp, {
					intervalHours: getIntervalHours(targetInterval),
					networkTimezone: tz,
					groupMap: groupConfig.fuelTechs,
					excludedGroups: excludedFuelTechGroups
				});
		}
		if (panelKind === 'market') {
			const cfg = /** @type {NonNullable<typeof marketConfig>} */ (
				getMarketMetricConfig(targetMetric)
			);
			return (/** @type {any} */ resp) =>
				processMarketData(resp, { seriesDefs: cfg.seriesDefs, networkTimezone: tz });
		}
		if (panelKind === 'price-vw') {
			return (/** @type {any} */ resp) =>
				processPriceVw(resp, {
					intervalHours: getIntervalHours(targetInterval),
					networkTimezone: tz
				});
		}
		if (panelKind === 'price') {
			return (/** @type {any} */ resp) =>
				processPriceData(resp, { metricFilter: 'price', networkTimezone: tz });
		}
		const cfg = {
			groupMap: groupConfig.fuelTechs,
			groupOrder: groupConfig.order,
			groupLabels: groupConfig.labels,
			// Emissions are only ever produced — the charging/pumping fuel techs
			// carry zero-or-positive tonnes, so nothing inverts.
			loadsToInvert: panelKind === 'emissions' ? [] : loadGroupsToInvert,
			getColour: getFuelTechColour,
			metricFilter: targetMetric,
			networkTimezone: tz
		};
		return (/** @type {any} */ resp) => processNetworkData(resp, cfg);
	}

	let processResponseFn = $derived.by(() => createResponseProcessor(metric, interval));

	/**
	 * Build the network fetch URL — ChartDataManager passes its standard params
	 * (interval, metric, date_start, date_end); we add the region and route to
	 * `/api/network/data`.
	 * @param {URLSearchParams} params
	 */
	let buildFetchUrl = $derived.by(() => {
		const currentRegion = region;
		return (/** @type {URLSearchParams} */ params) => {
			params.set('region', currentRegion);
			return `/api/network/data?${params.toString()}`;
		};
	});

	// ============================================
	// Chart host — shared manager lifecycle, viewport + pan/zoom recipe
	// ============================================

	// Fuel-tech panels are group-dependent, and intensity additionally depends
	// on the table filters. Changing either swaps in a processor with the exact
	// same identity as the visible series set.
	let seriesKey = $derived(
		panelKind === 'intensity'
			? `${group}:${intensityFilterKey}`
			: panelKind === 'generation' || panelKind === 'market-value' || panelKind === 'emissions'
				? group
				: ''
	);

	const host = createChartHost({
		cacheKey: () => `${region}:${chartKind}`,
		interval: () => interval,
		metric: () => metric,
		seriesKey: () => seriesKey,
		// A region change means a different data source — drop the warm managers.
		stashScope: () => region,
		createManager: () =>
			new ChartDataManager({
				cacheKey: `${region}:${chartKind}`,
				networkTimezone: timeZone || '+10:00',
				interval,
				metric,
				seriesKey,
				processResponse: processResponseFn,
				buildFetchUrl
			}),
		initialViewport: () => {
			if (!dateStart || !dateEnd) return null;
			const tz = timeZone || '+10:00';
			return {
				start: new Date(dateStart + 'T00:00:00' + tz).getTime(),
				end: Math.min(new Date(dateEnd + 'T23:59:59' + tz).getTime(), Date.now())
			};
		},
		fetchBufferMultiplier: () => fetchBufferMultiplierForInterval(interval),
		// Retain prefetched managers across common chart switches.
		stashMax: 6,
		idlePrefetch: () => prefetchPlan,
		createManagerFor: (spec) => {
			const tz = timeZone || '+10:00';
			return new ChartDataManager({
				cacheKey: `${region}:${chartKind}`,
				networkTimezone: tz,
				interval: spec.interval,
				metric: spec.metric,
				seriesKey: spec.seriesKey ?? seriesKey,
				processResponse: createResponseProcessor(spec.metric, spec.interval),
				buildFetchUrl
			});
		},
		minDateMs: () => minDateMs,
		fineViewportLimits: () => fineGrain,
		onGestureStart: () => chartStore?.clearHover(),
		onGestureActiveChange: (active) => ongesturechange?.(active),
		onviewportchange: (range) => onviewportchange?.(range),
		onviewportsettle: (range) => onviewportsettle?.(range)
	});

	let dataManager = $derived(host.dataManager);
	let viewStart = $derived(host.viewStart);
	let viewEnd = $derived(host.viewEnd);
	let isPanning = $derived(host.isPanning);

	// True while this chart or a synced peer is being manipulated.
	let inGesture = $derived(host.isGesturing || gestureActive);

	// ============================================
	// Chart store
	// ============================================

	/**
	 * Presentation shared by every panel kind — height, padding and tick
	 * snapping. Called inside the `chartStore` derived so the prop reads
	 * (chartHeight, chartHeightPx) stay tracked exactly as before.
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function applyCommonStyles(chart) {
		chart.chartStyles.chartHeightClasses = chartHeight;
		if (chartHeightPx) chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
	}

	/**
	 * Time-axis tick labels for the market and generation arms — the price arm
	 * keeps the ChartStore default.
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function applyTimeTickFormat(chart) {
		chart.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
	}

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
	let chartStore = $derived.by(() => {
		// Recreated when the panel kind flips.
		if (panelKind === 'intensity' || panelKind === 'emissions') {
			const intensity = panelKind === 'intensity';
			const chart = new ChartStore({
				key: Symbol(`network-${panelKind}`),
				title: title || defaultTitle,
				prefix: '',
				displayPrefix: '',
				baseUnit: intensity ? 'kgCO₂e/MWh' : 't',
				chartType: intensity ? 'line' : undefined,
				timeZone
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			// Single-series line — the strip total would just repeat the value.
			if (intensity) chart.chartTooltips.showTotal = false;
			else chart.chartTooltips.reverseSeriesOrder = true;
			applyTimeTickFormat(chart);
			return chart;
		}

		if (panelKind === 'market' && marketConfig) {
			const chart = new ChartStore({
				key: Symbol('network-market'),
				title: title || defaultTitle,
				prefix: /** @type {SiPrefix} */ (marketConfig.prefix),
				displayPrefix: /** @type {SiPrefix} */ (marketConfig.prefix),
				baseUnit: marketConfig.baseUnit,
				// Line kind renders as a line; stacked kind takes the constructor's
				// 'stacked-area' default, same as the generation store.
				chartType: marketConfig.chartKind === 'line' ? 'line' : undefined,
				timeZone
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			chart.useDivergingStack = marketConfig.diverging ?? useDivergingStack;
			if (marketConfig.chartKind === 'line') chart.chartTooltips.showTotal = false;
			applyTimeTickFormat(chart);
			return chart;
		}

		if (panelKind === 'price-vw') {
			// Unlike spot prices, the rolling ratio uses the standard linear domain.
			const chart = new ChartStore({
				key: Symbol('network-price-vw'),
				title: title || defaultTitle,
				prefix: '',
				displayPrefix: '',
				baseUnit: '$/MWh',
				chartType: 'line',
				timeZone
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			chart.chartTooltips.showTotal = false;
			chart.formatTooltipY = formatPrice;
			applyTimeTickFormat(chart);
			return chart;
		}

		if (panelKind === 'price') {
			const chart = new ChartStore({
				key: Symbol('network-price'),
				title: title || defaultTitle,
				prefix: '',
				displayPrefix: '',
				baseUnit: '$/MWh',
				chartType: 'line',
				timeZone
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			chart.chartTooltips.showTotal = false;
			// Hybrid axis: linear $0–$300, log above $300 and below $0, on a fixed
			// domain — the same structure as the facility price chart, so spot
			// prices read identically across the app and spikes/negatives stay
			// visible without flattening the everyday band.
			chart.yScale = createPriceYScale();
			chart.setYDomain([...PRICE_Y_DOMAIN]);
			chart.yTicks = PRICE_Y_TICKS;
			chart.solidLineRange = PRICE_LINEAR_RANGE;
			chart.useFormatY = true;
			chart.formatY = formatPriceTick;
			// The axis formatter blanks values outside the linear band, so
			// tooltips format independently — exact prices, cents always shown.
			chart.formatTooltipY = formatPrice;
			return chart;
		}

		const marketValue = panelKind === 'market-value';
		const chart = new ChartStore({
			key: Symbol(marketValue ? 'network-market-value' : 'network-generation'),
			title: title || defaultTitle,
			prefix: marketValue ? '' : 'M',
			displayPrefix: marketValue ? 'k' : 'M',
			baseUnit: marketValue ? '$' : 'W',
			timeZone
		});
		applyCommonStyles(chart);
		chart.useDivergingStack = useDivergingStack;
		chart.chartTooltips.reverseSeriesOrder = true;
		if (marketValue) {
			chart.useFormatY = true;
			chart.formatY = (/** @type {number} */ d) =>
				'$' + chart.convertAndFormatValue(d) + chart.chartOptions.displayPrefix;
		}
		applyTimeTickFormat(chart);
		return chart;
	});

	// Keep height in sync on panel resize
	$effect(() => {
		if (chartStore && chartHeightPx) chartStore.chartStyles.chartHeightPx = chartHeightPx;
	});

	// Title sync
	$effect(() => {
		if (chartStore) chartStore.title = title || defaultTitle;
	});

	// Series metadata. The intensity line is derived at display time from the
	// manager's component series (emissions + energy), so its store meta is
	// fixed rather than copied from the processed cache.
	$effect(() => {
		if (!chartStore || holdFrame) return;
		if (panelKind === 'intensity') {
			chartStore.seriesNames = [INTENSITY_SERIES_ID];
			chartStore.seriesColours = { [INTENSITY_SERIES_ID]: LINE_COLOUR };
			chartStore.seriesLabels = { [INTENSITY_SERIES_ID]: 'Emissions Intensity (kgCO₂e/MWh)' };
			return;
		}
		if (panelKind === 'price-vw') {
			chartStore.seriesNames = [VW_PRICE_SERIES_ID];
			chartStore.seriesColours = { [VW_PRICE_SERIES_ID]: LINE_COLOUR };
			chartStore.seriesLabels = { [VW_PRICE_SERIES_ID]: 'Volume-Weighted Price ($/MWh)' };
			return;
		}
		if (!dataManager?.processedCache) return;
		const processed = dataManager.processedCache;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Caller-driven series hiding, kept separate from the metadata effect so a
	// refetch doesn't clear it and a toggle doesn't re-run series setup.
	$effect(() => {
		if (chartStore && !holdFrame) chartStore.hiddenSeriesNames = hiddenSeriesNames;
	});

	// Caller-driven overlay lines (demand / renewable share) — independent row
	// sets drawn above the stack.
	$effect(() => {
		if (chartStore && !holdFrame) chartStore.overlayLines = overlayLines;
	});

	// Caller-driven hatched overlay bands (curtailment) stacked on the top.
	$effect(() => {
		if (chartStore && !holdFrame) chartStore.overlayAreas = overlayAreas;
	});

	// Metric-dependent options (unit + curve)
	let lastGenerationUnitBasis = '';
	$effect(() => {
		if (!chartStore || holdFrame) return;
		const intervalCurve = getIntervalSpec(displayInterval)?.curveType ?? 'straight';
		if (panelKind === 'market' && marketConfig) {
			chartStore.chartOptions.baseUnit = marketConfig.baseUnit;
			chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
				marketConfig.chartKind === 'line'
					? (getIntervalSpec(displayInterval)?.curveType ?? 'straight')
					: isEnergyMetric
						? 'step'
						: 'straight'
			);
			return;
		}
		if (panelKind === 'price') {
			// The spot price is a step function by nature — held constant within
			// each dispatch interval — so it renders stepped at every grain.
			chartStore.chartOptions.selectedCurveType = 'step';
			return;
		}
		if (panelKind === 'intensity' || panelKind === 'price-vw') {
			chartStore.chartOptions.selectedCurveType = /** @type {any} */ (intervalCurve);
			return;
		}
		if (panelKind === 'market-value') {
			chartStore.chartOptions.baseUnit = '$';
			chartStore.chartOptions.selectedCurveType = 'step';
			return;
		}
		chartStore.chartOptions.baseUnit =
			panelKind === 'emissions'
				? formatIntervalQuantityUnit('tCO₂e', displayInterval)
				: isEnergyMetric
					? 'Wh'
					: 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			panelKind === 'emissions' ? intervalCurve : isEnergyMetric ? 'step' : 'straight'
		);

		if (panelKind === 'generation' && generationUnitOptions) {
			const basis = isEnergyMetric ? 'energy' : 'power';
			chartStore.chartOptions.allowedPrefixes = isEnergyMetric ? ['M', 'G', 'T'] : ['M', 'G'];
			if (basis !== lastGenerationUnitBasis) {
				lastGenerationUnitBasis = basis;
				chartStore.chartOptions.resetDisplayPrefix('M');
			}
		} else {
			lastGenerationUnitBasis = '';
			chartStore.chartOptions.allowedPrefixes = [];
		}
	});

	// Keep the automatic energy unit readable until the user makes an explicit
	// selection in the chart header/options. Power always starts in MW.
	$effect(() => {
		if (!chartStore || panelKind !== 'generation' || !generationUnitOptions || !isEnergyMetric)
			return;
		chartStore.chartOptions.setAutomaticDisplayPrefix(
			automaticGenerationEnergyPrefix(chartStore.seriesData, chartStore.visibleSeriesNames)
		);
	});

	// Converted GW/GWh/TWh values need decimals on both the y-axis and tooltip;
	// raw MW/MWh remains a whole-number display.
	$effect(() => {
		if (!chartStore || panelKind !== 'generation' || !generationUnitOptions) return;
		chartStore.maximumFractionDigits = generationUnitMaximumFractionDigits(
			chartStore.chartOptions.displayPrefix
		);
	});

	// Memoises the slice + display aggregation so pan ticks within one native
	// sample reuse the previous rows array (stable reference → the seriesData
	// assignment below is a signal no-op on a hit).
	const visibleAggregation = createVisibleAggregation();

	// Native table rows need a separate memo from filtered or rolling chart rows.
	const nativeVisibleAggregation = createVisibleAggregation();

	// Reuse one marker so gesture-mode memoisation stays stable.
	const GESTURE_SLICE = {};

	// Keep derived ratio rows stable when the aggregated source is unchanged.
	/** @type {any[] | null} */ let lastIntensitySource = null;
	/** @type {any[]} */ let lastIntensityRows = [];
	/** @type {any[] | null} */ let lastVwPriceSource = null;
	/** @type {any[]} */ let lastVwPriceRows = [];

	// Visible data + axis
	$effect(() => {
		const manager = dataManager;
		if (!chartStore || !manager?.processedCache) return;
		// Keep the old frame until a coordinated switch releases every chart.
		if (holdFrame) return;

		perfSpan('chart:viewport-effect', () => {
			const start = viewStart;
			const end = viewEnd;
			const currentDisplayInterval = displayInterval;
			const sums = sumsForDisplay;
			const gesturing = inGesture;

			// Keep the vertical scale stable until the gesture settles.
			if (gesturing) chartStore.freezeYDomain();
			else chartStore.unfreezeYDomain();

			const visibleData = visibleAggregation(
				manager.processedCache,
				{
					viewStart: start,
					viewEnd: end,
					apiInterval: interval,
					displayInterval: currentDisplayInterval,
					ianaTimeZone,
					method: sums ? 'sum' : 'mean',
					bucketFilter
				},
				// Padded slices reuse rows during gestures; settling restores the exact slice.
				gesturing ? GESTURE_SLICE : undefined
			);

			// Derive ratios only after the component series reach the display grain.
			let renderData = visibleData;
			if (panelKind === 'intensity') {
				if (lastIntensitySource !== visibleData) {
					lastIntensitySource = visibleData;
					lastIntensityRows = deriveIntensityDisplayRows(visibleData);
				}
				renderData = lastIntensityRows;
			} else if (panelKind === 'price-vw') {
				if (lastVwPriceSource !== visibleData) {
					lastVwPriceSource = visibleData;
					lastVwPriceRows = deriveVwPriceDisplayRows(visibleData);
				}
				renderData = lastVwPriceRows;
			}

			chartStore.seriesData = renderData;
			chartStore.setXDomain(start, end);
			// The price panel keeps its fixed hybrid domain; every other panel
			// re-derives the y-domain from the visible data.
			if (panelKind !== 'price') chartStore.setYDomain(undefined);

			applyFacilityTimeAxis(chartStore, {
				data: renderData,
				viewStart: start,
				viewEnd: end,
				ianaTimeZone,
				timeZone,
				bucketFilter,
				// Summed quantities such as 30-minute emissions (and market value)
				// still use the sub-daily power axis at fine grains, so their date
				// gridlines match the synced generation/price charts; the energy
				// bucket lattice takes over at the step-curve display intervals.
				isEnergy: getIntervalSpec(currentDisplayInterval)?.curveType === 'step',
				displayInterval: currentDisplayInterval
			});
		});
	});

	// Debounced visible-data callback for the external table
	/** @type {ReturnType<typeof setTimeout> | null} */
	let tableDebounceTimer = null;
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		const currentDisplayInterval = displayInterval;
		const currentInterval = interval;
		const currentIana = ianaTimeZone;
		const currentBucketFilter = bucketFilter;
		const sums = sumsForDisplay;
		const manager = dataManager;
		const _cache = manager?.processedCache;
		const callback = onvisibledata;

		if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		// Build the table snapshot once, after the gesture settles.
		if (inGesture) return;
		if (!callback || !manager?.processedCache || !manager.seriesMeta) return;

		const meta = manager.seriesMeta;
		tableDebounceTimer = setTimeout(() => {
			// Usually a memo hit. Read colours here to avoid cloning them on each effect run.
			const rows = visibleAggregation(manager.processedCache, {
				viewStart: start,
				viewEnd: end,
				apiInterval: currentInterval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone: currentIana,
				method: sums ? 'sum' : 'mean',
				bucketFilter: currentBucketFilter
			});
			// Table rows must neither overlap (rolling intervals) nor include the
			// synthetic row that closes a filtered chart band.
			const nativeRows =
				currentDisplayInterval === currentInterval && !currentBucketFilter
					? rows
					: applyBucketFilter(
							nativeVisibleAggregation(manager.processedCache, {
								viewStart: start,
								viewEnd: end,
								apiInterval: currentInterval,
								displayInterval: currentInterval,
								ianaTimeZone: currentIana,
								method: sums ? 'sum' : 'mean'
							}),
							isRollingInterval(currentDisplayInterval)
								? null
								: bucketFilterPredicate(
										bucketFilterKindFor(currentDisplayInterval),
										currentBucketFilter,
										currentIana
									)
						);
			callback({
				data: rows,
				nativeData: nativeRows,
				start,
				end,
				seriesNames: meta.seriesNames,
				seriesLabels: meta.seriesLabels,
				seriesColours: { ...chartStore.seriesColours },
				groupFuelTechs: meta.groupFuelTechs
			});
		}, 300);

		return () => {
			if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		};
	});

	// Cache nighttime bands by network-local day; the plot clips them to the viewport.
	const EMPTY_SHADING = /** @type {Date[][]} */ ([]);
	let lastNightKey = '';
	let lastNightBands = EMPTY_SHADING;
	$effect(() => {
		if (!chartStore) return;
		if (holdFrame) return; // Keep bands aligned with the held x-scale.
		if (!nightShading || !fineGrain) {
			chartStore.bgShadingData = EMPTY_SHADING;
			return;
		}
		const tz = timeZone || '+10:00';
		const bands = perfSpan('chart:night-shading', () => {
			const DAY_MS = 24 * 60 * 60 * 1000;
			const offsetMs = offsetMsFromOffset(tz);
			const dayLo = Math.floor((viewStart + offsetMs) / DAY_MS);
			const dayHi = Math.ceil((viewEnd + offsetMs) / DAY_MS);
			const nightKey = `${dayLo}|${dayHi}|${tz}`;
			if (nightKey !== lastNightKey) {
				lastNightKey = nightKey;
				lastNightBands = nighttimes(
					new Date(dayLo * DAY_MS - offsetMs),
					new Date(dayHi * DAY_MS - offsetMs),
					tz
				);
			}
			return lastNightBands;
		});
		chartStore.bgShadingData = bands;
		chartStore.bgShadingFill = '#33333311';
	});

	// Keep held frames veiled until every synced chart is ready.
	let showLoadingOverlay = $derived(
		computeShowLoadingOverlay(dataManager, chartStore) || holdFrame
	);

	// Report load completion once the in-flight fetch settles — `cacheStart` is a
	// stable "data was found" signal that survives panning.
	$effect(() => {
		const manager = dataManager;
		if (!manager?.initialLoadComplete) return;
		if (manager.hasPendingFetch) return;
		onloadcomplete?.({ hasData: manager.cacheStart !== null });
	});

	// ============================================
	// Hover / focus
	// ============================================

	/** @param {number} time @param {string} [key] */
	function handleHover(time, key) {
		if (isPanning) return;
		chartStore?.setHover(time, key);
		onhoverchange?.(time);
	}
	function handleHoverEnd() {
		chartStore?.clearHover();
		onhoverchange?.(undefined);
	}

	$effect(() => {
		if (!onhoverchange) return;
		const t = hoverTime;
		if (!chartStore) return;
		if (chartStore.hoverTime === t) return;
		if (t === undefined) chartStore.clearHover();
		else chartStore.setHover(t);
	});

	/** @param {number} time */
	function handleFocus(time) {
		if (isPanning) return;
		chartStore?.toggleFocus(time);
	}

	// ============================================
	// Public API — delegated to the shared chart host
	// ============================================

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		host.setViewport(startMs, endMs);
	}

	/**
	 * Cancel in-flight work outside the current buffered window and fetch the
	 * final gaps immediately. Called when a gesture settles — locally via the
	 * host's onSettle, and by the Explorer for peer panels that were fed
	 * per-frame setViewport calls during the gesture.
	 */
	export function reconcileFetches() {
		host.reconcileFetches();
	}

	/** Whether the current grain is loaded and idle, including cache-only switches. */
	export function isSettled() {
		const manager = dataManager;
		if (!manager) return false;
		if (
			manager.cacheKey !== `${region}:${chartKind}` ||
			manager.interval !== interval ||
			manager.metric !== metric ||
			manager.seriesKey !== seriesKey
		) {
			return false;
		}
		return manager.initialLoadComplete && !manager.hasPendingFetch && !manager.isLoading;
	}

	/** The active SI prefix is exposed so adjacent summaries can stay in sync
	 *  with the unit selected in this chart's options. */
	export function getDisplayPrefix() {
		return chartStore?.chartOptions.displayPrefix ?? 'M';
	}
</script>

{#if chartStore}
	<div class="group relative {showContainer ? 'rounded-lg p-4' : ''}">
		<StratumChart
			chart={chartStore}
			{showHeader}
			{tooltipMode}
			zoomMode="static"
			onzoomin={host.zoomIn}
			onzoomout={host.zoomOut}
			isAtMinZoom={host.isAtMinZoom}
			isAtMaxZoom={host.isAtMaxZoom}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			onpanstart={host.handlePanStart}
			onpan={host.handlePan}
			onpanend={host.handlePanEnd}
			onzoom={host.handleZoom}
			enablePan={true}
			{panZoomMode}
			bind:engaged={panZoomEngaged}
			viewDomain={null}
			loadingRanges={dataManager?.loadingRanges ?? []}
			{resizable}
			{heightStorageKey}
		/>

		{#if showLoadingOverlay}
			<div class="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
				<span class="text-sm text-mid-warm-grey">Loading {loadingLabel || 'data'}…</span>
			</div>
		{/if}
	</div>
{:else}
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeightPx
			? ''
			: chartHeight}"
		style:height={chartHeightPx ? `${chartHeightPx}px` : undefined}
	>
		<span class="text-sm text-mid-warm-grey">Loading data…</span>
	</div>
{/if}
