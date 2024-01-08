<script>
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand } from 'd3-scale';

	import { formatTickX, formatTickY } from './helpers';

	import Column from '$lib/components/charts/Column.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';

	/** @type {import('$lib/types/chart.types').TimeSeriesData[]} */
	export let dataset = [];

	/** @type {string[]} */
	export let keys = [];

	/** @type {Object.<string, string>} */
	export let labelDict = {};

	/** @type {Object.<string, string>} */
	export let colourDict = {};

	/** @type {Date[] | undefined} */
	export let xTicks = undefined;
</script>

<div class="grid grid-cols-6 gap-6">
	{#each keys as key}
		<div class="p-8 bg-light-warm-grey rounded-lg">
			<h6 class="truncate">{labelDict[key]}</h6>

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
						<Column fill={colourDict[key]} />
						<AxisX formatTick={formatTickX} ticks={xTicks} gridlines={false} />
						<AxisY formatTick={formatTickY} ticks={2} xTick={4} />
					</Svg>
				</LayerCake>
			</div>
		</div>
	{/each}
</div>
