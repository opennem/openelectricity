<script>
	import { LayerCake, Svg, Html } from 'layercake';

	import { formatTickX, formatTickY } from './helpers';

	import Line from '$lib/components/charts/Line.svelte';
	import Area from '$lib/components/charts/Area.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';

	import KeyHeader from './KeyHeader.svelte';

	/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	/** @type {string[]} */
	export let keys = [];

	/** @type {Object.<string, string>} */
	export let labelDict = {};

	/** @type {Object.<string, string>} */
	export let colourDict = {};

	/** @type {Date[] | undefined} */
	export let xTicks = undefined;

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;
</script>

<div class="grid grid-cols-6 gap-6">
	{#each keys as key}
		<div class="p-8 bg-light-warm-grey rounded-lg">
			<KeyHeader {key} title={labelDict[key]} data={hoverData} />

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
							formatTick={hoverData ? () => '' : formatTickX}
							ticks={xTicks}
							tickMarks={true}
							gridlines={false}
						/>
						<AxisY formatTick={formatTickY} ticks={2} />
						<Line stroke={colourDict[key]} {hoverData} />
						<Area fill={`${colourDict[key]}20`} />
					</Svg>

					<Html>
						<HoverLine
							{dataset}
							{hoverData}
							yTopOffset={6}
							lineColour={colourDict[key]}
							formatValue={formatTickX}
							on:mousemove
							on:mouseout
						/>
					</Html>
				</LayerCake>
			</div>
		</div>
	{/each}
</div>
