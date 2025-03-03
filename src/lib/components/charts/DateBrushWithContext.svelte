<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleTime } from 'd3-scale';
	import getContext from '$lib/utils/get-context.js';

	import Line from './elements/Line.svelte';
	import AxisX from './elements/AxisX.svelte';
	import LineX from './elements/annotations/LineX.svelte';
	import Dot from './elements/annotations/Dot.svelte';

	import ClipPath from './elements/defs/ClipPath.svelte';
	import ClipPathCustom from './elements/defs/ClipPathCustom.svelte';
	import Brush from './elements2/Brush.html.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {symbol} cxtKey
	 * @property {Date[] | undefined} brushedRange
	 * @property {string} [brushedLineStroke]
	 * @property {boolean} [showLineData]
	 * @property {Function} [onbrush]
	 * @property {Function} [onclear]
	 */

	/** @type {Props} */
	let {
		cxtKey,
		brushedRange,
		brushedLineStroke = '#C74523',
		showLineData = true,
		onbrush
	} = $props();

	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);

	let chartStyles = cxt.chartStyles;
	let id = chartStyles.htmlId;
	let clip = chartStyles.chartClip;
	let clipPathId = $derived(clip ? `${id}-clip-path` : '');
	let clipPathCustomId = $derived(clip ? `${id}-clip-path-custom` : '');
	let clipPath = $derived(clipPathId ? `url(#${clipPathId})` : '');
	let clipPathCustom = $derived(clipPathCustomId ? `url(#${clipPathCustomId})` : '');

	/** @type {import('./elements2/Brush.html.svelte').default | undefined} */
	let brushComponent = $state();

	$effect(() => {
		if (!brushedRange) {
			brushComponent?.clear();
		}
	});
</script>

<div class="w-full {cxt.chartStyles.chartHeightClasses} bg-light-warm-grey rounded-lg">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
		x={cxt.xKey}
		y={cxt.yKey}
		xScale={scaleTime()}
		xDomain={cxt.xDomain}
		yDomain={cxt.yDomain}
		data={cxt.seriesData}
	>
		<Html>
			<Brush bind:this={brushComponent} {onbrush} />
		</Html>

		<Svg pointerEvents={false}>
			<defs>
				<ClipPath id={clipPathId} />
				{#if brushedRange}
					<ClipPathCustom domain={brushedRange} id={clipPathCustomId} />
				{/if}
			</defs>

			<AxisX
				ticks={cxt.xTicks}
				yTick={10}
				gridlines={true}
				strokeArray="3 6"
				fill={cxt.chartStyles.xAxisFill}
				stroke={cxt.chartStyles.xAxisStroke}
				formatTick={cxt.formatTickX}
				tickMarks={false}
				snapTicks={cxt.chartStyles.snapXTicks}
				textAnchorPosition={cxt.chartStyles.xTextAnchorPosition}
			/>

			<g clip-path={clipPath}>
				{#if cxt.hoverData}
					<LineX xValue={cxt.hoverData} strokeArray="none" />
					<Dot value={cxt.hoverData} r={4} />
				{/if}
				{#if cxt.focusData}
					<LineX xValue={cxt.focusData} strokeArray="none" strokeColour="#C74523" />
					<!-- <Dot value={focusD} r={4} fill="#C74523" /> -->
				{/if}
			</g>

			{#if showLineData}
				<g clip-path={clipPath}>
					<Line stroke="#353535" {...chartStyles} />
				</g>

				{#if brushedRange}
					<g clip-path={clipPathCustom}>
						<Line {...chartStyles} strokeWidth="0" dotOpacity={0.8} />
					</g>
				{/if}
			{/if}
		</Svg>
	</LayerCake>
</div>
