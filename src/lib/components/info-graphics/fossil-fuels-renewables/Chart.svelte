<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal, scaleUtc } from 'd3-scale';
	import { format } from 'date-fns';

	import { isSafari } from '$lib/utils/browser-detect';
	import MultiLine from '$lib/components/charts/elements/MultiLine.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';

	import Annotations from './Annotations.svelte';

	import { formatTickX, formatTickY, formatTickYRaw, xDomain, displayXTicks } from './helpers';

	const formatHoverTickX = (/** @type {Date | number} */ d) => format(d, 'MMM yyyy');
	let isSafariBrowser = $state(true);

	/**
	 * @typedef {Object} Props
	 * @property {string} [title]
	 * @property {string} [description]
	 * @property {StatsData[]} [historicalDataset]
	 * @property {TimeSeriesData[] | []} [dataset]
	 * @property {string[]} [seriesNames]
	 * @property {Object.<string, string>} [seriesLabels]
	 * @property {Object.<string, string>} [seriesColours]
	 * @property {boolean} [skipAnimation]
	 * @property {string} [chartLabel]
	 * @property {'percentage' | 'raw'} [valueType]
	 * @property {string} [containerClass]
	 * @property {number | undefined} [externalHoverTime]
	 * @property {((time: number | undefined) => void) | undefined} [onHoverTimeChange]
	 * @property {'auto' | true | false} [annotationPlacement]
	 */

	/** @type {Props} */
	let {
		title = '',
		description = '',
		historicalDataset = [],
		dataset = [],
		seriesNames = [],
		seriesLabels = {},
		chartLabel = 'NEM 12 Month Average (%)',
		seriesColours = {},
		skipAnimation = false,
		valueType = 'percentage',
		containerClass = 'chart-container h-[350px] md:h-[650px]',
		externalHoverTime = undefined,
		onHoverTimeChange = undefined,
		annotationPlacement = 'auto'
	} = $props();

	let yTickFormatter = $derived(valueType === 'percentage' ? formatTickY : formatTickYRaw);
	let annotationUnit = $derived(valueType === 'percentage' ? '%' : 'GWh');

	/** Local hover state — used when no external hover time is supplied. */
	/** @type {TimeSeriesData | undefined} */
	let localHoverData = $state(undefined);

	/** O(1) lookup of dataset row by `time` for syncing the external hover. */
	let datasetByTime = $derived(
		new Map(dataset.map((/** @type {any} */ d) => [d.time, d]))
	);

	/** Effective hover data: external time wins when set, else local mouseover. */
	let hoverData = $derived(
		externalHoverTime != null ? datasetByTime.get(externalHoverTime) : localHoverData
	);

	let innerWidth = $state(0);

	//TODO: refactor transition
	let show = $state(false);
	let interact = $state(false);

	let md = $derived(innerWidth > 1024);
	let chartBottom = $derived(md ? 40 : 100);
	let chartLeft = $derived(md ? 0 : 0);
	let chartRight = $derived(md ? 0 : 0);

	let showBesideLatestPoint = $derived(
		annotationPlacement === 'auto' ? md : annotationPlacement
	);

	let groupedData = $derived(dataset ? groupLonger(dataset, seriesNames) : []);

	let flatData = $derived(flatten(groupedData, 'values'));
	let latestDatapoint = $derived(dataset[dataset.length - 1]);

	let chartLabelStyles = $derived(
		md
			? 'text-right text-xs text-mid-grey mr-0 z-10 pointer-events-none relative -mt-8'
			: 'absolute -top-8 text-xs text-mid-grey right-0'
	);

	let hoverTime = $derived(hoverData ? /** @type {any} */ (hoverData).time || 0 : 0);

	// Animation config based on skipAnimation prop
	let shouldAnimate = $derived(!skipAnimation && !isSafariBrowser);
	let drawDuration = $derived(
		shouldAnimate ? { duration: 4000, delay: 1000, easing: quintOut } : { duration: 1, delay: 0 }
	);
	let fadeTransition = $derived(shouldAnimate ? { delay: 3500, duration: 300 } : { duration: 300 });

	onMount(() => {
		isSafariBrowser = isSafari();

		setTimeout(() => {
			show = true;
		}, 1);
		setTimeout(
			() => {
				interact = true;
			},
			skipAnimation || isSafariBrowser ? 100 : 6000
		);
	});
</script>

<svelte:window bind:innerWidth />

{#if show && title}
	<div
		class="py-3 md:absolute md:w-6/12 md:mt-[180px] md:ml-24 md:pt-0 md:z-10 md:pointer-events-none"
	>
		<h2 class="text-3xl leading-[3.7rem] md:text-9xl md:leading-9xl md:mt-12">
			{title}
		</h2>
		<!-- <p class="hidden md:block">{@html description}</p> -->
	</div>
{/if}

<div class={containerClass}>
	<LayerCake
		padding={{ top: 20, right: chartRight, bottom: chartBottom, left: chartLeft }}
		x="date"
		y="value"
		z="group"
		{xDomain}
		yDomain={[0, null]}
		zDomain={seriesNames}
		xScale={scaleUtc()}
		zScale={scaleOrdinal()}
		zRange={Object.values(seriesColours)}
		data={groupedData}
		{flatData}
	>
		{#if chartLabel}
			<Html pointerEvents={false}>
				<div class={chartLabelStyles}>{chartLabel}</div>
			</Html>
		{/if}

		<Svg>
			<AxisX
				formatTick={formatTickX}
				ticks={displayXTicks}
				tickMarks={true}
				gridlines={true}
				snapTicks={true}
				strokeArray="3"
				stroke="#efefef"
				tickLabel={!hoverData}
				fill="transparent"
			/>
			<AxisY formatTick={yTickFormatter} ticks={5} xTick={2} />

			<MultiLine opacity={0.1} drawDurationObject={drawDuration} />

			<MultiLine {hoverData} drawDurationObject={drawDuration} />
			<HoverLayer
				{dataset}
				onmousemove={(d) => {
					const next = interact ? /** @type {TimeSeriesData} */ (d) : undefined;
					localHoverData = next;
					onHoverTimeChange?.(next ? /** @type {any} */ (next).time : undefined);
				}}
				onmouseout={() => {
					localHoverData = undefined;
					onHoverTimeChange?.(undefined);
				}}
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
				<div transition:fade={fadeTransition}>
					<Annotations
						rounded={hoverData !== undefined}
						annotation={hoverData || latestDatapoint}
						dataset={historicalDataset}
						{seriesLabels}
						{showBesideLatestPoint}
						unit={annotationUnit}
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
