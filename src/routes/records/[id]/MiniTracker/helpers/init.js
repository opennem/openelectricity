import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';

export default function () {
	let trackerKey = Symbol('mini-tracker');
	let dateBrushKey = Symbol('date-brush');

	setContext(
		trackerKey,
		new ChartStore({
			key: trackerKey
		})
	);

	setContext(
		dateBrushKey,
		new ChartStore({
			key: dateBrushKey
		})
	);

	return {
		chartCxt: getContext(trackerKey),
		dateBrushCxt: getContext(dateBrushKey)
	};
}
