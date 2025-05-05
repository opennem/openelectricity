<script>
	import { colourReducer } from '$lib/stores/theme';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';

	import init from './helpers/init';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';
	import { goto } from '$app/navigation';

	const { data } = $props();
	let { dataset, region, range, interval } = $derived(data);
	let { filtersCxt, chartCxt } = init(data);
	let powerData = $derived(
		dataset && dataset.data
			? dataset.data.filter((/** @type {StatsData} */ d) => d.type === 'power')
			: []
	);
	// let demandData = $derived(powerData.filter((/** @type {StatsData} */ d) => d.code === 'demand'));

	$effect(() => {
		filtersCxt.selectedRegion = region;
		filtersCxt.selectedRange = range;
		filtersCxt.selectedInterval = interval;
	});

	let processedPowerEnergyData = $derived(
		powerData.length > 0
			? process({
					history: powerData,
					unit: chartCxt.chartOptions.baseUnit,
					colourReducer: $colourReducer,
					fuelTechMap: fuelTechMap[filtersCxt.selectedFuelTechGroup],
					fuelTechOrder: orderMap[filtersCxt.selectedFuelTechGroup],
					labelReducer: labelReducer[filtersCxt.selectedFuelTechGroup],
					targetInterval: filtersCxt.selectedInterval
				})
			: null
	);

	$effect(() => {
		if (processedPowerEnergyData) {
			updateCxt(processedPowerEnergyData.timeseries);
		}
	});

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateChartHover(hoverKey, hoverData) {
		chartCxt.hoverTime = hoverData ? hoverData.time : undefined;
		chartCxt.hoverKey = hoverKey;
	}

	/**
	 * @param {number} time
	 */
	function updateChartFocus(time) {
		const isSame = chartCxt.focusTime === time;
		chartCxt.focusTime = isSame ? undefined : time;
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
	 * @param {TimeSeriesInstance} ts
	 */
	function updateCxt(ts) {
		let cxt = chartCxt;

		// only show data for the last three days
		cxt.seriesData = ts.data.filter((d) => d.time > Date.now() - 3 * 24 * 60 * 60 * 1000);
		cxt.seriesNames = ts.seriesNames;
		cxt.seriesColours = ts.seriesColours;
		cxt.seriesLabels = ts.seriesLabels;

		cxt.xTicks = 3;
		cxt.formatX = filtersCxt.valueFormatters.format;
		cxt.formatTickX = filtersCxt.valueFormatters.formatTick;
	}

	/**
	 * @param {Event} evt
	 */
	function gotoRegion(evt) {
		if (evt.target) {
			goto(`/widget?region=${/** @type {HTMLSelectElement} */ (evt.target).value}`);
		}
	}
</script>

{#snippet customHeader()}
	<div class="h-[25px]"></div>
{/snippet}

{#snippet customTooltips()}
	<!-- <div class="absolute bottom-0 left-0 right-0 bg-warm-grey z-10 text-xxs py-1 px-2">
		bottom tips
	</div> -->
{/snippet}

<div class="h-[265px] w-[300px] mx-auto bg-light-warm-grey rounded-lg shadow-sm">
	<div class="h-[230px] relative z-0">
		<LensChart
			cxtKey={chartCxt.key}
			displayOptions={true}
			showHeader={false}
			showTooltip={false}
			chartPaddingClasses="p-0"
			{onmousemove}
			{onmouseout}
			{onpointerup}
			{customHeader}
			{customTooltips}
		/>
	</div>
	<div class="h-[35px] flex items-center justify-between px-2 pt-3">
		<div class="flex items-center gap-2">
			<div class="ml-2">
				<div class="text-xxs font-light text-dark-grey flex items-center gap-1">
					<span class="font-semibold">WEM</span>
					<IconChevronUpDown class="w-4 h-4" />
				</div>
			</div>
		</div>

		<div class="h-[22px] w-[22px]">
			<img
				class="rounded-full border border-white"
				alt="Open Electricitylogo"
				src="https://cdn.sanity.io/images/bjedimft/production/733425af36605bbe3df6a7b053e99f1eea24520c-512x512.png?w=50&amp;h=50"
			/>
		</div>
	</div>
</div>
