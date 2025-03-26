<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { fuelTechColour, colourReducer } from '$lib/stores/theme';
	import { fuelTechName } from '$lib/fuel_techs.js';
	import { dataTrackerLink } from '$lib/stores/app';
	import StackedAreaLineChartWithContext from '$lib/components/charts/StackedAreaLineChartWithContext.svelte';
	import ChartTooltipWithContext from '$lib/components/charts/ChartTooltipWithContext.svelte';
	import nighttimes from '$lib/utils/nighttimes';
	import { getFormattedDate, getFormattedDateTime } from '$lib/utils/formatters';
	import init from './helpers/init';
	import process from './helpers/process';
	import { fuelTechMap, orderMap, labelReducer } from './helpers/groups';
	import legend from './helpers/legend';

	let { chartCxt } = init();
	let dataset = $state();
	let powerData = $derived(
		dataset ? dataset.filter((/** @type {StatsData} */ d) => d.type === 'power') : []
	);
	let processedPowerData = $derived(
		powerData.length > 0
			? process({
					history: powerData,
					unit: chartCxt.chartOptions.baseUnit,
					colourReducer: $colourReducer,
					fuelTechMap: fuelTechMap['simple'],
					fuelTechOrder: orderMap['simple'],
					labelReducer: labelReducer['simple'],
					targetInterval: '30m'
				})
			: null
	);
	let displayLegend = $derived(
		legend.toReversed().map((d) => ({
			key: d,
			label: fuelTechName(d),
			colour: $fuelTechColour(d)
		}))
	);

	onMount(async () => {
		try {
			let res = await fetch(`/api/tracker/7d?regionPath=au/NEM`);
			let json = await res.json();
			dataset = json.data;
		} catch (error) {
			console.error('7 day nem fetch error', error);
		}
	});

	$effect(() => {
		if (processedPowerData) {
			updateCxt(processedPowerData.timeseries);
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
		chartCxt.seriesData = ts.data;
		chartCxt.seriesNames = ts.seriesNames;
		chartCxt.seriesColours = ts.seriesColours;
		chartCxt.seriesLabels = ts.seriesLabels;

		chartCxt.yTicks = 4;
		chartCxt.customYDomain = [ts.minY, ts.maxY];
		chartCxt.maximumFractionDigits = 1;

		chartCxt.xTicks = 8;
		chartCxt.formatX = (/** @type {Date} */ d) => getFormattedDateTime(d, 'medium', 'short');
		chartCxt.formatTickX = (/** @type {Date} */ d) =>
			getFormattedDate(d, undefined, 'numeric', 'short', undefined);

		chartCxt.shadingData = nighttimes(ts.data[0].date, ts.data[ts.data.length - 1].date);
		chartCxt.shadingFill = '#33333311';

		chartCxt.chartStyles.chartHeightClasses = 'h-[300px] md:h-[500px]';
		chartCxt.chartStyles.yAxisStroke = 'transparent';

		chartCxt.chartOptions.allowHoverHighlight = false;
	}
</script>

<div class="container max-w-none lg:container">
	<header>
		<h3>National Electricity Market</h3>
	</header>
</div>

{#if processedPowerData}
	<div class="px-12" transition:fade={{ duration: 500 }}>
		<ChartTooltipWithContext
			cxtKey={chartCxt.key}
			defaultText="Last 7 days Power Generation (GW)"
		/>
	</div>

	<StackedAreaLineChartWithContext cxtKey={chartCxt.key} {onmousemove} {onmouseout} {onpointerup} />

	<div class="container max-w-none lg:container md:mt-12">
		<footer class="block md:flex justify-between items-center">
			<dl class="flex flex-wrap gap-1">
				{#each displayLegend as { colour, label }}
					<dt class="flex items-center gap-2 text-xs text-mid-grey mr-3">
						<span class="w-4 h-4 block" style="background-color: {colour}"></span>
						<span>{label}</span>
					</dt>
				{/each}
			</dl>
			<a
				href={$dataTrackerLink}
				class="mt-12 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
			>
				View tracker
			</a>
		</footer>
	</div>
{:else}
	<div
		class="container max-w-none lg:container h-[300px] md:h-[500px] rounded-xl bg-warm-grey animate-pulse"
	></div>
{/if}
