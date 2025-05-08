<script>
	import { clickoutside } from '@svelte-put/clickoutside';
	import { goto } from '$app/navigation';
	import { colourReducer } from '$lib/stores/theme';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';

	import init from './helpers/init';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';
	import TopTips from './TopTips.svelte';
	import BottomTips from './BottomTips.svelte';
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

		let isNem = region === 'NEM';

		// only show data for the last three days
		cxt.seriesData = ts.data.filter((d) => d.time > Date.now() - 3 * 24 * 60 * 60 * 1000);
		cxt.seriesNames = ts.seriesNames;
		cxt.seriesColours = ts.seriesColours;
		cxt.seriesLabels = ts.seriesLabels;

		cxt.timeZone = isNem ? '+10:00' : '+08:00';
		cxt.xTicks = 3;
		cxt.formatX = filtersCxt.valueFormatters.format;
		cxt.formatTickX = filtersCxt.valueFormatters.formatTick;
	}

	/**
	 * @param {string} region
	 */
	function gotoRegion(region) {
		dropdownOpen = false;
		goto(`/widget?region=${region}`);
	}

	let dropdownOpen = $state(false);
	function showDropdown() {
		dropdownOpen = !dropdownOpen;
	}
</script>

{#snippet customHeader()}
	<TopTips cxtKey={chartCxt.key} />
{/snippet}

{#snippet customTooltips()}
	<div class="absolute z-10 w-full -bottom-4">
		<BottomTips cxtKey={chartCxt.key} />
	</div>
{/snippet}

<div
	class="h-[265px] w-[300px] mx-auto bg-light-warm-grey rounded-lg shadow-sm relative overflow-hidden"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="h-[230px] relative z-0">
		<LensChart
			cxtKey={chartCxt.key}
			displayOptions={true}
			showHeader={false}
			showTooltip={false}
			chartPaddingClasses="p-0"
			{onmousemove}
			{onmouseout}
			{customHeader}
			{customTooltips}
		/>
	</div>
	<div
		class="h-[35px] flex items-center justify-between px-2 pt-3 relative z-10"
		use:clickoutside
		onclickoutside={() => (dropdownOpen = false)}
	>
		{#if dropdownOpen}
			<div
				class="fixed bg-white p-1 rounded-lg shadow-sm -mt-32 text-xxs font-light text-dark-grey flex flex-col gap-2"
			>
				<button
					class="rounded px-2 py-1 hover:bg-warm-grey flex justify-between items-center gap-2"
					onclick={() => gotoRegion('NEM')}
				>
					NEM
					{#if filtersCxt.selectedRegion === 'NEM'}
						<span>
							<IconCheckMark class="w-4 h-4" />
						</span>
					{/if}
				</button>
				<button
					class="rounded px-2 py-1 hover:bg-warm-grey flex justify-between items-center gap-2"
					onclick={() => gotoRegion('WEM')}
				>
					WEM
					{#if filtersCxt.selectedRegion === 'WEM'}
						<span>
							<IconCheckMark class="w-4 h-4" />
						</span>
					{/if}
				</button>
			</div>
		{/if}

		<button
			class="text-xxs font-light text-dark-grey flex items-center gap-1 hover:bg-warm-grey rounded-lg px-2 py-1"
			onclick={showDropdown}
		>
			<span class="font-semibold">{filtersCxt.selectedRegion}</span>
			<IconChevronUpDown class="w-4 h-4" />
		</button>

		<div class="h-[22px] w-[22px]">
			<a href="https://explore.openelectricity.org.au" title="Open Electricity" target="_blank">
				<img
					class="rounded-full border border-white"
					alt="Open Electricity"
					src="https://cdn.sanity.io/images/bjedimft/production/733425af36605bbe3df6a7b053e99f1eea24520c-512x512.png?w=50&amp;h=50"
				/>
			</a>
		</div>
	</div>
</div>
