<script>
	import { createEventDispatcher } from 'svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import getSeqId from '$lib/utils/html-id-gen';
	import Line from './elements/Line.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import Brush from './elements/Brush.html.svelte';

	export let store;

	const dispatch = createEventDispatcher();

	const {
		seriesNames: yKeys,
		seriesData: dataset,
		xTicks,
		yTicks,
		snapXTicks,
		formatTickX,
		hoverData,
		focusData,
		curveType,
		yDomain,
		strokeWidth
	} = store;

	export let xKey = 'date';

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[100px]';
	const clipPathId = `${id}-clip-path`;

	let brushExtents = [null, null];
	let xStart = 0;

	$: xStart = brushExtents[0] || 0;

	$: yKey = $yKeys[0] || '';
</script>

<div class="w-full {defaultChartHeightClasses}">
	<!-- xDomain={[new Date('2000-01-01').getTime(), new Date('2025-01-01').getTime()]} -->

	<LayerCake
		padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
		x={xKey}
		y={yKey}
		yDomain={$yDomain}
		data={$dataset}
	>
		<Svg>
			<defs>
				<ClipPath id={`${id}-clip-path`} />
			</defs>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				<Line stroke="#353535" strokeWidth={$strokeWidth} curveType={$curveType} />
			</g>
		</Svg>

		<Html>
			<Brush bind:min={brushExtents[0]} bind:max={brushExtents[1]} on:brushed />
		</Html>
	</LayerCake>
</div>
