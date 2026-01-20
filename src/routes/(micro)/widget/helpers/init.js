import { ChartStore } from '$lib/components/charts/v2';
import { FiltersState, setFiltersContext, getFiltersContext } from '../stores/filters.svelte';

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

	// Create chart store directly (v2 pattern - no context needed)
	const chartStore = new ChartStore({
		key: Symbol('power-energy-chart'),
		title: 'Generation',
		prefix: 'M',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G'],
		baseUnit: 'W',
		timeZone: 'Australia/Sydney'
	});

	// Apply custom styles
	chartStore.chartStyles.chartHeightClasses = 'h-[230px]';
	chartStore.chartStyles.chartPadding = { top: 0, right: 0, bottom: 40, left: 0 };
	chartStore.chartStyles.xAxisFill = 'rgb(250, 249, 246)';
	chartStore.chartStyles.showLastYTick = false;

	let filtersCxt = getFiltersContext();

	return {
		chartStore,
		filtersCxt
	};
}
