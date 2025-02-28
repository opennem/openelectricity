<script>
	import { addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
	import { browser } from '$app/environment';
	import OpenElectricityClient from '@openelectricity/client';
	import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { plainDateTime } from '$lib/utils/date-parser';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import init from './helpers2/init';
	import { apiIntervalMap, chartOptions } from './helpers2/config';
	import xTickValueFormatters from './helpers2/xtick-value-formatters';

	const client = new OpenElectricityClient({
		apiKey: PUBLIC_OE_API_KEY,
		baseUrl: PUBLIC_OE_API_URL
	});

	let { record, timeZone } = $props();
	let { chartCxt } = init();

	$inspect('record', record);
	$inspect('timeZone', timeZone);
	$effect(() => {
		fetchData(record);
	});

	/**
	 * @param {Date} date
	 * @param {string} period
	 */
	function getDateRange(date, period) {
		console.log('date', date);
		console.log('period', period);

		if (period === 'day') {
			let dateStart = subDays(date, 30);
			let dateEnd = addDays(date, 30);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'month' || period === 'quarter') {
			let dateStart = subMonths(date, 6);
			let dateEnd = addMonths(date, 6);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'year') {
			let dateStart = subYears(date, 4);
			let dateEnd = addYears(date, 4);
			return { dateStart, dateEnd, withTime: false };
		}

		let dateStart = subDays(date, 2);
		let dateEnd = addDays(date, 2);
		return { dateStart, dateEnd, withTime: true };
	}

	/**
	 * @param {MilestoneRecord} record
	 */
	async function fetchData(record) {
		if (!browser || !record.date) return;
		let apiInterval = apiIntervalMap[record.period];
		let isNetworkRegion = record.network_region;
		let primaryGrouping = /** @type {import('@openelectricity/client').DataPrimaryGrouping} */ (
			isNetworkRegion ? 'network_region' : 'network'
		);

		let { dateStart, dateEnd, withTime } = getDateRange(record.date, record.period);
		let dateStartFormatted = plainDateTime(dateStart, timeZone, withTime);
		let dateEndFormatted = plainDateTime(dateEnd, timeZone, withTime);

		console.log('record', record);
		console.log('record.interval', record.interval);
		console.log('dateStartFormatted', dateStart, dateStartFormatted);
		console.log('dateEndFormatted', dateEnd, dateEndFormatted);
		console.log(record.network_id, record.metric, {
			interval: apiInterval,
			dateStart: dateStartFormatted,
			dateEnd: dateEndFormatted,
			primaryGrouping
		});

		let res;

		try {
			res = await client.getNetworkData(record.network_id, [record.metric], {
				interval: apiInterval,
				dateStart: dateStartFormatted,
				dateEnd: dateEndFormatted,
				primaryGrouping
			});
		} catch (e) {
			console.error('error', e);
		}

		if (res?.response.success) {
			let data = res.response.data;
			let results = data[0].results;
			let statsData;

			if (isNetworkRegion) {
				// get only the network_region data
				statsData = results.find((result) => result.columns.region === record.network_region);
			} else {
				statsData = results[0];
			}

			// convert statsData to a time series
			let timeSeries = statsData?.data.map((d) => {
				let date = new Date(d[0]);
				return {
					dateStr: d[0],
					date,
					time: date.getTime(),
					value: d[1]
				};
			});

			console.log('timeSeries', timeSeries);

			chartCxt.chartOptions.prefix = chartOptions[record.metric].prefix;
			chartCxt.chartOptions.displayPrefix = chartOptions[record.metric].displayPrefix;
			chartCxt.chartOptions.allowedPrefixes = chartOptions[record.metric].allowedPrefixes;
			chartCxt.chartOptions.baseUnit = chartOptions[record.metric].baseUnit;

			chartCxt.xTicks = xTickValueFormatters[record.period].ticks;
			chartCxt.formatTickX = xTickValueFormatters[record.period].formatTick;
			chartCxt.formatX = xTickValueFormatters[record.period].format;

			chartCxt.seriesData = timeSeries;
			chartCxt.seriesNames = ['value'];
			chartCxt.seriesColours = { value: fuelTechColourMap[record.fueltech_id || 'demand'] };
			chartCxt.seriesLabels = { value: record.metric };
			chartCxt.focusTime = record.time;
		} else {
			console.error('no data', res);
		}
	}
</script>

<LensChart cxtKey={chartCxt.key} displayOptions={false} />
