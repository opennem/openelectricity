<script>
	import { LayerCake, Svg, Html } from 'layercake';
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
		yDomain,
		strokeWidth,
		xDomain,
		formatTickX,
		hoverData,
		focusData
	} = store;

	export let dataXDomain;
	export let axisXTicks;
	export let xKey = 'date';

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[70px]';
	const clipPathId = `${id}-clip-path`;

	/** @type {*} */
	let brushComponent;

	$: yKey = $yKeys[0] || '';
	$: if (!dataXDomain) {
		brushComponent?.clear();
	}
</script>

<div class="w-full {defaultChartHeightClasses} bg-light-warm-grey">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
		x={xKey}
		y={yKey}
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
				ticks={axisXTicks}
				yTick={10}
				gridlines={true}
				strokeArray="3 6"
				stroke="#ccc"
				formatTick={$formatTickX}
				tickMarks={false}
			/>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				{#if $hoverData}
					<LineX xValue={$hoverData} strokeArray="none" />
					<Dot value={$hoverData} r={4} />
				{/if}
				{#if $focusData}
					<LineX xValue={$focusData} strokeArray="none" strokeColour="#C74523" />
					<Dot value={$focusData} r={4} fill="#C74523" />
				{/if}
			</g>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				<Line stroke="#353535" strokeWidth={$strokeWidth} strokeArray="2" curveType={$curveType} />
			</g>

			{#if dataXDomain}
				<g clip-path={clipPathId ? `url(#${clipPathId}-custom)` : ''}>
					<Line stroke="black" strokeWidth="1.5" curveType={$curveType} />
				</g>
			{/if}
		</Svg>
	</LayerCake>
</div>
