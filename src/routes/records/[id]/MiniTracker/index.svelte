<script>
	import { addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';
	import { browser } from '$app/environment';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { plainDateTime } from '$lib/utils/date-parser';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import nighttimes from '$lib/utils/nighttimes';
	import init from './helpers/init';
	import { apiIntervalMap, chartOptions } from './helpers/config';
	import xTickValueFormatters from './helpers/xtick-value-formatters';

	let { record, timeZone, displayPrefix, chartHeight } = $props();
	let { chartCxt } = init(chartHeight);
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
			let dateStart = subDays(date, 48);
			let dateEnd = addDays(date, 16);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'month') {
			let dateStart = subMonths(date, 36);
			let dateEnd = addMonths(date, 12);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'quarter') {
			let dateStart = subMonths(date, 60);
			let dateEnd = addMonths(date, 24);
			return { dateStart, dateEnd, withTime: false };
		}

		if (period === 'year') {
			let dateStart = subYears(date, 15);
			let dateEnd = addYears(date, 5);
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
		let primaryGrouping = isNetworkRegion ? 'network_region' : 'network';
		let isDemand = fuelTechId === 'demand';
		let demandMetric = isIntervalPeriod ? 'demand' : 'demand_energy';
		let isFossilsOrRenewables = fuelTechId === 'fossils' || fuelTechId === 'renewables';
		let secondaryGroupingStr = fuelTechId
			? isFossilsOrRenewables
				? 'renewable'
				: 'fueltech_group'
			: undefined;

		let { dateStart, dateEnd, withTime } = getDateRange(record.date, record.period);
		let dateStartFormatted = plainDateTime(dateStart, timeZone, withTime);
		let dateEndFormatted = plainDateTime(dateEnd, timeZone, withTime);

		let res;

		let oePath = `/api/openelectricity?dataType=${isDemand ? 'market' : 'network'}&networkId=${record.network_id}&metric=${isDemand ? demandMetric : record.metric}&interval=${apiInterval}&dateStart=${dateStartFormatted}&dateEnd=${dateEndFormatted}&primaryGrouping=${primaryGrouping}&secondaryGrouping=${secondaryGroupingStr}`;

		if (fuelTechId && !isFossilsOrRenewables) {
			oePath += `&fueltechGroup=${fuelTechId}`;
		}

		if (isNetworkRegion) {
			oePath += `&networkRegion=${record.network_region}`;
		}

		try {
			chartCxt.seriesData = [];
			errorMessage = '';
			isLoading = true;

			let res2 = await fetch(oePath);
			res = await res2.json();

			isLoading = false;
		} catch (e) {
			console.error('error', e);
			errorMessage = 'Error fetching data. Check the console for more details.';
			isLoading = false;
		}

		if (res?.success) {
			let data = res.data;
			let results = data[0].results;
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
	<div class="text-dark-red h-[{chartHeight}px] flex items-center justify-center text-center px-4">
		{errorMessage}
	</div>
{:else if isLoading}
	<div
		class="text-dark-grey h-[{chartHeight}px] flex items-center justify-center text-center px-4 bg-warm-grey animate-pulse rounded-lg"
	>
		<!-- <LogoMark classes="w-12 h-12" /> -->
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
