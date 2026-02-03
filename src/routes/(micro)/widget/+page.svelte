<script>
	import { untrack } from 'svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { goto } from '$app/navigation';
	import { colourReducer } from '$lib/stores/theme';
	import { StratumChart } from '$lib/components/charts/v2';
	import IconCheckMark from '$lib/icons/CheckMark.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';

	import init from './helpers/init';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';
	import TopTips from './TopTips.svelte';
	import BottomTips from './BottomTips.svelte';

	const { data } = $props();
	let { dataset, region, range, interval } = $derived(data);
	// Initialize contexts once with initial server data (intentionally non-reactive)
	let { filtersCxt, chartStore } = untrack(() => init(data));

	let powerData = $derived(
		dataset && dataset.data
			? dataset.data.filter((/** @type {StatsData} */ d) => d.type === 'power')
			: []
	);

	$effect(() => {
		filtersCxt.selectedRegion = region;
		filtersCxt.selectedRange = range;
		filtersCxt.selectedInterval = interval;
	});

	let processedPowerEnergyData = $derived(
		powerData.length > 0
			? process({
					history: powerData,
					unit: chartStore.chartOptions.baseUnit,
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
			updateChart(processedPowerEnergyData.timeseries);
		}
	});

	/**
	 * Handle hover event from StratumChart
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		chartStore.setHover(time, key);
	}

	/** Handle hover end */
	function handleHoverEnd() {
		chartStore.clearHover();
	}

	/**
	 * Handle focus (click) event
	 * @param {number} time
	 */
	function handleFocus(time) {
		chartStore.toggleFocus(time);
	}

	/**
	 * Update chart store with processed data
	 * @param {TimeSeriesInstance} ts
	 */
	function updateChart(ts) {
		let isNem = region === 'NEM';

		// Only show data for the last three days
		chartStore.seriesData = ts.data.filter((d) => d.time > Date.now() - 3 * 24 * 60 * 60 * 1000);
		chartStore.seriesNames = ts.seriesNames;
		chartStore.seriesColours = ts.seriesColours;
		chartStore.seriesLabels = ts.seriesLabels;

		chartStore.timeZone = isNem ? 'Australia/Sydney' : 'Australia/Perth';
		chartStore.xTicks = 3;
		chartStore.formatX = filtersCxt.valueFormatters.format;
		chartStore.formatTickX = filtersCxt.valueFormatters.formatTick;
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
	<TopTips chart={chartStore} />
{/snippet}

{#snippet customFooter()}
	<div class="absolute z-10 w-full -bottom-4">
		<BottomTips chart={chartStore} />
	</div>
{/snippet}

<div class="h-[265px] bg-light-warm-grey rounded-lg shadow-xs relative overflow-hidden">
	<div class="h-[230px] relative z-0">
		<StratumChart
			chart={chartStore}
			showHeader={true}
			showTooltip={false}
			showOptions={false}
			chartPadding="p-0"
			header={customHeader}
			footer={customFooter}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
		/>
	</div>
	<div
		class="h-[35px] flex items-center justify-between px-2 pt-3 relative z-10"
		use:clickoutside
		onclickoutside={() => (dropdownOpen = false)}
	>
		{#if dropdownOpen}
			<div
				class="fixed bg-white p-1 rounded-lg shadow-xs -mt-32 text-xxs font-light text-dark-grey flex flex-col gap-2"
			>
				<button
					class="rounded-sm px-2 py-1 hover:bg-warm-grey flex justify-between items-center gap-2"
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
					class="rounded-sm px-2 py-1 hover:bg-warm-grey flex justify-between items-center gap-2"
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
