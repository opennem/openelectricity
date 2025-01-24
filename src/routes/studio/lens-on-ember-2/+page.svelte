<script>
	import { colourReducer } from '$lib/stores/theme';
	import Meta from '$lib/components/Meta.svelte';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import init from './page-data-options/init.js';
	import fetchData from './page-data-options/fetch.js';
	import process from './page-data-options/process.js';
	import Filters from './components/Filters.svelte';

	let { data } = $props();
	let { chartCxtsMeta, chartCxts, filtersCxt } = init(data);

	let fetching = $state(false);
	/** @type {StatsData[]} */
	let dataset = $state([]);
	/** @type {Record<string, StatsData[]>} */
	let cachedDataset = $state({});

	$inspect('filtersCxt.selectedRegion', filtersCxt.selectedRegion);
	$inspect('filtersCxt.selectedRange', filtersCxt.selectedRange);
	// $inspect('filtersCxt.selectedInterval', filtersCxt.selectedInterval);
	$inspect('dataset', dataset);
	$inspect('cachedDataset', cachedDataset);

	$effect(() => {
		if (filtersCxt.selectedRegion && filtersCxt.selectedRange) {
			let key = filtersCxt.selectedRegion + filtersCxt.selectedRange;
			if (cachedDataset[key]) {
				dataset = cachedDataset[key];
			} else {
				fetchData(filtersCxt.selectedRegion, filtersCxt.selectedRange).then((data) => {
					dataset = data;
					cachedDataset[key] = data;
				});
			}
		}
	});

	let energyData = $derived(dataset ? dataset.filter((d) => d.type === 'energy') : []);
	let emissionsData = $derived(dataset ? dataset.filter((d) => d.type === 'emissions') : []);
	let demandData = $derived(dataset ? dataset.filter((d) => d.type === 'demand') : []);

	let processedEnergyData = $derived(
		energyData.length > 0
			? process({
					history: energyData,
					group: filtersCxt.selectedFuelTechGroup,
					unit: chartCxtsMeta['energy-chart'].baseUnit,
					colourReducer: $colourReducer,
					calculate12MthRollingSum: filtersCxt.is12MthRollingSum,
					targetInterval: filtersCxt.isYearly ? '1Y' : filtersCxt.selectedInterval
				})
			: null
	);

	$inspect('processedEnergyData', processedEnergyData);

	$effect(() => {
		if (processedEnergyData) {
			let cxt = chartCxts['energy-chart'];
			let ts = processedEnergyData.timeseries;

			cxt.seriesData = ts.data;
			cxt.seriesNames = ts.seriesNames;
			cxt.seriesColours = ts.seriesColours;
			cxt.seriesLabels = ts.seriesLabels;
			cxt.yDomain = [ts.minY, ts.maxY];
			cxt.xTicks = filtersCxt.selectedRangeXTicks;
			cxt.formatTickX = filtersCxt.selectedRangeFormatTickX;
		}
	});

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateChartHover(hoverKey, hoverData) {
		let cxt = chartCxts['energy-chart'];
		cxt.hoverTime = hoverData ? hoverData.time : undefined;
		cxt.hoverKey = hoverKey;
	}

	/**
	 * @param {{ data: TimeSeriesData, key: string } | TimeSeriesData} evt
	 */
	function handleMousemove(evt) {
		let key = /** @type {string | undefined} */ (evt.key);
		let data = key
			? /** @type {TimeSeriesData | undefined} */ (evt.data)
			: /** @type {TimeSeriesData | undefined} */ (evt);
		updateChartHover(key, data);
	}
	function handleMouseout() {
		updateChartHover(undefined, undefined);
	}

	/**
	 * @param {{ data: TimeSeriesData }} evt
	 */
	function handlePointerup(evt) {
		console.log('pointerup', evt);
		// const focusTime = evt.detail?.time;
		// const isSame = focusTime ? $energyFocusTime === focusTime : false;
		// const time = isSame ? undefined : focusTime;

		// dataVizStoreNames.forEach(({ name }) => {
		// 	const store = dataVizStores[name];
		// 	store.focusTime.set(time);
		// });
	}
</script>

<Meta
	title="The Studio — Lens on Ember"
	description="Lens visualises energy and emissions data from regions around the world using Open Electricity's visualisation components."
	image="/img/preview.jpg"
/>

<h2>Lens on Ember 2</h2>

<section class="py-12">
	<Filters />
</section>

<main>
	<LensChart
		cxtKey={chartCxtsMeta['energy-chart'].key}
		onmousemove={handleMousemove}
		onmouseout={handleMouseout}
		onpointerup={handlePointerup}
	/>
</main>
