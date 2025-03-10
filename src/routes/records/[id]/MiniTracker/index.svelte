<script>
	import { addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
	import { browser } from '$app/environment';
	import OpenElectricityClient from 'openelectricity';
	import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { plainDateTime } from '$lib/utils/date-parser';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import nighttimes from '$lib/utils/nighttimes';
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
			let dateStart = subDays(date, 32);
			let dateEnd = addDays(date, 32);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'month') {
			let dateStart = subMonths(date, 24);
			let dateEnd = addMonths(date, 24);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'quarter') {
			let dateStart = subMonths(date, 36);
			let dateEnd = addMonths(date, 36);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'year') {
			let dateStart = subYears(date, 10);
			let dateEnd = addYears(date, 10);
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
		let isWem = record.network_id === 'WEM';
		let isNetworkRegion = record.network_region;
		let fuelTechId = record.fueltech_id;
		let primaryGrouping = /** @type {import('openelectricity').DataPrimaryGrouping} */ (
			isNetworkRegion ? 'network_region' : 'network'
		);
		let isDemand = fuelTechId === 'demand';
		/** @type {import('openelectricity').MarketMetric} */
		let demandMetric = isIntervalPeriod ? 'demand' : 'demand_energy';
		let isFossilsOrRenewables = fuelTechId === 'fossils' || fuelTechId === 'renewables';
		let secondaryGrouping = fuelTechId
			? /** @type {import('openelectricity').DataSecondaryGrouping[]} */ (
					isFossilsOrRenewables ? ['renewable'] : ['fueltech_group']
				)
			: undefined;

		let { dateStart, dateEnd, withTime } = getDateRange(record.date, record.period);
		let dateStartFormatted = plainDateTime(dateStart, timeZone, withTime);
		let dateEndFormatted = plainDateTime(dateEnd, timeZone, withTime);

		/** @type {import('openelectricity').INetworkTimeSeriesParams} */
		let clientOptions = {
			interval: apiInterval,
			dateStart: dateStartFormatted,
			dateEnd: dateEndFormatted,
			primaryGrouping,
			secondaryGrouping
		};

		if (fuelTechId && !isFossilsOrRenewables) {
			clientOptions.fueltech_group =
				/** @type {import('openelectricity').UnitFueltechGroupType[]} */ ([fuelTechId]);
		}

		if (isNetworkRegion) {
			clientOptions.network_region = /** @type {string | undefined} */ (record.network_region);
		}

		let res;

		try {
			chartCxt.seriesData = [];
			errorMessage = '';
			isLoading = true;
			let perf = performance.now();
			res = isDemand
				? await client.getMarket(record.network_id, [demandMetric], clientOptions)
				: await client.getNetworkData(record.network_id, [record.metric], clientOptions);
			let perf2 = performance.now();
			console.log(
				`[OE client.${isDemand ? 'getMarket' : 'getNetworkData'}] data returned in`,
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
			/** @type {import('openelectricity').ITimeSeriesResult | undefined} */
			let result = results[0];

			if (fuelTechId && result) {
				if (fuelTechId === 'fossils') {
					result = results.find((d) => !d.columns.renewable);
				} else if (fuelTechId === 'renewables') {
					result = results.find((d) => d.columns.renewable);
				}
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

			chartCxt.chartOptions.prefix = chartOptions[record.metric].prefix;
			// chartCxt.chartOptions.displayPrefix = chartOptions[record.metric].displayPrefix;
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

			if (timeSeries && isIntervalPeriod) {
				chartCxt.shadingData = nighttimes(
					timeSeries[0].date,
					timeSeries[timeSeries.length - 1].date,
					isWem ? '+08:00' : '+10:00'
				);
				chartCxt.shadingFill = '#33333311';
			}

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
