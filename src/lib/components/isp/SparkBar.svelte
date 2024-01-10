<script>
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand } from 'd3-scale';

	import { formatTickX, formatTickY } from './helpers';

	import Column from '$lib/components/charts/Column.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';

	import KeyHeader from './KeyHeader.svelte';

	/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */

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
			xScale={scaleBand().paddingInner(0.02).round(true)}
			y={key}
			yDomain={[0, null]}
			data={dataset}
		>
			<Svg>
				<Column fill={colour} />
				<AxisX formatTick={formatTickX} ticks={xTicks} gridlines={false} />
				<AxisY formatTick={formatTickY} ticks={2} xTick={4} />
			</Svg>
		</LayerCake>
	</div>
</div>
