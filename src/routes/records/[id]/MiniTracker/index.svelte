<script>
	import { addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
	import { browser } from '$app/environment';
	import OpenElectricityClient from 'openelectricity';
	import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { plainDateTime } from '$lib/utils/date-parser';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import init from './helpers/init';
	import { apiIntervalMap, chartOptions } from './helpers/config';
	import xTickValueFormatters from './helpers/xtick-value-formatters';
	import LogoMark from '$lib/images/logo-mark.svelte';
	const client = new OpenElectricityClient({
		apiKey: PUBLIC_OE_API_KEY,
		baseUrl: PUBLIC_OE_API_URL
	});

	let { record, timeZone, displayPrefix } = $props();
	let { chartCxt } = init();
	let errorMessage = $state('');
	let isLoading = $state(false);

	$effect(() => {
		$inspect('record', record);
		fetchData(record);
	});

	$effect(() => {
		chartCxt.chartOptions.displayPrefix = displayPrefix;
	});

	/**
	 * @param {Date} date
	 * @param {string} period
	 */
	function getDateRange(date, period) {
		if (period === 'day') {
			let dateStart = subDays(date, 30);
			let dateEnd = addDays(date, 30);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'month') {
			let dateStart = subMonths(date, 6);
			let dateEnd = addMonths(date, 6);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'quarter') {
			let dateStart = subMonths(date, 18);
			let dateEnd = addMonths(date, 18);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'year') {
			let dateStart = subYears(date, 4);
			let dateEnd = addYears(date, 4);
			return { dateStart, dateEnd, withTime: false };
		}

		let dateStart = subDays(date, 5);
		let dateEnd = addDays(date, 2);
		return { dateStart, dateEnd, withTime: true };
	}

	/**
	 * @param {MilestoneRecord} record
	 */
	async function fetchData(record) {
		if (!browser || !record.date) return;
		let apiInterval = apiIntervalMap[record.period];
		let isIntervalPeriod = record.period === 'interval';
		let isNetworkRegion = record.network_region;
		let fuelTechId = record.fueltech_id;
		let primaryGrouping = /** @type {import('openelectricity').DataPrimaryGrouping} */ (
			isNetworkRegion ? 'network_region' : 'network'
		);
		console.log('fuelTechId', fuelTechId);
		let isDemand = fuelTechId === 'demand';
		let isFossilsOrRenewables = fuelTechId === 'fossils' || fuelTechId === 'renewables';
		let secondaryGrouping = fuelTechId
			? /** @type {import('openelectricity').DataSecondaryGrouping[]} */ (
					isFossilsOrRenewables ? ['renewable'] : ['fueltech_group']
				)
			: undefined;

		let { dateStart, dateEnd, withTime } = getDateRange(record.date, record.period);
		let dateStartFormatted = plainDateTime(dateStart, timeZone, withTime);
		let dateEndFormatted = plainDateTime(dateEnd, timeZone, withTime);

		let clientOptions = {
			interval: apiInterval,
			dateStart: dateStartFormatted,
			dateEnd: dateEndFormatted,
			primaryGrouping,
			secondaryGrouping
		};

		console.log('record', record);
		console.log('record.interval', record.interval);
		console.log('dateStartFormatted', dateStart, dateStartFormatted);
		console.log('dateEndFormatted', dateEnd, dateEndFormatted);
		console.log(record.network_id, record.metric, clientOptions);

		let res;

		try {
			chartCxt.seriesData = [];
			errorMessage = '';
			isLoading = true;
			let perf = performance.now();
			res = isDemand
				? await client.getMarket(record.network_id, ['demand'], clientOptions)
				: await client.getNetworkData(record.network_id, [record.metric], clientOptions);
			let perf2 = performance.now();
			console.log(
				'[OE client.getNetworkData] data returned in ',
				((perf2 - perf) / 1000).toFixed(2),
				'seconds'
			);
			isLoading = false;
		} catch (e) {
			console.error('error', e);
			errorMessage = 'Error fetching data. Check the console for more details.';
			isLoading = false;
		}

		if (res?.response.success) {
			let data = res.response.data;
			let results = data[0].results;
			let result;

			console.log('data', data);

			if (isNetworkRegion) {
				// get only the network_region data
				result = results.filter((d) => d.columns.region === record.network_region);
			} else {
				result = results;
			}

			if (fuelTechId && result) {
				if (fuelTechId === 'fossils') {
					result = result.find((d) => !d.columns.renewable);
				} else if (fuelTechId === 'renewables') {
					result = result.find((d) => d.columns.renewable);
				} else {
					result = result.find((d) => d.columns.fueltech_group === fuelTechId);
				}
			} else {
				result = result[0];
			}

			// convert result to a time series
			let timeSeries = result?.data.map((d) => {
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
			chartCxt.seriesLabels = { value: '' };
			chartCxt.focusTime = record.time;
			chartCxt.chartTooltips.valueKey = 'value';

			if (isIntervalPeriod) {
				chartCxt.chartOptions.setSmoothCurve();
			} else {
				chartCxt.chartOptions.setStepCurve();
			}
		} else {
			console.error('no data', res);
		}
	}

	/**
	 * @param {{ data: TimeSeriesData, key?: string } | TimeSeriesData} evt
	 */
	function onmousemove(evt) {
		let key = /** @type {string | undefined} */ (evt.key);
		let data = key
			? /** @type {TimeSeriesData | undefined} */ (evt.data)
			: /** @type {TimeSeriesData | undefined} */ (evt);
		let hoverTime = data ? data.time : undefined;
		chartCxt.hoverTime = hoverTime;
		chartCxt.hoverKey = key;
	}

	function onmouseout() {
		chartCxt.hoverTime = undefined;
		chartCxt.hoverKey = undefined;
	}
</script>

{#if errorMessage}
	<div class="text-dark-red h-[485px] flex items-center justify-center text-center px-4">
		{errorMessage}
	</div>
{:else if isLoading}
	<div
		class="text-dark-grey h-[485px] flex items-center justify-center text-center px-4 bg-warm-grey animate-pulse rounded-lg"
	>
		<LogoMark classes="w-12 h-12" />
	</div>
{:else}
	<LensChart
		cxtKey={chartCxt.key}
		displayOptions={false}
		showHeader={false}
		tooltipWrapperStyles="border-b border-warm-grey"
		{onmousemove}
		{onmouseout}
	/>
{/if}
