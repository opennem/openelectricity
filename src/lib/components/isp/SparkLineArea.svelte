<script>
	import { LayerCake, Svg, Html } from 'layercake';

	import { formatFyTickX, formatTickY } from './helpers';

	import Line from '$lib/components/charts/Line.svelte';
	import Area from '$lib/components/charts/Area.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';

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
			</Svg>

			<Html>
				<HoverLine
					{dataset}
					{hoverData}
					yTopOffset={6}
					lineColour={colour}
					formatValue={formatFyTickX}
					on:mousemove
					on:mouseout
				/>
			</Html>
		</LayerCake>
	</div>
</div>
