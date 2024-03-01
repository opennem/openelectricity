<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format as d3Format } from 'd3-format';
	import { formatInTimeZone } from 'date-fns-tz';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import HoverText from '$lib/components/charts/HoverText.html.svelte';

	export const formatTickX = (/** @type {Date | number} */ d) =>
		formatInTimeZone(d, '+10:00', 'd MMM, h:mm aaa');
	export const formatTickY = (/** @type {number} */ d) => d3Format('.0f')(d / 1000) + ' GW';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let xKey = '';

	/** @type {number[]} */
	export let yKey = [];

	export let zKey = '';

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {string[]} */
	export let seriesColours = [];

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {*} */
	let evt;
	$: console.log(evt);

	$: stackedData = stack(dataset, seriesNames);
	$: ticks = [dataset[0][xKey], dataset[dataset.length - 1][xKey]];
	$: maxY = Math.round(Math.max(...dataset.map((d) => d._max || 0)));
	$: hoverMax = hoverData ? hoverData._max || 0 : 0;
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => d.data[xKey]}
		y={yKey}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Html>
			{#if !hoverData}
				<div class="italic text-right text-xs text-dark-grey -mt-8">
					Last 7 days Power Generation (GW)
				</div>
			{/if}
		</Html>

		<Svg>
			<AreaStacked
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>
			<AxisX {ticks} gridlines={true} formatTick={formatTickX} tickMarks={true} snapTicks={true} />
			<AxisY
				formatTick={hoverData ? () => '' : formatTickY}
				gridlines={true}
				tickMarks={true}
				ticks={[0, maxY]}
			/>
			<HoverLayer
				{dataset}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>
		</Svg>

		<Html pointerEvents={false}>
			<HoverText {hoverData} position="top" isShapeStack={true}>
				<div class="flex gap-1 text-xs leading-xs whitespace-nowrap">
					<span class="px-2 py-1 font-light">
						{formatTickX(hoverTime)}
					</span>
					<span class="block bg-warm-grey px-2 py-1">
						Total
						<strong class="font-semibold">{formatTickY(hoverMax)}</strong>
					</span>
				</div>
			</HoverText>
			<HoverLine {hoverData} showHoverText={false} isShapeStack={true} formatValue={formatTickX} />
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 500px;
	}
</style>
