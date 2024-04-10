<script>
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { formatInTimeZone } from 'date-fns-tz';

	import MultiLine from '$lib/components/charts/elements/MultiLine.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';
	import Element from '$lib/components/charts/elements/Element.svelte';

	import Annotations from './Annotations.svelte';

	import { formatTickX, formatTickY, xDomain, displayXTicks } from './helpers';

	export const formatHoverTickX = (/** @type {Date | number} */ d) =>
		formatInTimeZone(d, '+10:00', 'MMM yyyy');

	export let title = '';
	export let description = '';

	/** @type {StatsData[]} */
	export let historicalDataset = [];

	/** @type {TimeSeriesData[] | []} */
	export let dataset = [];

	/** @type {string[]} legend id */
	export let seriesNames = [];

	/** @type {Object.<string, string>} legend label */
	export let seriesLabels = {};

	/** @type {Object.<string, string>} legend colour */
	export let seriesColours = {};

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	let innerWidth = 0;

	//TODO: refactor transition
	let show = false;
	let interact = false;
	setTimeout(() => {
		show = true;
	}, 1);
	setTimeout(() => {
		interact = true;
	}, 6000);

	$: md = innerWidth > 1024;
	$: chartBottom = md ? 40 : 100;
	$: chartLeft = md ? 0 : 0;
	$: chartRight = md ? 0 : 0;

	$: groupedData = dataset ? groupLonger(dataset, seriesNames) : [];

	$: console.log('groupedData', groupedData);

	$: flatData = flatten(groupedData, 'values');
	$: latestDatapoint = dataset[dataset.length - 1];

	$: chartLabelStyles = md
		? 'text-right text-xs text-mid-grey mr-8 z-10 pointer-events-none relative'
		: 'absolute -top-8 text-xs text-mid-grey right-0';

	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
</script>

<svelte:window bind:innerWidth />

{#if show}
	<div
		class="py-6 md:absolute md:w-6/12 md:mt-[180px] md:ml-24 md:pt-0 md:z-10 md:pointer-events-none"
		transition:fly={{ delay: 50, duration: 2000, x: 0, y: -10, opacity: 0, easing: cubicOut }}
	>
		<h2 class="text-xl leading-xl font-extrabold md:font-semibold md:text-9xl md:leading-9xl">
			{title}
		</h2>
		<p>{@html description}</p>
	</div>
{/if}

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
			<div class={chartLabelStyles}>NEM 12 Month Rolling Sum (%)</div>
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
			<!-- <Element dataset={nightGuides} fill="#33333311" clipPathId="clip-path" /> -->

			<!-- <MultiLine opacity={0.05} /> -->

			<MultiLine {hoverData} />
			<HoverLayer
				{dataset}
				on:mousemove={(e) =>
					(hoverData = interact ? /** @type {TimeSeriesData} */ (e.detail) : undefined)}
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

			{#if show}
				<div transition:fade={{ delay: 3500, duration: 300 }}>
					<Annotations
						rounded={hoverData !== undefined}
						annotation={hoverData || latestDatapoint}
						dataset={historicalDataset}
						{seriesLabels}
						showBesideLatestPoint={md}
					/>
				</div>
			{/if}
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
