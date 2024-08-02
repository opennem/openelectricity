<script>
	import { LayerCake, Svg, Html } from 'layercake';

	import getSeqId from '$lib/utils/html-id-gen';

	import Line from '$lib/components/charts/elements/Line.svelte';
	import Area from '$lib/components/charts/elements/Area.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';
	import Overlay from '$lib/components/charts/elements/Overlay.svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';
	import LineX from '$lib/components/charts/elements/annotations/LineX.svelte';

	export let key = '';
	export let colour = '#000';
	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	const id = getSeqId();
</script>

<div>
	{key} - {colour}

	<!-- <div style="height: 150px;">
		<LayerCake
			padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
			x={'date'}
			y={key}
			yDomain={[0, maxY]}
			data={dataset}
		>
			<Svg>
				{#if overlay}
					<Overlay fill="#FAF9F6" {...overlay} />
				{/if}
				<AxisX
					formatTick={hoverData ? () => '' : formatFyTickX}
					ticks={xTicks || displayXTicks}
					tickMarks={false}
					gridlines={false}
					snapTicks={true}
				/>
				<AxisY formatTick={formatTickY} tickMarks={true} ticks={[0, maxY]} />
				<Line stroke="#353535" {hoverData} strokeWidth="2px" />
				<Area fill={colour} />
				<HoverLayer {dataset} on:mousemove on:mouseout />
			</Svg>

			<Svg pointerEvents={false}>
				<defs>
					<HatchPattern id={`${id}-hatch-pattern`} stroke={overlayStroke} />
				</defs>
				{#if overlay}
					<Overlay fill="url(#{`${id}-hatch-pattern`})" {...overlay} />
				{/if}
				{#if overlayLine}
					<LineX xValue={overlayLine} />
				{/if}
			</Svg>

			<Html pointerEvents={false}>
				<HoverText {hoverData} position="bottom">
					<span class="text-[10px] block">
						{formatFyTickX(hoverTime)}
					</span>
				</HoverText>
				<HoverLine {hoverData} yTopOffset={6} lineColour={colour} />
			</Html>
		</LayerCake>
	</div> -->
</div>
