import { setContext, getContext } from 'svelte';
import { FiltersState, setFiltersContext, getFiltersContext } from '../stores/filters.svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
import { chartCxtsOptions, dateBrushCxtOptions } from './config';

/**
 * @param {{
 * dataset?: StatsData[],
 * region?: string,
 * range?: RangeType,
 * interval?: string
 * }} data
 */
export default function (data) {
	// Setup Filter context
	setFiltersContext(
		new FiltersState({
			selectedRegion: data.region ?? '',
			selectedRange: data.range,
			selectedInterval: data.interval ?? ''
		})
	);

	// Setup Chart context
	Object.entries(chartCxtsOptions).forEach(([_, options]) => {
		setContext(options.key, new ChartStore(options));
	});

	// // Setup Date Brush context
	// setContext(dateBrushCxtOptions.key, new ChartStore(dateBrushCxtOptions));

	let filtersCxt = getFiltersContext();

	let chartCxts = Object.entries(chartCxtsOptions).reduce((acc, [name, { key }]) => {
		acc[name] = getContext(key);
		return acc;
	}, /** @type {Record<string, ChartStore>} */ ({}));

	// let dateBrushCxt = getContext(dateBrushCxtOptions.key);

	return {
		chartCxts,
		// dateBrushCxt,
		chartCxt: chartCxts['power-energy-chart'],
		filtersCxt
	};
}
