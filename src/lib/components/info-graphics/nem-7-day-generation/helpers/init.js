import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';

export default function () {
	/** @type {import('$lib/components/charts/stores/chart.svelte.js').chartCxtOptions} */
	const chartCxtOptions = {
		key: Symbol('nem-7-day-generation'),
		title: 'NEM 7 Day Generation',
		prefix: 'M',
		displayPrefix: 'G',
		allowedPrefixes: ['M', 'G'],
		baseUnit: 'W'
	};

	// Setup Chart context
	setContext(chartCxtOptions.key, new ChartStore(chartCxtOptions));

	return {
		chartCxt: getContext(chartCxtOptions.key)
	};
}
