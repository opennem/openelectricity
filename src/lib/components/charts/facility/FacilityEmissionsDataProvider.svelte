<script>
	/**
	 * FacilityEmissionsDataProvider — owns the shared state for the facility
	 * emissions charts (Intensity line + Emissions Volume stacked area). Two
	 * sibling components (`FacilityEmissionsIntensityChart`,
	 * `FacilityEmissionsVolumeChart`) render from the context this provider sets
	 * up, so a single data fetch powers both. The combined fetch URL
	 * (`metric=<basis>,market_value,emissions`, where `<basis>` is `energy` for
	 * energy intervals and `power` for 5m/30m) is identical to the one used by
	 * `FacilityFinancialDataProvider`, so all four data managers across the two
	 * providers collapse to one network round-trip per range.
	 *
	 * Thin wrapper around `FacilityDerivedRateProvider`, which owns the data
	 * managers, viewport plumbing and chart effects; the recipe below carries
	 * everything emissions-specific — the emissions volume metric, the single
	 * facility-wide intensity line and the summary payload.
	 *
	 * When `active` is false, no data managers are created and no fetches fire
	 * — safe to always wrap even when emissions charts are hidden.
	 */

	import { ChartStore } from '$lib/components/charts/v2';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { setFacilityEmissionsDataContext } from './FacilityEmissionsDataContext.svelte.js';
	import { deriveIntensityRows } from './intensity-lines.js';
	import { LINE_COLOUR } from './colours.js';
	import FacilityDerivedRateProvider from './FacilityDerivedRateProvider.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {string} timeZone
	 * @property {string} [interval]
	 * @property {string} [displayInterval]
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {string} [intensityChartHeight]
	 * @property {string} [emissionsVolumeChartHeight]
	 * @property {boolean} [active] - When false, skip manager instantiation (no fetch fires).
	 * @property {boolean} [showTooltipDate] - Whether the tooltips show their date/time header (default: true).
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onhoverchange] - Called when an emissions chart's local hover changes.
	 * @property {((data: { rows: any[], seriesNames: string[] }) => void)} [onsummarydata] - Visible-range reported emissions (tCO₂) for the metrics section.
	 * @property {((range: { start: number, end: number }) => void)} [onviewportchange]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportsettle] - Fired once when a pan/zoom gesture comes to rest.
	 * @property {number} [minDateMs] - Viewport left-edge floor for pan/zoom.
	 * @property {number} [reconcileSeq] - Bump to cancel stale in-flight fetches and re-request the current window (see FacilityDerivedRateProvider).
	 * @property {string[]} [hiddenUnitCodes] - Unit codes whose series are hidden from the emissions-volume chart (e.g. toggled off in the units panel). The derived intensity line stays facility-wide.
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
		intensityChartHeight = 'h-[200px]',
		emissionsVolumeChartHeight = 'h-[200px]',
		active = true,
		showTooltipDate = true,
		hoverTime = undefined,
		onhoverchange,
		onsummarydata,
		onviewportchange,
		onviewportsettle,
		minDateMs = undefined,
		reconcileSeq = 0,
		hiddenUnitCodes = [],
		children
	} = $props();

	const intensityFormatter = getNumberFormat(0);

	/**
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @param {number} value
	 */
	function formatEmissionsValue(chart, value) {
		return chart.convertAndFormatValue(value) + ' t';
	}

	/** @param {number} value */
	function formatIntensityValue(value) {
		return intensityFormatter.format(value) + ' kgCO₂e/MWh';
	}

	/** @type {import('./derived-rate-recipe.js').DerivedRateRecipe} */
	const recipe = {
		volumeMetric: 'emissions',
		supportsRateSourceFacility: false,
		summaryRequiresBasis: false,

		createRateChart: ({ timeZone, heightClasses }) => {
			const chart = new ChartStore({
				key: Symbol('facility-emissions-intensity-chart'),
				title: 'Emissions Intensity',
				prefix: '',
				displayPrefix: '',
				baseUnit: 'kgCO₂e/MWh',
				chartType: 'line',
				timeZone: timeZone
			});

			chart.chartStyles.chartHeightClasses = heightClasses;
			chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
			chart.chartStyles.snapTicks = true;
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			// Single-series line — the floating-tooltip total just repeats the value.
			chart.chartTooltips.showTotal = false;
			chart.useFormatY = true;
			chart.formatY = (/** @type {number} */ d) => intensityFormatter.format(d);

			return chart;
		},

		createVolumeChart: ({ timeZone, heightClasses }) => {
			const chart = new ChartStore({
				key: Symbol('facility-emissions-volume-chart'),
				title: 'Emissions',
				prefix: '',
				displayPrefix: '',
				baseUnit: 't',
				chartType: 'stacked-area',
				timeZone: timeZone
			});

			chart.chartStyles.chartHeightClasses = heightClasses;
			chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
			chart.chartStyles.snapTicks = true;
			chart.useFormatY = true;
			chart.formatY = (/** @type {number} */ d) => chart.convertAndFormatValue(d) + ' t';

			return chart;
		},

		// A single facility-wide line — intensity has no per-direction
		// decomposition (emissions are only ever produced, never consumed).
		getRateSeries: () => ({
			seriesNames: ['intensity'],
			seriesColours: { intensity: LINE_COLOUR },
			seriesLabels: { intensity: 'Emissions Intensity (kgCO₂e/MWh)' }
		}),

		getRateCurveType: (isEnergyInterval) => (isEnergyInterval ? 'step' : 'straight'),

		// Intensity = (total_emissions_tonnes × 1000) / total_energy_MWh →
		// kgCO₂e/MWh (energy is native MWh for energy intervals, power ×
		// interval_hours for 5m/30m). See intensity-lines.js.
		deriveRateRows: ({ volumeRows, volumeSeriesNames, basisRows, basisSeriesNames, energyOpts }) =>
			deriveIntensityRows({
				emissionsRows: volumeRows,
				emissionsSeriesNames: volumeSeriesNames,
				basisRows,
				basisSeriesNames,
				energyOpts
			}),

		// Visible-range reported emissions (tCO₂) for the metrics section.
		// Mirrors FacilityFinancialDataProvider.onsummarydata.
		buildSummaryPayload: ({ volumeRows, volumeSeriesNames }) => ({
			rows: volumeRows,
			seriesNames: volumeSeriesNames
		}),

		setContext: (ctx) =>
			setFacilityEmissionsDataContext({
				get intensityChartStore() {
					return ctx.rateChartStore;
				},
				get emissionsVolumeChartStore() {
					return ctx.volumeChartStore;
				},
				get intensityLoadingRanges() {
					return ctx.rateLoadingRanges;
				},
				get emissionsVolumeLoadingRanges() {
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
				handlePanStart: ctx.handlePanStart,
				handlePan: ctx.handlePan,
				handlePanEnd: ctx.handlePanEnd,
				handleZoom: ctx.handleZoom,
				zoomIn: ctx.zoomIn,
				zoomOut: ctx.zoomOut,
				getTooltipData: ctx.getTooltipData,
				formatIntensityValue,
				formatEmissionsValue
			})
	};
</script>

<FacilityDerivedRateProvider
	{facility}
	{timeZone}
	{interval}
	{displayInterval}
	{viewStart}
	{viewEnd}
	rateChartHeight={intensityChartHeight}
	volumeChartHeight={emissionsVolumeChartHeight}
	{active}
	{showTooltipDate}
	{hoverTime}
	{onhoverchange}
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
