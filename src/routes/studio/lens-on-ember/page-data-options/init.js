import { setContext, getContext } from 'svelte';
import { FiltersState, setFiltersContext, getFiltersContext } from '../states/filters.svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
import { chartCxtsOptions, dateBrushCxtOptions } from './config';

/** @typedef {import('../states/filters.d.ts').RangeType} RangeType */

/**
 * @param {{
 * countries?: EmberCountry[],
 * region?: string,
 * range?: RangeType,
 * interval?: string
 * }} data
 */
export default function (data) {
	// Setup Filter context
	setFiltersContext(
		new FiltersState({
			countries: data.countries ?? [],
			selectedRegion: data.region ?? '',
			selectedRange: data.range,
			selectedInterval: data.interval ?? ''
		})
	);

	// Setup Chart context
	Object.entries(chartCxtsOptions).forEach(([_, options]) => {
		setContext(options.key, new ChartStore(options));
	});

	// Setup Date Brush context
	setContext(dateBrushCxtOptions.key, new ChartStore(dateBrushCxtOptions));

	let filtersCxt = getFiltersContext();

	let chartCxts = Object.entries(chartCxtsOptions).reduce((acc, [name, { key }]) => {
		acc[name] = getContext(key);
		return acc;
	}, /** @type {Record<string, ChartStore>} */ ({}));

	let dateBrushCxt = getContext(dateBrushCxtOptions.key);

	return {
		chartCxts,
		dateBrushCxt,
		filtersCxt
	};
}
