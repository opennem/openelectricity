<script>
	import { run } from 'svelte/legacy';

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

	/**
	 * @typedef {Object} Props
	 * @property {any} store
	 * @property {any} dataXDomain
	 * @property {string} [xKey]
	 * @property {string} [brushedLineStroke]
	 * @property {string} [defaultChartHeightClasses]
	 * @property {boolean} [showLineData]
	 * @property {any} hoverDataX
	 * @property {any} focusDataX
	 * @property {any[]} [useDataset]
	 */

	/** @type {Props} */
	let {
		store,
		dataXDomain,
		xKey = 'date',
		brushedLineStroke = '#C74523',
		defaultChartHeightClasses = 'h-[70px]',
		showLineData = true,
		hoverDataX,
		focusDataX,
		useDataset = []
	} = $props();

	const id = getSeqId();
	const clipPathId = `${id}-clip-path`;

	const {
		seriesNames: yKeys,
		seriesData,
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

	/** @type {*} */
	let brushComponent = $state();

	let yKey = $derived($yKeys[0] || '');
	run(() => {
		if (!dataXDomain) {
			brushComponent?.clear();
		}
	});
	let hoverD = $derived(hoverDataX || $hoverData);
	let focusD = $derived(focusDataX || $focusData);
	let dataset = $derived(useDataset || $seriesData);
	let cType = $derived(typeof $curveType === 'function' ? $curveType : $curveFunction);
</script>

<div class="w-full {defaultChartHeightClasses} bg-light-warm-grey">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
		x={xKey}
		y={yKey}
		xScale={scaleUtc()}
		xDomain={$xDomain}
		yDomain={$yDomain}
		data={dataset}
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
