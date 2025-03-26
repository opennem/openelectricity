<script>
	import { colourReducer } from '$lib/stores/theme';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import init from './helpers/init';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';

	const { data } = $props();
	let { dataset, region, range, interval } = data;

	console.log('data', data);

	let { filtersCxt, chartCxts } = init(data);

	let powerData = $derived(
		dataset ? dataset.data.filter((/** @type {StatsData} */ d) => d.type === 'power') : []
	);
	let demandData = $derived(powerData.filter((/** @type {StatsData} */ d) => d.code === 'demand'));

	$inspect('powerData', powerData);
	$inspect('demandData', demandData);
	$inspect('filtersCxt', filtersCxt.selectedRegionLabel);

	filtersCxt.selectedRegion = region;
	filtersCxt.selectedRange = range;
	filtersCxt.selectedInterval = interval;

	let processedPowerEnergyData = $derived(
		powerData.length > 0
			? process({
					history: powerData,
					unit: chartCxts['power-energy-chart'].chartOptions.baseUnit,
					colourReducer: $colourReducer,
					fuelTechMap: fuelTechMap[filtersCxt.selectedFuelTechGroup],
					fuelTechOrder: orderMap[filtersCxt.selectedFuelTechGroup],
					labelReducer: labelReducer[filtersCxt.selectedFuelTechGroup],
					targetInterval: filtersCxt.selectedInterval
				})
			: null
	);

	$inspect('processedPowerEnergyData', processedPowerEnergyData);

	$effect(() => {
		if (processedPowerEnergyData) {
			updateCxt('power-energy-chart', processedPowerEnergyData.timeseries);
		}
	});

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateChartHover(hoverKey, hoverData) {
		// loop through all charts and update the hover time and key
		Object.values(chartCxts).forEach((cxt) => {
			cxt.hoverTime = hoverData ? hoverData.time : undefined;
			cxt.hoverKey = hoverKey;
		});
	}

	/**
	 * @param {number} time
	 */
	function updateChartFocus(time) {
		Object.values(chartCxts).forEach((cxt) => {
			const isSame = cxt.focusTime === time;
			cxt.focusTime = isSame ? undefined : time;
		});
	}

	/**
	 * @param {{ data: TimeSeriesData, key?: string } | TimeSeriesData} evt
	 */
	function onmousemove(evt) {
		if (!evt) return;
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
	 * @param {TimeSeriesData} evt
	 */
	function onpointerup(evt) {
		updateChartFocus(evt.time);
	}

	/**
	 * @param {string} cxtName
	 * @param {TimeSeriesInstance} ts
	 */
	function updateCxt(cxtName, ts) {
		let cxt = chartCxts[cxtName];
		cxt.seriesData = ts.data;
		cxt.seriesNames = ts.seriesNames;
		cxt.seriesColours = ts.seriesColours;
		cxt.seriesLabels = ts.seriesLabels;

		cxt.xTicks = filtersCxt.valueFormatters.ticks(ts.data);
		cxt.formatX = filtersCxt.valueFormatters.format;
		cxt.formatTickX = filtersCxt.valueFormatters.formatTick;
	}
</script>

<div>
	{#each Object.values(chartCxts) as cxt}
		<LensChart cxtKey={cxt.key} displayOptions={true} {onmousemove} {onmouseout} {onpointerup} />
	{/each}
</div>
