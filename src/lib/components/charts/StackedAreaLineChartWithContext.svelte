<script>
	import { LayerCake, Svg, flatten, stack, groupLonger } from 'layercake';
	import { scaleOrdinal, scaleTime } from 'd3-scale';
	import checkAndGetContext from '$lib/utils/check-and-get-context.js';
	import StackedAreaLine from './elements2/StackedAreaLine.svelte';
	import HoverLayer from './elements2/HoverLayer.svelte';
	import AxisY from './elements/AxisY.svelte';
	import AxisX from './elements/AxisX.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import HatchPattern from './elements/defs/HatchPattern.svelte';
	import LineX from './elements/annotations/LineX.svelte';
	import Dot from './elements/annotations/Dot.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {symbol} cxtKey
	 * @property {(evt: { data: TimeSeriesData, key: string }) => void} onmousemove
	 * @property {() => void} onmouseout
	 * @property {(evt: TimeSeriesData) => void} onpointerup
	 */

	/** @type {Props} */
	let { cxtKey, onmousemove, onmouseout, onpointerup } = $props();
	/** @type {import('$lib/components/charts/states/chart.svelte.js').default} */
	let cxt = checkAndGetContext(cxtKey);
	let chartStyles = cxt.chartStyles;
	let id = chartStyles.htmlId;
	let clip = chartStyles.chartClip;
	let stackedData = $derived(
		cxt.seriesScaledData.length > 0 ? stack(cxt.seriesScaledData, cxt.visibleSeriesNames) : []
	);
	let groupedData = $derived(
		cxt.seriesScaledData.length > 0 ? groupLonger(cxt.seriesScaledData, cxt.visibleSeriesNames) : []
	);
	let chartData = $derived(cxt.chartOptions.isChartTypeArea ? stackedData : groupedData);
	let flatData = $derived(
		cxt.chartOptions.isChartTypeArea ? flatten(stackedData) : flatten(groupedData, 'values')
	);
	let clipPathId = $derived(clip ? `${id}-clip-path` : '');
	let clipPathAxisId = $derived(clip ? `${id}-clip-path-axis` : '');
	let clipPath = $derived(clipPathId ? `url(#${clipPathId})` : '');
	let clipPathAxis = $derived(clipPathAxisId ? `url(#${clipPathAxisId})` : '');
</script>

<div class="w-full {chartStyles.chartHeightClasses}">
	<LayerCake
		padding={chartStyles.chartPadding}
		x={cxt.x}
		y={cxt.y}
		z={cxt.z}
		yDomain={cxt.yDomain}
		xDomain={cxt.xDomain}
		zDomain={cxt.seriesNames}
		xScale={scaleTime()}
		zScale={scaleOrdinal()}
		zRange={cxt.visibleSeriesColours}
		data={chartData}
		{flatData}
	>
		<Svg>
			<defs>
				<ClipPath id={clipPathId} />
			</defs>

			<HoverLayer dataset={cxt.seriesScaledData} {onmousemove} {onmouseout} {onpointerup} />

			<g clip-path={clipPath}>
				<StackedAreaLine
					dataset={cxt.seriesScaledData}
					display={cxt.chartOptions.selectedChartType}
					curveType={cxt.chartOptions.curveFunction}
					seriesColours={cxt.seriesColours}
					highlightId={cxt.hoverKey}
					{onmousemove}
					{onmouseout}
					{onpointerup}
				/>
			</g>
		</Svg>

		<Svg pointerEvents={false}>
			<defs>
				<ClipPath id={clipPathId} />
			</defs>

			<g clip-path={clipPath}>
				{#if cxt.hoverData}
					<LineX xValue={cxt.hoverData} strokeArray="none" />
				{/if}

				{#if cxt.focusData}
					<LineX xValue={cxt.focusData} strokeArray="none" strokeColour="#C74523" />
					<!-- <Dot
						domains={cxt.seriesNames}
						value={$state.snapshot(cxt.focusData)}
						isStacked={true}
						colour="#C74523"
					/> -->
				{/if}
			</g>
		</Svg>

		<Svg pointerEvents={false}>
			<defs>
				<ClipPath customPaddingLeft={15} customPaddingRight={15} id={clipPathAxisId} />
			</defs>

			<g clip-path={clipPathAxis}>
				<AxisY
					ticks={cxt.yTicks}
					xTick={5}
					formatTick={cxt.chartOptions.isDataTransformTypeProportion
						? (/** @type {any} */ d) => d
						: cxt.convertAndFormatValue}
					gridlines={true}
					stroke={cxt.chartStyles.yAxisStroke}
				/>

				<AxisX
					ticks={cxt.xTicks}
					gridlines={cxt.chartStyles.xGridlines}
					formatTick={cxt.formatTickX}
					tickMarks={true}
					snapTicks={cxt.chartStyles.snapXTicks}
					stroke={cxt.chartStyles.xAxisStroke}
				/>
			</g>
		</Svg>
	</LayerCake>
</div>
