<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleUtc } from 'd3-scale';

	import getSeqId from '$lib/utils/html-id-gen';
	import Line from './elements/Line.svelte';
	import AxisX from './elements/AxisX.svelte';
	import LineX from './elements/annotations/LineX.svelte';
	import Dot from './elements/annotations/Dot.svelte';

	import ClipPath from './elements/defs/ClipPath.svelte';
	import ClipPathCustom from './elements/defs/ClipPathCustom.svelte';
	import Brush from './elements/Brush.html.svelte';

	export let store;

	const {
		seriesNames: yKeys,
		seriesData: dataset,
		curveType,
		curveFunction,
		yDomain,
		strokeWidth,
		strokeArray,
		xDomain,
		formatTickX,
		hoverData,
		focusData,
		xTicks
	} = store;

	export let dataXDomain;
	export let axisXTicks;
	export let xKey = 'date';
	export let brushedLineStroke = '#C74523';
	export let defaultChartHeightClasses = 'h-[70px]';
	export let showLineData = true;
	export let hoverDataX;
	export let focusDataX;

	const id = getSeqId();
	const clipPathId = `${id}-clip-path`;

	/** @type {*} */
	let brushComponent;

	$: yKey = $yKeys[0] || '';
	$: if (!dataXDomain) {
		brushComponent?.clear();
	}
	$: hoverD = hoverDataX || $hoverData;
	$: focusD = focusDataX || $focusData;

	$: cType = typeof $curveType === 'function' ? $curveType : $curveFunction;
</script>

<div class="w-full {defaultChartHeightClasses} bg-light-warm-grey">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
		x={xKey}
		y={yKey}
		xScale={scaleUtc()}
		xDomain={$xDomain}
		yDomain={$yDomain}
		data={$dataset}
	>
		<Html>
			<Brush bind:this={brushComponent} on:brushed />
		</Html>

		<Svg pointerEvents={false}>
			<defs>
				<ClipPath id={clipPathId} />
				<ClipPathCustom domain={dataXDomain} id={`${clipPathId}-custom`} />
			</defs>

			<AxisX
				ticks={$xTicks}
				yTick={10}
				gridlines={true}
				strokeArray="3 6"
				stroke="#ccc"
				formatTick={$formatTickX}
				tickMarks={false}
			/>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				{#if hoverD}
					<LineX xValue={hoverD} strokeArray="none" />
					<Dot value={hoverD} r={4} />
				{/if}
				{#if focusD}
					<LineX xValue={focusD} strokeArray="none" strokeColour="#C74523" />
					<!-- <Dot value={focusD} r={4} fill="#C74523" /> -->
				{/if}
			</g>

			{#if showLineData}
				<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
					<Line
						stroke="#353535"
						strokeWidth={$strokeWidth}
						strokeArray={$strokeArray}
						curveType={cType}
					/>
				</g>

				{#if dataXDomain}
					<g clip-path={clipPathId ? `url(#${clipPathId}-custom)` : ''}>
						<Line stroke={brushedLineStroke} strokeWidth="1.5" curveType={cType} />
					</g>
				{/if}
			{/if}
		</Svg>
	</LayerCake>
</div>
