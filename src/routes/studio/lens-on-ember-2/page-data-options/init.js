import { setContext, getContext } from 'svelte';
import { FiltersState, setFiltersContext, getFiltersContext } from '../states/filters.svelte';
import ChartState from '$lib/components/charts/states/chart.svelte.js';

/**
 * @param {{
 * countries?: EmberCountry[],
 * region?: string,
 * range?: string,
 * interval?: string
 * }} data
 */
export default function (data) {
	setFiltersContext(
		new FiltersState({
			countries: data.countries ?? [],
			selectedRegion: data.region ?? '',
			selectedRange: data.range ?? '',
			selectedInterval: data.interval ?? ''
		})
	);

	/** @typedef {Record<string, {
	 * key: symbol,
	 * title: string,
	 * displayPrefix: SiPrefix,
	 * allowedPrefixes: SiPrefix[],
	 * baseUnit: string,
	 * chartStyles: { chartHeightClasses: string }
	 * }>} chartCxtsMeta
	 */
	/** @type {chartCxtsMeta} */
	let chartCxtsMeta = {
		'energy-chart': {
			key: Symbol('energy-chart'),
			title: 'Energy',
			displayPrefix: 'T',
			allowedPrefixes: ['M', 'G', 'T'],
			baseUnit: 'TWh',
			chartStyles: { chartHeightClasses: 'h-[400px] md:h-[450px]' }
		},
		'emissions-chart': {
			key: Symbol('emissions-chart'),
			title: 'Emissions',
			displayPrefix: 'M',
			allowedPrefixes: ['k', 'M', 'G'],
			baseUnit: 'MtCO2e',
			chartStyles: { chartHeightClasses: 'h-[300px] md:h-[350px]' }
		}
	};
	Object.entries(chartCxtsMeta).forEach(([_, options]) => {
		setContext(options.key, new ChartState(options));
	});

	let chartCxts = Object.entries(chartCxtsMeta).reduce((acc, [name, { key }]) => {
		acc[name] = getContext(key);
		return acc;
	}, /** @type {Record<string, ChartState>} */ ({}));

	let filtersCxt = getFiltersContext();

	return {
		chartCxtsMeta,
		chartCxts,
		filtersCxt
	};
}
