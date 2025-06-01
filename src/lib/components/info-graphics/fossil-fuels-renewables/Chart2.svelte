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
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import Annotations from './Annotations2.svelte';

	import { formatTickY } from './helpers';

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
	 * @property {number[]} [xDomain]
	 * @property {number[] | Date[]} [displayXTicks]
	 * @property {(d: Date) => string} [formatTickX]
	 * @property {(value: string) => void} [onviewchange]
	 * @property {string} [view]
	 * @property {Object} [averageFossilAndRenewables]
	 */

	/** @type {Props} */
	let {
		title = '',
		description = '',
		historicalDataset = [],
		dataset = [],
		seriesNames = [],
		seriesLabels = {},
		seriesColours = {},
		xDomain = [],
		displayXTicks = [],
		formatTickX = (d) => format(d, 'MMM yyyy'),
		onviewchange = () => {},
		view = 'daily',
		averageFossilAndRenewables = {}
	} = $props();

	$inspect('averageFossilAndRenewables', averageFossilAndRenewables);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = $state(undefined);

	let innerWidth = $state(0);

	//TODO: refactor transition
	let show = $state(false);
	let interact = $state(false);

	let md = $derived(innerWidth > 1024);
	let chartBottom = $derived(md ? 40 : 100);
	let chartLeft = $derived(md ? 0 : 0);
	let chartRight = $derived(md ? 0 : 0);

	let groupedData = $derived(
		dataset && seriesNames && dataset.length ? groupLonger(dataset, seriesNames) : []
	);

	let flatData = $derived(flatten(groupedData, 'values'));
	let latestDatapoint = $derived(dataset[dataset.length - 1]);

	let chartLabelStyles = $derived(
		md
			? 'text-right text-xs text-mid-grey mr-0 z-10 pointer-events-none relative -mt-8'
			: 'absolute -top-8 text-xs text-mid-grey right-0'
	);

	let hoverTime = $derived(hoverData ? hoverData.time || 0 : 0);

	let titleContainterStyles = $derived(
		view === 'daily'
			? 'py-3 md:absolute md:w-7/12 lg:w-6/12 md:mt-[80px] md:ml-[280px] lg:ml-[330px] md:pt-0 md:z-10 md:pointer-events-none'
			: 'py-3 md:absolute md:w-6/12 md:mt-[180px] md:ml-24 md:pt-0 md:z-10 md:pointer-events-none'
	);
	let titleStyles = $derived(
		view === 'daily'
			? 'text-3xl leading-[3.7rem] md:text-6xl md:leading-6xl md:mt-12'
			: 'text-3xl leading-[3.7rem] md:text-9xl md:leading-9xl md:mt-12'
	);

	$inspect('historicalDataset', historicalDataset);
	$inspect('dataset', dataset);

	onMount(() => {
		isSafariBrowser = isSafari();

		setTimeout(() => {
			show = true;
		}, 1);
		setTimeout(
			() => {
				interact = true;
			},
			isSafariBrowser ? 100 : 500
		);
	});
</script>

<svelte:window bind:innerWidth />

{#if show}
	<!-- <div
		class="py-3 md:absolute md:w-8/12 md:mt-[360px] md:ml-[200px] md:pt-0 md:z-10 md:pointer-events-none"
	>
		<h2 class="text-3xl leading-[3.7rem] md:text-9xl md:leading-9xl md:mt-12">
			{title}
		</h2>
	</div> -->
{/if}

<div class={titleContainterStyles}>
	<h2 class={titleStyles}>{title}</h2>
</div>
<!-- 
<div class="py-3 md:pointer-events-none md:absolute md:right-[4rem] lg:right-[10rem] z-10">
	<h2 class="w-full md:w-2/3 text-3xl leading-[3.7rem] md:text-6xl md:leading-6xl md:mt-12">
		{title}
	</h2>
</div> -->

<div class="relative mt-0 md:mt-12">
	<div class="">
		<FormSelect
			options={[
				{ label: 'NEM last 12 months (%)', value: 'daily' },
				{ label: 'NEM 12 Month Average (%)', value: 'yearly' }
			]}
			selected={view}
			paddingX="px-7"
			paddingY="py-3"
			on:change={(evt) => onviewchange(evt.detail.value)}
		/>
	</div>

	<div class="chart-container h-[350px] md:h-[600px]">
		<LayerCake
			padding={{ top: 20, right: chartRight, bottom: chartBottom, left: chartLeft }}
			x={'date'}
			y={'value'}
			z={'group'}
			{xDomain}
			yDomain={[0, 100]}
			zDomain={seriesNames}
			xScale={scaleUtc()}
			zScale={scaleOrdinal()}
			zRange={Object.values(seriesColours)}
			data={groupedData}
			{flatData}
		>
			<!-- <Html pointerEvents={false}>
				<div class={chartLabelStyles}>NEM 12 Month Average (%)</div>
			</Html> -->

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
				<AxisY formatTick={formatTickY} ticks={5} xTick={2} />

				<MultiLine
					opacity={0.1}
					drawDurationObject={isSafariBrowser
						? { duration: 1, delay: 0 }
						: { duration: 1000, delay: 100, easing: quintOut }}
				/>

				<MultiLine
					{hoverData}
					drawDurationObject={isSafariBrowser
						? { duration: 1, delay: 0 }
						: { duration: 1000, delay: 100, easing: quintOut }}
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

				<!-- {#if show && hoverData}
					<div transition:fade={{ duration: 100 }}>
						<Annotations
							rounded={hoverData !== undefined}
							annotation={hoverData}
							dataset={historicalDataset}
							{seriesLabels}
							showBesideLatestPoint={md}
						/>
					</div>
				{/if} -->

				<div transition:fade={{ duration: 100 }}>
					<Annotations
						rounded={hoverData !== undefined}
						time={hoverData ? hoverData.date : view === 'daily' ? undefined : latestDatapoint.date}
						annotation={hoverData ||
							(view === 'daily' ? averageFossilAndRenewables : latestDatapoint)}
						dataset={historicalDataset}
						{seriesLabels}
						showBesideLatestPoint={md}
					/>
				</div>
			</Html>
		</LayerCake>
	</div>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
