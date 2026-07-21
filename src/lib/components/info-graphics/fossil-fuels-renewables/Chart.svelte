<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal, scaleUtc } from 'd3-scale';
	import { format } from 'date-fns';

	import { isSafari } from '$lib/utils/browser-detect';
	import MultiLine from '$lib/components/charts/elements/MultiLine.svelte';
	import TrendLine from '$lib/components/charts/elements/TrendLine.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';

	import Annotations from './Annotations.svelte';

	import { computeTrends, buildTrendHoverRows } from './trends';
	import {
		formatTickX,
		formatTickY,
		formatTickYRaw,
		xDomain as defaultXDomain,
		displayXTicks as defaultDisplayXTicks
	} from './helpers';

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
	 * @property {boolean} [showAnnotations]
	 * @property {string} [strokeWidth]
	 * @property {number[]} [xDomain]
	 * @property {Date[]} [xTicks]
	 * @property {boolean} [showTrends] draw a dashed linear trend out to the x-domain end
	 * @property {number} [trendWindowYears] fit the trend over the trailing N years
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
		annotationPlacement = 'auto',
		showAnnotations = true,
		strokeWidth = '4px',
		xDomain = defaultXDomain,
		xTicks = defaultDisplayXTicks,
		showTrends = false,
		trendWindowYears = 10
	} = $props();

	let yTickFormatter = $derived(valueType === 'percentage' ? formatTickY : formatTickYRaw);
	let annotationUnit = $derived(valueType === 'percentage' ? '%' : 'GWh');

	/** Local hover state — used when no external hover time is supplied. */
	/** @type {TimeSeriesData | undefined} */
	let localHoverData = $state(undefined);

	/** O(1) lookup of dataset row by `time` for syncing the external hover. */
	let datasetByTime = $derived(new Map(dataset.map((/** @type {any} */ d) => [d.time, d])));

	/** Effective hover data: external time wins when set, else local mouseover. */
	let hoverData = $derived(
		externalHoverTime != null ? datasetByTime.get(externalHoverTime) : localHoverData
	);

	let innerWidth = $state(0);

	// Measured container size — LayerCake mounts only once the div has layout,
	// seeded with real dimensions so its pre-measurement box maths (default
	// height 100 minus mobile padding 120) never goes negative and logs a
	// spurious zero-height warning on late mounts. `hasLayout` is a one-way
	// latch: a zero-size blip after first mount (hidden ancestor, layout
	// transition) must re-measure, not tear down and rebuild the chart.
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let hasLayout = $state(false);

	$effect(() => {
		if (containerWidth && containerHeight) hasLayout = true;
	});

	//TODO: refactor transition
	let show = $state(false);
	let interact = $state(false);

	let md = $derived(innerWidth > 1024);
	let chartBottom = $derived(md ? 40 : 100);
	let chartLeft = $derived(md ? 0 : 0);
	let chartRight = $derived(md ? 0 : 0);

	let showBesideLatestPoint = $derived(annotationPlacement === 'auto' ? md : annotationPlacement);

	let groupedData = $derived(dataset ? groupLonger(dataset, seriesNames) : []);

	let flatData = $derived(flatten(groupedData, 'values'));
	let latestDatapoint = $derived(dataset[dataset.length - 1]);

	// Simple linear trend, anchored at each series' last point and extrapolated to
	// the right edge of the x-domain (2035) so it reads as a dashed continuation.
	let trends = $derived(
		showTrends
			? computeTrends(dataset, seriesNames, {
					toTime: xDomain[xDomain.length - 1],
					windowYears: trendWindowYears,
					clamp: valueType === 'percentage' ? [0, 100] : undefined
				})
			: []
	);

	// Grow the y-axis to fit the projected endpoints; otherwise leave it to
	// LayerCake (max = null → derived from the plotted data). The data-max scan
	// only runs when trends are shown, so the default path stays cheap.
	let yMaxOverride = $derived.by(() => {
		if (!trends.length) return null;
		const dataMax = Math.max(
			0,
			...flatData
				.map((/** @type {any} */ d) => d.value)
				.filter((/** @type {any} */ v) => v != null && Number.isFinite(v))
		);
		return Math.max(dataMax, ...trends.flatMap((t) => t.points.map((p) => p.value)));
	});

	// Synthetic monthly rows over the projected region so the hover layer can snap
	// to the trend and read out its interpolated values past the last real point.
	// Deliberately kept out of `dataset`/`groupedData`/`flatData`: these projected
	// rows must NOT feed MultiLine or the y-domain — only the hover layer reads them.
	let trendHoverRows = $derived(trends.length ? buildTrendHoverRows(trends) : []);
	let hoverDataset = $derived(trendHoverRows.length ? [...dataset, ...trendHoverRows] : dataset);
	let hoverIsTrend = $derived(!!(/** @type {any} */ (hoverData)?.isTrend));

	let chartLabelStyles = $derived(
		md
			? 'text-right text-xs text-mid-grey mr-0 z-10 pointer-events-none relative -mt-8'
			: 'absolute -top-10 text-xs text-mid-grey left-0'
	);

	let hoverTime = $derived(hoverData ? /** @type {any} */ (hoverData).time || 0 : 0);

	// Animation config based on skipAnimation prop
	let shouldAnimate = $derived(!skipAnimation && !isSafariBrowser);
	let drawDuration = $derived(
		shouldAnimate ? { duration: 4000, delay: 1000, easing: quintOut } : { duration: 1, delay: 0 }
	);
	let fadeTransition = $derived(shouldAnimate ? { delay: 3500, duration: 300 } : { duration: 300 });
	// The trend is toggled on demand (hidden Shift+T option), so it fades in
	// promptly rather than waiting on the initial line-draw sequence.
	const trendFade = { duration: 400 };

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

<div class={containerClass} bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
	{#if hasLayout}
		<LayerCake
			{containerWidth}
			{containerHeight}
			padding={{ top: 20, right: chartRight, bottom: chartBottom, left: chartLeft }}
			x="date"
			y="value"
			z="group"
			{xDomain}
			yDomain={[0, yMaxOverride]}
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
					ticks={xTicks}
					tickMarks={true}
					gridlines={true}
					snapTicks={true}
					strokeArray="3"
					stroke="#efefef"
					tickLabel={!hoverData}
					fill="transparent"
				/>
				<AxisY formatTick={yTickFormatter} ticks={5} xTick={2} />

				<MultiLine opacity={0.1} drawDurationObject={drawDuration} {strokeWidth} />

				<MultiLine {hoverData} drawDurationObject={drawDuration} {strokeWidth} />

				{#if show && trends.length}
					<TrendLine
						{trends}
						{hoverData}
						colours={seriesColours}
						{strokeWidth}
						fadeTransition={trendFade}
					/>
				{/if}
				<HoverLayer
					dataset={hoverDataset}
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
						{formatHoverTickX(hoverTime)}{#if hoverIsTrend}<span class="italic text-mid-grey"
								>&nbsp;· trend</span
							>{/if}
					</span>
				</HoverText>
				<HoverLine {hoverData} />

				{#if show && showAnnotations}
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
	{/if}
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
