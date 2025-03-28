<script>
	import { setContext, getContext } from 'svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import nighttimes from '$lib/utils/nighttimes';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
	import { chartOptions } from '../../../../(main)/records/[id]/MiniTracker/helpers/config';
	import xTickValueFormatters from '../../../../(main)/records/[id]/MiniTracker/helpers/xtick-value-formatters';

	let { record, focusTime, timeSeries, metric, period, timeZone } = $props();
	let focusOn = $derived(focusTime ? new Date(focusTime) : undefined);
	let chartCxt = init();

	if (timeSeries.length > 0) {
		let dataMetric = /** @type {import('openelectricity').DataMetric} */ (metric);
		let isIntervalPeriod = period === 'interval';

		chartCxt.chartOptions.prefix = chartOptions[dataMetric].prefix;
		chartCxt.chartOptions.displayPrefix = chartOptions[dataMetric].displayPrefix;
		chartCxt.chartOptions.allowedPrefixes = chartOptions[dataMetric].allowedPrefixes;
		chartCxt.chartOptions.baseUnit = chartOptions[dataMetric].baseUnit;

		chartCxt.xTicks = xTickValueFormatters[record.period].ticks;
		chartCxt.formatTickX = xTickValueFormatters[record.period].formatTick;
		chartCxt.formatX = xTickValueFormatters[record.period].format;
		chartCxt.timeZone = timeZone;
		chartCxt.seriesData = timeSeries;
		chartCxt.seriesNames = ['value'];
		chartCxt.seriesColours = { value: fuelTechColourMap[record.fueltech_id || 'demand'] };
		chartCxt.seriesLabels = { value: '' };
		chartCxt.focusTime = focusOn?.getTime() || record.time;
		chartCxt.chartTooltips.valueKey = 'value';
		// chartCxt.useFormatY = true;
		// chartCxt.formatY = () => '';
		chartCxt.chartStyles.xTextClasses = 'text-lg text-mid-warm-grey';
		chartCxt.chartStyles.xAxisYTick = 23;

		if (timeSeries && isIntervalPeriod) {
			chartCxt.shadingData = nighttimes(
				timeSeries[0].date,
				timeSeries[timeSeries.length - 1].date,
				timeZone
			);
			chartCxt.shadingFill = '#33333311';
		}

		if (isIntervalPeriod) {
			chartCxt.chartOptions.setSmoothCurve();
		} else {
			chartCxt.chartOptions.setStepCurve();
		}
	}

	function init(chartHeight = 385) {
		let chartKey = Symbol('mini-tracker');

		setContext(
			chartKey,
			new ChartStore({
				key: chartKey
			})
		);

		let cxt = getContext(chartKey);

		cxt.chartTooltips.showTotal = false;
		cxt.chartStyles.chartHeightClasses = `h-[${chartHeight}px]`;
		cxt.chartStyles.chartPadding = { top: 0, right: 0, bottom: 30, left: 0 };
		cxt.chartStyles.yAxisStroke = '#999';
		cxt.chartStyles.xAxisStroke = 'transparent';
		cxt.chartStyles.xAxisFill = 'transparent';
		cxt.chartStyles.showFocusDot = true;
		cxt.chartStyles.focusYLineDotBorderColour = '#ffffff';
		cxt.chartStyles.focusYLineDotRadius = 10;
		cxt.chartStyles.focusYLineDotColour = '#000000';
		cxt.chartStyles.focusYLineStrokeColour = '#000000';

		return cxt;
	}
</script>

<LensChart
	cxtKey={chartCxt.key}
	displayOptions={false}
	showHeader={false}
	showTooltip={false}
	chartPaddingClasses="p-0"
/>
