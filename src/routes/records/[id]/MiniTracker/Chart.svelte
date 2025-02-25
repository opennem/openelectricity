<script>
	import { formatInTimeZone } from 'date-fns-tz';

	import { colourReducer } from '$lib/stores/theme';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import DateBrushWithContext from '$lib/components/charts/DateBrushWithContext.svelte';
	import init from './helpers/init';
	import { fetchEnergyData, fetchOEData } from './helpers/fetch';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';
	import {
		periodIntervalMap,
		apiIntervalMap,
		fuelTechGroupMap,
		chartOptionsMap,
		xTickValueFormatters
	} from './helpers/config';
	import { filterData, getDataPath } from './helpers/utils';

	import OpenElectricityClient from '@openelectricity/client';
	import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
	const client = new OpenElectricityClient({
		apiKey: PUBLIC_OE_API_KEY,
		baseUrl: PUBLIC_OE_API_URL
	});

	let { record } = $props();
	/** @type {import('./helpers/types').Record} */
	let { metric, period, fueltech_id: fuelTechId, interval } = record;
	let { chartCxt, dateBrushCxt } = init();

	$inspect('record', record);

	chartCxt.chartStyles.chartHeightClasses = 'h-[520px]';
	dateBrushCxt.chartStyles.chartHeightClasses = 'h-[50px] mb-10';
	dateBrushCxt.chartStyles.strokeWidth = 1;

	/** @type {StatsData[]} */
	let dataset = $state.raw([]);
	/** @type {Record<string, StatsData[]>} */
	let cachedDatasets = $state({});
	/** @type {Date[] | undefined} */
	let brushedRange = $state();

	let chartOptions = $derived(chartOptionsMap[metric]);
	let isDemand = $derived(fuelTechId === 'demand');
	/** @type {import('@openelectricity/client').DataInterval | undefined} */
	let apiInterval = $derived(apiIntervalMap[period]);

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

	/**
	 * @param {Date} date
	 * @returns {string}
	 */
	function getNetworkDate(date) {
		let dateStr = formatInTimeZone(date, '+10:00', 'yyyy-MM-dd');
		let timeStr = formatInTimeZone(date, '+10:00', 'HH:mm:ss');
		return `${dateStr}T${timeStr}`;
	}

	$effect(() => {
		if (record) {
			// console.log('period', period, apiInterval);
			console.log('interval', interval);

			// set dateStart and dateEnd to 3 days before and after the interval
			let dateStart = new Date(interval);
			dateStart.setDate(dateStart.getDate() - 3);
			let dateEnd = new Date(interval);
			dateEnd.setDate(dateEnd.getDate() + 4);

			let dateStartStr = getNetworkDate(dateStart);
			let dateEndStr = getNetworkDate(dateEnd);

			console.log('dateStartStr', dateStartStr);
			console.log('dateEndStr', dateEndStr);

			// client
			// 	.getNetworkData('NEM', ['energy'], {
			// 		interval: '1h',
			// 		dateStart: '2024-01-01T00:00:00',
			// 		dateEnd: '2024-01-02T00:00:00',
			// 		primaryGrouping: 'network_region'
			// 	})
			// 	.then((d) => {
			// 		console.log('energy', d.data);
			// 	});

			// if (metric === 'power') {
			// 	client
			// 		.getNetworkData('NEM', ['power'], {
			// 			interval: apiInterval,
			// 			primaryGrouping: 'network',
			// 			dateStart: dateStartStr,
			// 			dateEnd: dateEndStr,
			// 			secondaryGrouping: 'fueltech_group'
			// 		})
			// 		.then((d) => {
			// 			console.log('power', d.data);
			// 		});
			// } else if (metric === 'energy') {
			// 	client
			// 		.getNetworkData('NEM', ['energy'], {
			// 			interval: apiInterval,
			// 			primaryGrouping: 'network',
			// 			secondaryGrouping: 'fueltech_group',
			// 			dateStart: dateStartStr,
			// 			dateEnd: dateEndStr
			// 		})
			// 		.then((d) => {
			// 			console.log('energy', d.data);
			// 		});
			// }

			// fetch('/api/oe')
			// 	.then((d) => {
			// 		console.log('oe', d);
			// 	})
			// 	.catch((e) => {
			// 		console.error('error', e);
			// 	});

			let cacheKey = getDataPath(record);
			if (cachedDatasets[cacheKey]) {
				console.log('get from cache', cacheKey);

				dataset = cachedDatasets[cacheKey];
			} else {
				fetchEnergyData(cacheKey).then((d) => {
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
