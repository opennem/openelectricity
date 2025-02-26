import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';

export default function () {
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

	chartCxt.chartStyles.chartHeightClasses = 'h-[490px]';
	chartCxt.chartStyles.chartPadding = { top: 0, right: 0, bottom: 30, left: 0 };
	chartCxt.chartStyles.strokeWidth = '1.5';
	chartCxt.chartStyles.showLineDots = false;
	chartCxt.chartStyles.dotFill = '#77777733';
	chartCxt.chartStyles.yAxisStroke = '#eee';
	chartCxt.chartStyles.xAxisStroke = 'transparent';
	chartCxt.chartStyles.showFocusDot = true;
	chartCxt.chartStyles.showHoverDot = true;

	chartCxt.chartTooltips.showTotal = false;
	chartCxt.chartTooltips.valueKey = 'value';

	dateBrushCxt.chartStyles.chartHeightClasses = 'h-[40px]';
	dateBrushCxt.chartStyles.strokeWidth = '0px';
	dateBrushCxt.chartStyles.showLineDots = true;
	dateBrushCxt.chartStyles.dotFill = '#333333';
	dateBrushCxt.chartStyles.dotStroke = 'transparent';
	dateBrushCxt.chartStyles.dotOpacity = 0.3;
	dateBrushCxt.chartStyles.dotRadius = 2.5;
	dateBrushCxt.chartOptions.setStepAfterCurve();

	return {
		chartCxt,
		dateBrushCxt
	};
}
