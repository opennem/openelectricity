<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { formatInTimeZone } from 'date-fns-tz';

	import { isSafari } from '$lib/utils/browser-detect';
	import MultiLine from '$lib/components/charts/elements/MultiLine.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';
	import Element from '$lib/components/charts/elements/Element.svelte';

	import Annotations from './Annotations.svelte';

	import { formatTickX, formatTickY, xDomain, displayXTicks } from './helpers';

	const formatHoverTickX = (/** @type {Date | number} */ d) =>
		formatInTimeZone(d, '+10:00', 'MMM yyyy');
	let isSafariBrowser = true;

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

	$: md = innerWidth > 1024;
	$: chartBottom = md ? 40 : 100;
	$: chartLeft = md ? 0 : 0;
	$: chartRight = md ? 0 : 0;

	$: groupedData = dataset ? groupLonger(dataset, seriesNames) : [];

	// $: console.log('groupedData', groupedData);

	$: flatData = flatten(groupedData, 'values');
	$: latestDatapoint = dataset[dataset.length - 1];

	$: chartLabelStyles = md
		? 'text-right text-xs text-mid-grey mr-8 z-10 pointer-events-none relative -mt-8'
		: 'absolute -top-8 text-xs text-mid-grey right-0';

	$: hoverTime = hoverData ? hoverData.time || 0 : 0;

	onMount(() => {
		isSafariBrowser = isSafari();

		setTimeout(() => {
			show = true;
		}, 1);
		setTimeout(
			() => {
				interact = true;
			},
			isSafariBrowser ? 100 : 6000
		);
	});
</script>

<svelte:window bind:innerWidth />

{#if show}
	<div
		class="py-3 md:absolute md:w-6/12 md:mt-[180px] md:ml-24 md:pt-0 md:z-10 md:pointer-events-none"
	>
		<h2 class="text-3xl leading-[3.7rem] md:text-9xl md:leading-9xl md:mt-12">
			{title}
		</h2>
		<!-- <p class="hidden md:block">{@html description}</p> -->
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

			<MultiLine
				{hoverData}
				drawDurationObject={isSafariBrowser
					? { duration: 1, delay: 0 }
					: { duration: 4000, delay: 1000, easing: quintOut }}
			/>
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
				<div transition:fade={isSafariBrowser ? { duration: 300 } : { delay: 3500, duration: 300 }}>
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
