<script>
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand } from 'd3-scale';

	import { formatFyTickX, formatTickY } from '../helpers';

	import Column from '$lib/components/charts/elements/Column.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';

	import KeyHeader from '../KeyHeader.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string} [key]
	 * @property {string} [title]
	 * @property {string} [colour]
	 * @property {Date[] | undefined} [xTicks]
	 * @property {TimeSeriesData | undefined} [hoverData]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		key = '',
		title = '',
		colour = '#000',
		xTicks = undefined,
		hoverData = undefined
	} = $props();
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
				<AxisX formatTick={formatFyTickX} ticks={xTicks} gridlines={false} />
				<AxisY formatTick={formatTickY} ticks={2} xTick={4} />
			</Svg>
		</LayerCake>
	</div>
</div>
