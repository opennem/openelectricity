<script>
	import { LayerCake, Svg, Html } from 'layercake';

	import { formatFyTickX, formatTickY } from './helpers';

	import Line from '$lib/components/charts/elements/Line.svelte';
	import Area from '$lib/components/charts/elements/Area.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';

	import KeyHeader from './KeyHeader.svelte';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let key = '';
	export let title = '';
	export let colour = '#000';

	/** @type {Date[] | undefined} */
	export let xTicks = undefined;

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
</script>

<div class="p-8 bg-light-warm-grey rounded-lg">
	<KeyHeader {key} {title} data={hoverData} />

	<div style="height: 150px;">
		<LayerCake
			padding={{ top: 8, right: 0, bottom: 20, left: 0 }}
			x={'date'}
			y={key}
			yDomain={[0, null]}
			data={dataset}
		>
			<Svg>
				<AxisX
					formatTick={hoverData ? () => '' : formatFyTickX}
					ticks={xTicks}
					tickMarks={true}
					gridlines={false}
				/>
				<AxisY formatTick={formatTickY} ticks={2} />
				<Line stroke={colour} {hoverData} />
				<Area fill={`${colour}20`} />
				<HoverLayer {dataset} on:mousemove on:mouseout />
			</Svg>

			<Html pointerEvents={false}>
				<HoverText {hoverData} position="bottom">
					<span class="text-[10px] font-light relative -top-[6px]">
						{formatFyTickX(hoverTime)}
					</span>
				</HoverText>
				<HoverLine {hoverData} yTopOffset={6} lineColour={colour} />
			</Html>
		</LayerCake>
	</div>
</div>
