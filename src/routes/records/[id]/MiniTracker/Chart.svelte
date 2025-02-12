<script>
	import { colourReducer } from '$lib/stores/theme';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import DateBrushWithContext from '$lib/components/charts/DateBrushWithContext.svelte';
	import init from './helpers/init';
	import fetchData from './helpers/fetch';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';
	import {
		periodIntervalMap,
		fuelTechGroupMap,
		chartOptionsMap,
		xTickValueFormatters
	} from './helpers/config';
	import { filterData, getDataPath } from './helpers/utils';

	let { record } = $props();
	let { chartCxt, dateBrushCxt } = init();

	chartCxt.chartStyles.chartHeightClasses = 'h-[520px]';
	dateBrushCxt.chartStyles.chartHeightClasses = 'h-[50px] mb-10';
	dateBrushCxt.chartStyles.strokeWidth = 1;

	/** @type {StatsData[]} */
	let dataset = $state.raw([]);
	/** @type {Record<string, StatsData[]>} */
	let cachedDatasets = $state({});
	/** @type {Date[] | undefined} */
	let brushedRange = $state();

	let metric = $derived(record?.metric);
	/** @type {import('./helpers/types').Period} */
	let period = $derived(record?.period);
	let fuelTechId = $derived(record?.fueltech_id);
	let chartOptions = $derived(chartOptionsMap[metric]);
	let isDemand = $derived(fuelTechId === 'demand');

	let demandDataset = $derived(
		dataset
			.filter((d) => d.id.includes('demand'))
			.map((d) => ({
				...d,
				fuel_tech: /** @type {FuelTechCode} */ ('demand')
			}))
	);
	let demandId = $derived(demandDataset[0].id);

	let processedData = $derived(
		dataset.length > 0 && fuelTechId && period
			? isDemand
				? process({
						history: demandDataset,
						unit: demandDataset[0].units,
						colourReducer: $colourReducer,
						fuelTechMap: { [demandId]: ['demand'] },
						fuelTechOrder: [demandId],
						labelReducer: () => 'Demand',
						targetInterval: periodIntervalMap[period]
					})
				: process({
						history: dataset,
						unit: dataset[0].units,
						colourReducer: $colourReducer,
						fuelTechMap: fuelTechMap[fuelTechGroupMap[fuelTechId]],
						fuelTechOrder: orderMap[fuelTechGroupMap[fuelTechId]],
						labelReducer: labelReducer[fuelTechGroupMap[fuelTechId]],
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
		if (record) {
			let cacheKey = getDataPath(record);
			if (cachedDatasets[cacheKey]) {
				console.log('get from cache', cacheKey);

				dataset = cachedDatasets[cacheKey];
			} else {
				fetchData(cacheKey).then((d) => {
					if (!d) return;
					updateCxt();
					dataset = d.filter((d) => d.type === metric);

					cachedDatasets[cacheKey] = dataset;
				});
			}
		}
	});

	$effect(() => {
		if (processedData) {
			let cxt = chartCxt;
			let ts = processedData.timeseries;
			let focusTime = record?.time;
			// filter series names that doesn't include fueltech_id
			let hiddenSeriesNames = ts.seriesNames.filter((n) => !n.includes(fuelTechId));
			let shownSeries = ts.seriesNames.find((n) => n.includes(fuelTechId));

			dateBrushCxt.seriesData = ts.data;
			dateBrushCxt.seriesNames = ts.seriesNames;
			dateBrushCxt.seriesColours = ts.seriesColours;
			dateBrushCxt.seriesLabels = ts.seriesLabels;
			dateBrushCxt.focusTime = focusTime;

			dateBrushCxt.xTicks = xTickValueFormatters[period].ticks;
			dateBrushCxt.formatTickX = xTickValueFormatters[period].formatTick;
			dateBrushCxt.formatX = xTickValueFormatters[period].format;
			dateBrushCxt.yKey = shownSeries || 'value';

			// let filteredData = filterData(ts.data, focusTime, 20);
			// brushedRange = [filteredData[0].date, filteredData[filteredData.length - 1].date];
			// cxt.xDomain = [filteredData[0].date, filteredData[filteredData.length - 1].date];

			// cxt.seriesData = filterData(ts.data, focusTime, 20);

			cxt.seriesData = ts.data;
			cxt.seriesNames = ts.seriesNames;
			cxt.seriesColours = ts.seriesColours;
			cxt.seriesLabels = ts.seriesLabels;
			cxt.focusTime = focusTime;

			cxt.xTicks = xTickValueFormatters[period].ticks;
			cxt.formatTickX = xTickValueFormatters[period].formatTick;
			cxt.formatX = xTickValueFormatters[period].format;

			cxt.hiddenSeriesNames = hiddenSeriesNames;

			if (metric === 'power') {
				cxt.chartOptions.setSmoothCurve();
			} else {
				cxt.chartOptions.setStepCurve();
			}

			cxt.chartTooltips.showTotal = false;
			cxt.chartTooltips.valueKey = shownSeries;
		}
	});

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateChartHover(hoverKey, hoverData) {
		let hoverTime = hoverData ? hoverData.time : undefined;
		chartCxt.hoverTime = hoverTime;
		chartCxt.hoverKey = hoverKey;
		dateBrushCxt.hoverTime = hoverTime;
		dateBrushCxt.hoverKey = hoverKey;
	}

	/**
	 * @param {{ data: TimeSeriesData, key?: string } | TimeSeriesData} evt
	 */
	function onmousemove(evt) {
		let key = /** @type {string | undefined} */ (evt.key);
		let data = key
			? /** @type {TimeSeriesData | undefined} */ (evt.data)
			: /** @type {TimeSeriesData | undefined} */ (evt);
		updateChartHover(key, data);
	}

	function onmouseout() {
		updateChartHover(undefined, undefined);
	}

	/**
	 * @param {Date[] | undefined} xDomain
	 */
	function onbrush(xDomain) {
		brushedRange = xDomain;

		// if the start and end of the xDomain are the same, reset and clear the xDomain
		if (xDomain && xDomain[0].getTime() === xDomain[1].getTime()) {
			chartCxt.xDomain = undefined;
			chartCxt.xTicks = xTickValueFormatters[period].ticks;
		} else {
			chartCxt.xDomain = xDomain;
			chartCxt.xTicks = xTickValueFormatters[period].ticks;
		}
	}
</script>

{#if processedData}
	<DateBrushWithContext cxtKey={dateBrushCxt.key} {brushedRange} {onbrush} />
	<LensChart cxtKey={chartCxt.key} {onmousemove} {onmouseout} />
{/if}
