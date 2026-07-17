<script>
	/**
	 * FacilityFinancialDataProvider — owns the shared state for the facility
	 * financial charts (Price line + Market Value stacked area). Two sibling
	 * components (`FacilityPriceChart`, `FacilityMarketValueChart`) render from
	 * the context this provider sets up, so a single data fetch powers both.
	 *
	 * Thin wrapper around `FacilityDerivedRateProvider`, which owns the data
	 * managers, viewport plumbing and chart effects; the recipe below carries
	 * everything financial-specific — the market_value volume metric, the
	 * hybrid price y-scale, the direction-decomposed price lines and the
	 * summary payload.
	 *
	 * When `active` is false, no data managers are created and no fetches fire
	 * — safe to always wrap even when financial charts are hidden.
	 */

	import { ChartStore } from '$lib/components/charts/v2';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { setFacilityFinancialDataContext } from './FacilityFinancialDataContext.svelte.js';
	import { toEnergySeriesRows } from './energy-basis.js';
	import { derivePriceRows, genPriceLabel, loadPriceLabel } from './price-lines.js';
	import { LINE_COLOUR } from './colours.js';
	import {
		createPriceYScale,
		formatPriceTick,
		PRICE_Y_DOMAIN,
		PRICE_Y_TICKS,
		PRICE_LINEAR_RANGE
	} from './price-y-scale.js';
	import FacilityDerivedRateProvider from './FacilityDerivedRateProvider.svelte';

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
	 * @property {any | null} [priceFacility] - Unit set the derived price lines are computed from, when it should differ from the displayed `facility` — e.g. the SPLIT battery view while the market-value chart shows the net unit (a net-signed bidirectional series can't be decomposed by direction at daily+ grains). Defaults to `facility`.
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
	 * @property {((range: { start: number, end: number }) => void)} [onviewportsettle] - Fired once when a pan/zoom gesture comes to rest.
	 * @property {number} [minDateMs] - Viewport left-edge floor for pan/zoom.
	 * @property {number} [reconcileSeq] - Bump to cancel stale in-flight fetches and re-request the current window (see FacilityDerivedRateProvider).
	 * @property {string[]} [hiddenUnitCodes] - Unit codes whose series are hidden from the market-value chart (e.g. toggled off in the units panel). The derived price line stays facility-wide.
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		facility,
		priceFacility = null,
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
		onviewportsettle,
		minDateMs = undefined,
		reconcileSeq = 0,
		hiddenUnitCodes = [],
		children
	} = $props();

	const dollarFormatter = getNumberFormat(0);

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

	/** @type {import('./derived-rate-recipe.js').DerivedRateRecipe} */
	const recipe = {
		volumeMetric: 'market_value',
		supportsRateSourceFacility: true,
		summaryRequiresBasis: true,

		createRateChart: ({ timeZone, heightClasses }) => {
			const chart = new ChartStore({
				key: Symbol('facility-price-chart'),
				title: 'Price',
				prefix: '',
				displayPrefix: '',
				baseUnit: '$/MWh',
				chartType: 'line',
				timeZone: timeZone
			});

			chart.chartStyles.chartHeightClasses = heightClasses;
			chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
			chart.chartStyles.snapTicks = true;
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			// Line chart — summing the price lines in the floating tooltip would be
			// meaningless (each is an independent $/MWh measure).
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
		},

		createVolumeChart: ({ timeZone, heightClasses, yTicks }) => {
			const chart = new ChartStore({
				key: Symbol('facility-market-value-chart'),
				title: 'Market Value',
				prefix: '',
				displayPrefix: 'k',
				baseUnit: '$',
				chartType: 'stacked-area',
				timeZone: timeZone
			});

			chart.chartStyles.chartHeightClasses = heightClasses;
			chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
			chart.chartStyles.snapTicks = true;
			if (yTicks !== undefined) chart.yTicks = yTicks;
			chart.useFormatY = true;
			chart.formatY = (/** @type {number} */ d) => {
				const converted = chart.convertAndFormatValue(d);
				return '$' + converted + chart.chartOptions.displayPrefix;
			};

			return chart;
		},

		// One line per direction: the generation side keeps the historical red
		// line; the load side (charge/pumping cost) picks up its fuel tech's
		// colour so it ties back to the same units in the stacked charts.
		getRateSeries: ({ hasLoadRateLine, genFuelTechs, loadFuelTechs }) => {
			if (hasLoadRateLine) {
				return {
					seriesNames: ['price', 'loadPrice'],
					seriesColours: {
						price: LINE_COLOUR,
						loadPrice: getFuelTechColour(loadFuelTechs[0])
					},
					seriesLabels: {
						price: `${genPriceLabel(genFuelTechs)} ($/MWh)`,
						loadPrice: `${loadPriceLabel(loadFuelTechs)} ($/MWh)`
					}
				};
			}
			return {
				seriesNames: ['price'],
				seriesColours: /** @type {Record<string, string>} */ ({ price: LINE_COLOUR }),
				seriesLabels: /** @type {Record<string, string>} */ ({ price: 'Av. Price ($/MWh)' })
			};
		},

		// Always step-after: each interval's price is held until the next reading.
		getRateCurveType: () => 'step',

		// Direction-decomposed price — an independent volume-weighted line per
		// side (generation vs load). See price-lines.js for the business rules
		// covering batteries (net + split), mixed fuel techs and pumped hydro.
		deriveRateRows: ({
			volumeRows,
			volumeSeriesNames,
			basisRows,
			basisSeriesNames,
			basisMetric,
			loadCodes,
			energyOpts
		}) =>
			derivePriceRows({
				mvRows: volumeRows,
				mvSeriesNames: volumeSeriesNames,
				basisRows,
				basisSeriesNames,
				basisMetric,
				loadCodes,
				energyOpts
			}),

		buildSummaryPayload: ({
			volumeRows,
			volumeSeriesNames,
			basisRows,
			basisSeriesNames,
			volumeChartStore,
			energyOpts
		}) => {
			// Energy intervals already carry `energy_<unit>` (MWh); power grains
			// convert MW → MWh via the interval length.
			const { rows: energyRows, seriesNames: energySeriesNames } = toEnergySeriesRows(
				basisRows,
				basisSeriesNames,
				/** @type {import('./energy-basis.js').BasisContext} */ (energyOpts)
			);

			return {
				mvData: volumeRows,
				energyData: energyRows,
				mvSeriesNames: volumeSeriesNames,
				energySeriesNames,
				mvChartStore: volumeChartStore
			};
		},

		setContext: (ctx) =>
			setFacilityFinancialDataContext({
				get priceChartStore() {
					return ctx.rateChartStore;
				},
				get mvChartStore() {
					return ctx.volumeChartStore;
				},
				get priceLoadingRanges() {
					return ctx.rateLoadingRanges;
				},
				get mvLoadingRanges() {
					return ctx.volumeLoadingRanges;
				},
				get showLoadingOverlay() {
					return ctx.showLoadingOverlay;
				},
				get timeZone() {
					return ctx.timeZone;
				},
				get viewStart() {
					return ctx.viewStart;
				},
				get viewEnd() {
					return ctx.viewEnd;
				},
				get hasViewportHandler() {
					return ctx.hasViewportHandler;
				},
				get isAtMinZoom() {
					return ctx.isAtMinZoom;
				},
				get isAtMaxZoom() {
					return ctx.isAtMaxZoom;
				},
				get hoverTime() {
					return ctx.hoverTime;
				},
				get onhoverchange() {
					return ctx.onhoverchange;
				},
				get focusTime() {
					return ctx.focusTime;
				},
				get onfocuschange() {
					return ctx.onfocuschange;
				},
				handlePanStart: ctx.handlePanStart,
				handlePan: ctx.handlePan,
				handlePanEnd: ctx.handlePanEnd,
				handleZoom: ctx.handleZoom,
				zoomIn: ctx.zoomIn,
				zoomOut: ctx.zoomOut,
				getTooltipData: ctx.getTooltipData,
				formatPriceValue,
				formatDollarValue
			})
	};
</script>

<FacilityDerivedRateProvider
	{facility}
	rateSourceFacility={priceFacility}
	{timeZone}
	{interval}
	{displayInterval}
	{viewStart}
	{viewEnd}
	rateChartHeight={priceChartHeight}
	volumeChartHeight={mvChartHeight}
	{yTicks}
	{active}
	{showTooltipDate}
	{hoverTime}
	{onhoverchange}
	{focusTime}
	{onfocuschange}
	{onsummarydata}
	{onviewportchange}
	{onviewportsettle}
	{minDateMs}
	{reconcileSeq}
	{hiddenUnitCodes}
	{recipe}
>
	{#if children}
		{@render children()}
	{/if}
</FacilityDerivedRateProvider>
