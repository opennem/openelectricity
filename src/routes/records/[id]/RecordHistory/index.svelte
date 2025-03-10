<script>
	import { slide } from 'svelte/transition';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import DateBrushWithContext from '$lib/components/charts/DateBrushWithContext.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';

	import { recordState } from './stores/state.svelte';
	import MiniTracker from '../MiniTracker/index.svelte';
	import Table from './Table.svelte';
	let { chartCxt, dateBrushCxt, period, defaultXDomain, onfocus } = $props();
	/** @type {Date[] | undefined} */
	let brushedRange = $state(defaultXDomain);

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
	 * @param {number | undefined} time
	 */
	function updateChartFocus(time) {
		chartCxt.focusTime = time;
		dateBrushCxt.focusTime = time;
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
	 * @param {TimeSeriesData} evt
	 */
	function onpointerup(evt) {
		let isSame = chartCxt.focusTime === evt.time;
		updateChartFocus(isSame ? undefined : evt.time);
		onfocus(isSame ? undefined : evt.time);
		recordState.showTracker = true;
	}

	/**
	 * @param {Date[] | undefined} xDomain
	 */
	function onbrush(xDomain) {
		brushedRange = xDomain;

		if (xDomain) {
			chartCxt.xDomain = xDomain;
		} else {
			chartCxt.xDomain = defaultXDomain;
		}
	}
</script>

<div
	class="grid grid-rows-[570px] gap-6 mb-6"
	class:grid-cols-[2fr_5fr_2fr]={recordState.showTracker}
	class:grid-cols-[2fr_5fr]={!recordState.showTracker}
>
	<Table cxtKey={chartCxt.key} {brushedRange} {period} {onmousemove} {onmouseout} {onpointerup} />

	<div class="rounded-lg border border-warm-grey">
		<LensChart
			cxtKey={chartCxt.key}
			displayOptions={false}
			showHeader={false}
			{onmousemove}
			{onmouseout}
			{onpointerup}
		/>

		<div class="m-6 mt-0 bg-light-warm-grey rounded-lg">
			<DateBrushWithContext cxtKey={dateBrushCxt.key} {brushedRange} {onbrush} />
		</div>
	</div>

	{#if recordState.showTracker}
		<div class="relative" in:slide={{ axis: 'x' }}>
			<button
				class="absolute left-1 top-1 text-mid-warm-grey hover:text-dark-grey"
				onclick={() => (recordState.showTracker = false)}
			>
				<IconXMark />
			</button>

			<div class="bg-light-warm-grey rounded-lg w-full h-[508px] border border-warm-grey">
				{#if recordState.selectedMilestone}
					<MiniTracker
						record={recordState.selectedMilestone}
						timeZone={chartCxt.timeZone}
						displayPrefix={chartCxt.chartOptions.displayPrefix}
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>
