import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';

export default function () {
	let chartKey = Symbol('mini-tracker');

	setContext(
		chartKey,
		new ChartStore({
			key: chartKey
		})
	);

	let chartCxt = getContext(chartKey);

	chartCxt.chartStyles.chartHeightClasses = 'h-[485px]';
	chartCxt.chartStyles.chartPadding = { top: 0, right: 0, bottom: 25, left: 0 };
	chartCxt.chartTooltips.showTotal = false;
	chartCxt.chartStyles.yAxisStroke = '#999';
	chartCxt.chartStyles.xAxisStroke = 'transparent';
	chartCxt.chartStyles.xAxisFill = 'transparent';

	return {
		chartCxt
	};
}
