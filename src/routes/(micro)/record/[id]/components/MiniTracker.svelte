<script>
	import { setContext, getContext } from 'svelte';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import nighttimes from '$lib/utils/nighttimes';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
	import { microRecordState } from '../state.svelte';
	import { chartOptions } from '../../../../(main)/records/[id]/MiniTracker/helpers/config';
	import xTickValueFormatters from '../../../../(main)/records/[id]/MiniTracker/helpers/xtick-value-formatters';

	let { record, focusDateTime, trackerData, fuelTechId, metric, period, timeZone } = $props();
	let focusOn = $derived(focusDateTime ? new Date(focusDateTime) : undefined);
	let chartCxt = init();

	$effect(() => {
		if (focusOn && chartCxt.seriesData.length > 0) {
			let findFocusData = chartCxt.seriesData.find((d) => d.time === focusOn.getTime());
			if (findFocusData) {
				microRecordState.focusRecord = findFocusData;
			}
		}
	});

	$effect(() => {
		if (trackerData) {
			let data = trackerData.data;
			let results = data[0].results;
			let result = results[0];
			let dataMetric = /** @type {import('openelectricity').DataMetric} */ (metric);
			let isIntervalPeriod = period === 'interval';

			if (fuelTechId && result) {
				if (fuelTechId === 'fossils') {
					result = results.find((d) => !d.columns.renewable);
				} else if (fuelTechId === 'renewables') {
					result = results.find((d) => d.columns.renewable);
				}
			}

			// convert result to a time series
			let timeSeries = result?.data.map((d) => {
				let date = new Date(d[0]);
				return {
					dateStr: d[0],
					date,
					time: date.getTime(),
					value: d[1]
				};
			});

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
	});

	function init(chartHeight = 280) {
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
		cxt.chartStyles.chartPadding = { top: 0, right: 0, bottom: 25, left: 0 };
		cxt.chartStyles.yAxisStroke = '#999';
		cxt.chartStyles.xAxisStroke = 'transparent';
		cxt.chartStyles.xAxisFill = 'transparent';
		cxt.chartStyles.showFocusDot = true;

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
