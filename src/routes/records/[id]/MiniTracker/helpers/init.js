import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';

export default function (chartHeight = 485) {
	let chartKey = Symbol('mini-tracker');

	setContext(
		chartKey,
		new ChartStore({
			key: chartKey
		})
	);

	let chartCxt = getContext(chartKey);

	chartCxt.chartTooltips.showTotal = false;
	chartCxt.chartStyles.chartHeightClasses = `h-[${chartHeight}px]`;
	chartCxt.chartStyles.chartPadding = { top: 0, right: 0, bottom: 25, left: 0 };
	chartCxt.chartStyles.yAxisStroke = '#999';
	chartCxt.chartStyles.xAxisStroke = 'transparent';
	chartCxt.chartStyles.xAxisFill = 'transparent';
	chartCxt.chartStyles.showFocusDot = true;

	return {
		chartCxt
	};
}
