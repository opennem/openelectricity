<script>
	import { getContext, setContext } from 'svelte';
	import { colourReducer } from '$lib/stores/theme';
	import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import fetchData from '../page-data-options/tracker/fetch';
	import process from '../page-data-options/tracker/process';
	import {
		chartOptionsMap,
		periodIntervalMap,
		fuelTechGroupMap
	} from '../page-data-options/tracker/maps';

	let { focusData } = getContext('record-history-data-viz');
	let trackerKey = Symbol('mini-tracker');
	setContext(
		trackerKey,
		new ChartStore({
			key: trackerKey
		})
	);
	let chartCxt = getContext(trackerKey);

	let metric = $derived($focusData?.metric);
	/** @type {import('../page-data-options/tracker/types.d.ts').Period} */
	let period = $derived($focusData?.period);
	let fuelTechId = $derived($focusData?.fueltech_id);
	let chartOptions = $derived(chartOptionsMap[metric]);
	/** @type {StatsData[]} */
	let dataset = $state.raw([]);
	let processedData = $derived(
		dataset.length > 0 && $focusData
			? process({
					history: dataset,
					group: fuelTechGroupMap[fuelTechId],
					unit: dataset[0].units,
					colourReducer: $colourReducer,
					targetInterval: periodIntervalMap[period]
				})
			: null
	);

	function updateCxt() {
		if (!chartOptions) return;
		let options = chartCxt.chartOptions;

		chartCxt.title = chartOptions.title;
		options.prefix = chartOptions.prefix;
		options.displayPrefix = chartOptions.displayPrefix;
		options.allowedPrefixes = chartOptions.allowedPrefixes;
		options.baseUnit = chartOptions.baseUnit;
	}

	$effect(() => {
		if ($focusData) {
			fetchData($focusData).then((d) => {
				if (!d) return;
				updateCxt();
				dataset = d.filter((d) => d.type === metric);
			});
		}
	});

	$effect(() => {
		if (processedData) {
			let cxt = chartCxt;
			let ts = processedData.timeseries;

			cxt.seriesData = ts.data;
			cxt.seriesNames = ts.seriesNames;
			cxt.seriesColours = ts.seriesColours;
			cxt.seriesLabels = ts.seriesLabels;

			// cxt.xTicks = filtersCxt.selectedRangeXTicks;
			// cxt.formatTickX = filtersCxt.selectedRangeFormatTickX;
			// cxt.formatX = filtersCxt.selectedRangeFormatX;
		}
	});
</script>

{#if chartCxt && processedData}
	<LensChart cxtKey={chartCxt.key} />
{/if}
