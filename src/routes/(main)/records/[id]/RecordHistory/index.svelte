<script>
	import { slide } from 'svelte/transition';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import DateBrushWithContext from '$lib/components/charts/DateBrushWithContext.svelte';
	import Switch from '$lib/components/Switch.svelte';
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
		let isSame = chartCxt.focusTime === evt.time;
		updateChartFocus(isSame ? undefined : evt.time);
		onfocus(isSame ? undefined : evt.recordedDateTimeStr);
		recordState.showTracker = isSame ? false : true;
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

	let showTable = $state(false);

	// TODO: move to State
	let innerWidth = $state(0);
	let isMobile = $derived(innerWidth < 1024);

	$effect(() => {
		if (isMobile) {
			chartCxt.chartStyles.chartHeightClasses = 'h-[290px]';
			dateBrushCxt.chartStyles.chartHeightClasses = 'h-[40px]';
		} else {
			chartCxt.chartStyles.chartHeightClasses = 'h-[490px]';
			dateBrushCxt.chartStyles.chartHeightClasses = 'h-[40px]';
		}
	});

	/** @type {'table' | 'chart'} */
	let selectedDisplayView = $state('chart');
</script>

<svelte:window bind:innerWidth />

{#if isMobile}
	<div class="mb-10">
		<Switch
			buttons={[
				{
					value: 'chart',
					label: 'Chart'
				},
				{
					value: 'table',
					label: 'Table'
				}
			]}
			selected={selectedDisplayView}
			xPad={4}
			yPad={3}
			textSize="sm"
			on:change={(evt) => (selectedDisplayView = evt.detail.value)}
		/>
	</div>

	{#if selectedDisplayView === 'table'}
		<div class="h-[351px] overflow-y-auto mx-10">
			<Table
				cxtKey={chartCxt.key}
				{brushedRange}
				{period}
				{onmousemove}
				{onmouseout}
				{onpointerup}
			/>
		</div>
	{/if}

	{#if selectedDisplayView === 'chart'}
		<div style="--pad-right: 25px;">
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
	{/if}

	{#if recordState.showTracker}
		<div class="relative mx-6 mt-10 md:mt-0" in:slide={{ axis: 'y' }}>
			<button
				class="absolute left-1 top-1 text-mid-warm-grey hover:text-dark-grey"
				onclick={() => (recordState.showTracker = false)}
			>
				<IconXMark />
			</button>

			<div class="bg-light-warm-grey rounded-lg w-full h-[260px] border border-warm-grey">
				{#if recordState.selectedMilestone}
					<MiniTracker
						record={recordState.selectedMilestone}
						timeZone={chartCxt.timeZone}
						displayPrefix={chartCxt.chartOptions.displayPrefix}
						chartHeight={240}
					/>
				{/if}
			</div>
		</div>
	{/if}
{:else}
	<div
		class="grid grid-cols-1 gap-6 mb-6 grid-rows-[570px] relative z-10"
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
					<MiniTracker
						record={recordState.selectedMilestone}
						timeZone={chartCxt.timeZone}
						displayPrefix={chartCxt.chartOptions.displayPrefix}
						chartHeight={485}
					/>
				</div>
			</div>
		{/if}
	</div>
{/if}
