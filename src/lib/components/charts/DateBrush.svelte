<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import getSeqId from '$lib/utils/html-id-gen';
	import Line from './elements/Line.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import Brush from './elements/Brush.html.svelte';

	export let store;

	const { seriesNames: yKeys, seriesData: dataset, curveType, yDomain, strokeWidth } = store;

	export let dataXDomain;
	export let xKey = 'date';

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[100px]';
	const clipPathId = `${id}-clip-path`;

	/** @type {*} */
	let brushComponent;

	$: yKey = $yKeys[0] || '';
	$: if (!dataXDomain) {
		brushComponent?.clear();
	}
</script>

<div class="w-full {defaultChartHeightClasses}">
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
			<Brush bind:this={brushComponent} on:brushed />
		</Html>
	</LayerCake>
</div>
