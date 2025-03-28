<script>
	import { LayerCake, Svg, flatten, stack, groupLonger } from 'layercake';
	import { scaleOrdinal, scaleTime } from 'd3-scale';
	import getContext from '$lib/utils/get-context.js';
	import StackedAreaLine from './elements2/StackedAreaLine.svelte';
	import HoverLayer from './elements2/HoverLayer.svelte';
	import AxisY from './elements/AxisY.svelte';
	import AxisX from './elements/AxisX.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import HatchPattern from './elements/defs/HatchPattern.svelte';
	import LineX from './elements/annotations/LineX.svelte';
	import Dot from './elements/annotations/Dot.svelte';
	import Shading from './elements/Element.svelte';

	/**
	/**
	 * @typedef {Object} Props
	 * @property {symbol} cxtKey
	 * @property {(evt: { data: TimeSeriesData, key: string }) => void} [onmousemove]
	 * @property {() => void} [onmouseout]
	 * @property {(evt: TimeSeriesData) => void} [onpointerup]
	 */

	/** @type {Props} */
	let { cxtKey, onmousemove, onmouseout, onpointerup } = $props();
	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);
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

<div class="w-full {chartStyles.chartHeightClasses}" style="height: {chartStyles.chartHeight}px">
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
				<ClipPath customPaddingLeft={15} customPaddingRight={15} id={clipPathAxisId} />
			</defs>

			<Shading dataset={cxt.shadingData} fill={cxt.shadingFill} {clipPathId} />

			<HoverLayer dataset={cxt.seriesScaledData} {onmousemove} {onmouseout} {onpointerup} />

			<g clip-path={clipPath}>
				<StackedAreaLine
					dataset={cxt.seriesScaledData}
					display={cxt.chartOptions.selectedChartType}
					curveType={cxt.chartOptions.curveFunction}
					seriesColours={cxt.seriesColours}
					highlightId={cxt.chartOptions.allowHoverHighlight ? cxt.hoverKey : undefined}
					{...cxt.chartStyles}
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
					<LineX
						xValue={cxt.hoverData}
						yValue={cxt.chartStyles.showHoverYLine ? cxt.hoverData : undefined}
						strokeArray="none"
					/>
					{#if cxt.chartStyles.showHoverDot}
						<Dot
							domains={cxt.visibleSeriesNames}
							value={$state.snapshot(cxt.hoverData)}
							isStacked={true}
							colour="#333333"
							r={8}
						/>
					{/if}
				{/if}

				{#if cxt.focusData}
					<LineX
						xValue={cxt.focusData}
						yValue={cxt.chartStyles.showFocusYLine ? cxt.focusData : undefined}
						strokeArray="none"
						strokeColour={cxt.chartStyles.focusYLineStrokeColour}
					/>
					{#if cxt.chartStyles.showFocusDot}
						<Dot
							domains={cxt.visibleSeriesNames}
							value={cxt.focusData}
							isStacked={true}
							colour={cxt.chartStyles.focusYLineDotColour}
							dotBorderColour={cxt.chartStyles.focusYLineDotBorderColour}
							r={cxt.chartStyles.focusYLineDotRadius}
						/>
					{/if}
				{/if}
			</g>
		</Svg>

		<Svg pointerEvents={false}>
			<!-- <defs>
				<filter id="f1" x="-30%" y="-30%" width="160%" height="160%">
					<feGaussianBlur stdDeviation="10 10" result="glow" />
					<feMerge>
						<feMergeNode in="glow" />
						<feMergeNode in="glow" />
						<feMergeNode in="glow" />
					</feMerge>
				</filter>
			</defs> -->
			<g clip-path={clipPathAxis}>
				<AxisY
					ticks={cxt.yTicks}
					xTick={5}
					formatTick={cxt.useFormatY
						? cxt.formatY
						: cxt.chartOptions.isDataTransformTypeProportion
							? (/** @type {any} */ d) => d
							: cxt.convertAndFormatValue}
					gridlines={true}
					stroke={cxt.chartStyles.yAxisStroke}
					zeroValueStroke={cxt.chartStyles.zeroValueStroke}
				/>

				<AxisX
					ticks={cxt.xTicks}
					gridlines={cxt.chartStyles.xGridlines}
					formatTick={cxt.formatTickX}
					tickMarks={true}
					snapTicks={cxt.chartStyles.snapXTicks}
					stroke={cxt.chartStyles.xAxisStroke}
					fill={cxt.chartStyles.xAxisFill}
					xTextClasses={cxt.chartStyles.xTextClasses}
					yTick={cxt.chartStyles.xAxisYTick}
				/>
			</g>
		</Svg>
	</LayerCake>
</div>
