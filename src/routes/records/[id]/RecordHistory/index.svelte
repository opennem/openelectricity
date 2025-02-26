<script>
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import DateBrushWithContext from '$lib/components/charts/DateBrushWithContext.svelte';
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
	 * @param {number} time
	 */
	function updateChartFocus(time) {
		let isSame = chartCxt.focusTime === time;
		chartCxt.focusTime = isSame ? undefined : time;
		dateBrushCxt.focusTime = isSame ? undefined : time;
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
		updateChartFocus(evt.time);
		onfocus(evt.time);
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

<div class="grid grid-cols-[2fr_5fr] grid-rows-[570px] gap-6 mb-6">
	<Table cxtKey={chartCxt.key} {brushedRange} {period} {onmousemove} {onmouseout} {onpointerup} />

	<div>
		<div class="rounded-lg border border-warm-grey">
			<LensChart
				cxtKey={chartCxt.key}
				displayOptions={false}
				showHeader={false}
				{onmousemove}
				{onmouseout}
				{onpointerup}
			/>
		</div>

		<div class="mt-6 px-6 bg-light-warm-grey border border-warm-grey rounded-lg">
			<DateBrushWithContext cxtKey={dateBrushCxt.key} {brushedRange} {onbrush} />
		</div>
	</div>
</div>
