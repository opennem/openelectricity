<script>
	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { formatInTimeZone } from 'date-fns-tz';

	import MultiLine from '$lib/components/charts/MultiLine.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import HoverLayer from '$lib/components/charts/HoverLayer.svelte';
	import HoverText from '$lib/components/charts/HoverText.html.svelte';
	import Annotations from './Annotations.svelte';

	import { formatTickX, formatTickY, xDomain, displayXTicks } from './helpers';

	export const formatHoverTickX = (/** @type {Date | number} */ d) =>
		formatInTimeZone(d, '+10:00', 'MMM yyyy');

	export let title = '';
	export let description = '';

	/** @type {StatsData[]} */
	export let historicalDataset = [];

	/** @type {TimeSeriesData[] | []} */
	export let tsData = [];

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {object} */
	export let seriesColours = {};

	/** @type {object} */
	export let seriesLabels = {};

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	let innerWidth = 0;

	$: md = innerWidth > 1024;
	$: chartBottom = md ? 40 : 100;
	$: chartLeft = md ? 0 : 0;
	$: chartRight = md ? 0 : 0;

	$: groupedData = groupLonger(tsData, seriesNames);

	$: console.log('groupedData', groupedData);
	$: flatData = flatten(groupedData, 'values');
	$: latestDatapoint = tsData[tsData.length - 1];

	$: chartLabelStyles = md
		? 'italic text-right text-xs text-dark-grey mr-8 z-10 pointer-events-none relative'
		: 'absolute -top-8 italic text-xs text-dark-grey right-0';

	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
</script>

<svelte:window bind:innerWidth />

<div
	class="py-6 md:absolute md:w-6/12 md:mt-[150px] md:ml-24 md:pt-0 md:z-10 md:pointer-events-none"
>
	<h2 class="text-xl leading-xl font-extrabold md:font-semibold md:text-9xl md:leading-9xl">
		{title}
	</h2>
	<p>{@html description}</p>
</div>

<div class="chart-container h-[350px] md:h-[650px]">
	<LayerCake
		padding={{ top: 20, right: chartRight, bottom: chartBottom, left: chartLeft }}
		x={'date'}
		y={'value'}
		z={'group'}
		{xDomain}
		yDomain={[0, null]}
		zDomain={seriesNames}
		zScale={scaleOrdinal()}
		zRange={Object.values(seriesColours)}
		data={groupedData}
		{flatData}
	>
		<Html pointerEvents={false}>
			<div class={chartLabelStyles}>NEM 12 Month Rolling Sum (Energy % of total)</div>
		</Html>

		<Svg>
			<AxisX
				formatTick={formatTickX}
				ticks={displayXTicks}
				tickMarks={true}
				gridlines={true}
				snapTicks={true}
				tickLabel={!hoverData}
			/>
			<AxisY formatTick={formatTickY} ticks={5} xTick={2} />

			<!-- <MultiLine opacity={0.05} /> -->

			<MultiLine {hoverData} />
			<HoverLayer
				dataset={tsData}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>
		</Svg>

		<Html pointerEvents={false}>
			<HoverText {hoverData} position="bottom">
				<span class="text-xs font-light">
					{formatHoverTickX(hoverTime)}
				</span>
			</HoverText>
			<HoverLine {hoverData} />

			<Annotations
				rounded={hoverData !== undefined}
				annotation={hoverData || latestDatapoint}
				dataset={historicalDataset}
				{seriesLabels}
				showBesideLatestPoint={md}
			/>
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
