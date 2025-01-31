import { setContext, getContext } from 'svelte';
import { FiltersState, setFiltersContext, getFiltersContext } from '../states/filters.svelte';
import ChartState from '$lib/components/charts/stores/chart.svelte.js';

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

	/** @typedef {Record<string, {
	 * key: symbol,
	 * title: string,
	 * prefix: SiPrefix,
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
			prefix: 'T',
			displayPrefix: 'T',
			allowedPrefixes: ['M', 'G', 'T'],
			baseUnit: 'Wh',
			chartStyles: { chartHeightClasses: 'h-[400px] md:h-[450px]' }
		},
		'emissions-chart': {
			key: Symbol('emissions-chart'),
			title: 'Emissions',
			prefix: 'M',
			displayPrefix: 'M',
			allowedPrefixes: ['k', 'M', 'G'],
			baseUnit: 'tCO2e',
			chartStyles: { chartHeightClasses: 'h-[300px] md:h-[350px]' }
		}
	};

	// Setup Chart context
	Object.entries(chartCxtsMeta).forEach(([_, options]) => {
		setContext(options.key, new ChartState(options));
	});

	let dateBrushCxtKey = Symbol('date-brush');

	// Setup Date Brush context
	setContext(
		dateBrushCxtKey,
		new ChartState({
			key: dateBrushCxtKey,
			title: 'Date Brush',
			prefix: 'M',
			displayPrefix: 'M',
			allowedPrefixes: ['M'],
			baseUnit: 'Wh'
		})
	);

	let filtersCxt = getFiltersContext();

	let chartCxts = Object.entries(chartCxtsMeta).reduce((acc, [name, { key }]) => {
		acc[name] = getContext(key);
		return acc;
	}, /** @type {Record<string, ChartState>} */ ({}));

	let dateBrushCxt = getContext(dateBrushCxtKey);

	return {
		chartCxtsMeta,
		chartCxts,
		dateBrushCxt,
		filtersCxt
	};
}
