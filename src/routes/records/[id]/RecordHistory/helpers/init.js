import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
import { xTickValueFormatters } from './config';
/**
 * @param {string | undefined} period
 */
export default function (period) {
	let chartKey = Symbol('record-history');
	let dateBrushKey = Symbol('date-brush');

	setContext(
		chartKey,
		new ChartStore({
			key: chartKey
		})
	);

	setContext(
		dateBrushKey,
		new ChartStore({
			key: dateBrushKey
		})
	);

	let chartCxt = getContext(chartKey);
	let dateBrushCxt = getContext(dateBrushKey);

	chartCxt.chartOptions.setStepAfterCurve();

	chartCxt.chartStyles.chartHeightClasses = 'h-[520px]';
	chartCxt.chartStyles.strokeWidth = '1';
	chartCxt.chartStyles.showLineDots = true;
	// TODO: this should be dynamic based on the record metric
	chartCxt.chartOptions.prefix = 'M';
	chartCxt.chartOptions.displayPrefix = 'M';
	chartCxt.chartOptions.allowedPrefixes = ['M', 'G'];
	chartCxt.chartOptions.baseUnit = 'Wh';

	chartCxt.chartTooltips.showTotal = false;
	chartCxt.chartTooltips.valueKey = 'value';

	dateBrushCxt.chartStyles.chartHeightClasses = 'h-[50px] mb-10';
	dateBrushCxt.chartStyles.strokeWidth = 1;

	dateBrushCxt.chartOptions.setStepAfterCurve();

	if (period) {
		chartCxt.xTicks = xTickValueFormatters[period].ticks;
		chartCxt.formatTickX = xTickValueFormatters[period].formatTick;
		chartCxt.formatX = xTickValueFormatters[period].format;

		dateBrushCxt.xTicks = xTickValueFormatters[period].ticks;
		dateBrushCxt.formatTickX = xTickValueFormatters[period].formatTick;
		dateBrushCxt.formatX = xTickValueFormatters[period].format;
	}

	return {
		chartCxt,
		dateBrushCxt
	};
}
