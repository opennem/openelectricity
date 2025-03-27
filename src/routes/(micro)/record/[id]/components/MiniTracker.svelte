<script>
	import { setContext, getContext } from 'svelte';
	import { addDays, addMonths, addYears, subDays, subMonths, subYears } from 'date-fns';

	import { browser } from '$app/environment';
	import { plainDateTime } from '$lib/utils/date-parser';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import nighttimes from '$lib/utils/nighttimes';
	import LensChart from '$lib/components/charts/LensChart.svelte';

	import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
	import { microRecordState } from '../state.svelte';

	import {
		apiIntervalMap,
		chartOptions
	} from '../../../../(main)/records/[id]/MiniTracker/helpers/config';
	import xTickValueFormatters from '../../../../(main)/records/[id]/MiniTracker/helpers/xtick-value-formatters';

	let { record, focusDateTime } = $props();
	let focusOn = $derived(focusDateTime ? new Date(focusDateTime) : undefined);
	let chartCxt = init();

	$effect(() => {
		if (record) {
			fetchData(record);
		}
	});

	$effect(() => {
		if (focusOn && chartCxt.seriesData.length > 0) {
			let findFocusData = chartCxt.seriesData.find((d) => d.time === focusOn.getTime());
			if (findFocusData) {
				console.log('findFocusData', findFocusData);
				microRecordState.focusRecord = findFocusData;
			}
		}
	});

	function init(chartHeight = 280) {
		let chartKey = Symbol('mini-tracker');

		setContext(
			chartKey,
			new ChartStore({
				key: chartKey
			})
		);

		let cxt = getContext(chartKey);

		cxt.chartTooltips.showTotal = false;
		cxt.chartStyles.chartHeightClasses = `h-[${chartHeight}px]`;
		cxt.chartStyles.chartPadding = { top: 0, right: 0, bottom: 25, left: 0 };
		cxt.chartStyles.yAxisStroke = '#999';
		cxt.chartStyles.xAxisStroke = 'transparent';
		cxt.chartStyles.xAxisFill = 'transparent';
		cxt.chartStyles.showFocusDot = true;

		return cxt;
	}

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
		console.log('fetch', record);
		if (!browser || !record.date) return;
		let apiInterval = apiIntervalMap[record.period];
		let isIntervalPeriod = record.period === 'interval';
		let isWem = record.network_id === 'WEM';
		let timeZone = isWem ? '+08:00' : '+10:00';
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

		let { dateStart, dateEnd, withTime } = getDateRange(focusOn || record.date, record.period);
		let dateStartFormatted = plainDateTime(dateStart, timeZone, withTime);
		let dateEndFormatted = plainDateTime(dateEnd, timeZone, withTime);

		let res;

		let oePath = `/api/openelectricity?dataType=${isDemand ? 'market' : 'network'}&networkId=${record.network_id}&metric=${isDemand ? demandMetric : record.metric}&interval=${apiInterval}&dateStart=${dateStartFormatted}&dateEnd=${dateEndFormatted}&primaryGrouping=${primaryGrouping}`;

		if (secondaryGroupingStr) {
			oePath += `&secondaryGrouping=${secondaryGroupingStr}`;
		}

		if (fuelTechId && !isFossilsOrRenewables) {
			oePath += `&fueltechGroup=${fuelTechId}`;
		}

		if (isNetworkRegion) {
			oePath += `&networkRegion=${record.network_region}`;
		}

		try {
			let res2 = await fetch(oePath);
			res = await res2.json();
		} catch (e) {
			console.error('error', e);
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
			chartCxt.focusTime = focusOn?.getTime() || record.time;
			chartCxt.chartTooltips.valueKey = 'value';
			// chartCxt.useFormatY = true;
			// chartCxt.formatY = () => '';
			chartCxt.chartStyles.xTextClasses = 'text-lg text-mid-warm-grey';
			chartCxt.chartStyles.xAxisYTick = 23;

			if (timeSeries && isIntervalPeriod) {
				chartCxt.shadingData = nighttimes(
					timeSeries[0].date,
					timeSeries[timeSeries.length - 1].date,
					timeZone
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
</script>

<LensChart
	cxtKey={chartCxt.key}
	displayOptions={false}
	showHeader={false}
	showTooltip={false}
	chartPaddingClasses="p-0"
/>
