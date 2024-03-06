<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format as d3Format } from 'd3-format';
	import { formatInTimeZone } from 'date-fns-tz';

	import nighttimes from '$lib/utils/nighttimes';
	import dayTicks from '$lib/utils/day-ticks';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import ClipPath from '$lib/components/charts/ClipPath.svelte';
	import Element from '$lib/components/charts/Element.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import HoverText from '$lib/components/charts/HoverText.html.svelte';

	export const formatTickX = (/** @type {number} */ d) =>
		formatInTimeZone(d, '+10:00', 'd MMM, h:mm aaa');
	export const formatDailyTickX = (/** @type {number} */ d) =>
		formatInTimeZone(d, '+10:00', 'd MMM');
	export const formatTickY = (/** @type {number} */ d) => d3Format('.0f')(d / 1000) + ' GW';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let xKey = '';

	/** @type {number[]} */
	export let yKey = [];

	export let zKey = '';

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {string[]} */
	export let seriesColours = [];

	/** @type {string[]} */
	export let seriesLabels = [];

	/** @type {TimeSeriesData | undefined} */
	let hoverData;

	/** @type {string | undefined} */
	let hoverKey;

	/** @type {*} */
	let evt;
	$: console.log(evt);

	$: stackedData = stack(dataset, seriesNames);
	$: ticks = [dataset[0][xKey], dataset[dataset.length - 1][xKey]];
	$: dailyTicks = dayTicks(dataset[0][xKey], dataset[dataset.length - 1][xKey]);
	$: maxY = Math.round(Math.max(...dataset.map((d) => d._max || 0)));
	$: hoverMax = hoverData ? hoverData._max || 0 : 0;
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
	$: hoverKeyValue =
		hoverData && hoverKey ? /** @type {number} */ (hoverData[hoverKey]) || null : null;
	$: hoverKeyColour = hoverKey ? seriesColours[seriesNames.indexOf(hoverKey)] : '';
	$: hoverKeyLabel = hoverKey ? seriesLabels[seriesNames.indexOf(hoverKey)] : '';

	const handleMousemove = (/** @type {*} */ e) => {
		hoverKey = e.detail.key;
		hoverData = /** @type {TimeSeriesData} */ (e.detail.data);
	};

	$: nightGuides = nighttimes(dataset[0].date, dataset[dataset.length - 1].date);
</script>

<div class="chart-container h-[300px] md:h-[500px]">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => d[xKey] || d.data[xKey]}
		y={yKey}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Html>
			{#if hoverData}
				<div class="flex justify-end gap-1 text-xs leading-xs whitespace-nowrap -mt-8">
					<span class="px-2 py-1 font-light">
						{formatTickX(hoverTime)}
					</span>

					<div class="bg-warm-grey px-4 py-1 flex gap-6 items-center">
						{#if hoverKeyValue !== null}
							<div class="flex items-center gap-2">
								<div class="flex items-center gap-2">
									<span class="w-2.5 h-2.5 block" style="background-color: {hoverKeyColour}" />
									{hoverKeyLabel}
								</div>

								<strong class="font-semibold">{formatTickY(hoverKeyValue)}</strong>
							</div>
						{/if}

						<span class="flex items-center gap-2">
							Total
							<strong class="font-semibold">{formatTickY(hoverMax)}</strong>
						</span>
					</div>
				</div>
			{:else}
				<div class="italic text-right text-xs text-dark-grey -mt-8">
					Last 7 days Power Generation (GW)
				</div>
			{/if}
		</Html>

		<Svg>
			<defs>
				<ClipPath id="clip-path" />
			</defs>

			<Element dataset={nightGuides} fill="#33333311" clipPathId="clip-path" />

			<HoverLayer
				{dataset}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>

			<AreaStacked
				{dataset}
				on:mousemove={handleMousemove}
				on:mouseout={() => {
					hoverKey = undefined;
					hoverData = undefined;
				}}
			/>

			<AxisX
				ticks={dailyTicks}
				stroke="#99999933"
				gridlines={true}
				formatTick={formatDailyTickX}
				tickMarks={true}
				clipPathId="clip-path"
			/>

			<AxisY
				formatTick={formatTickY}
				gridlines={true}
				stroke="#99999933"
				textFill="#00000099"
				tickMarks={true}
				ticks={[0, maxY]}
				xTick={5}
			/>
		</Svg>

		<Svg pointerEvents={false} />

		<Html pointerEvents={false}>
			<HoverText {hoverData} isShapeStack={true} />
			<HoverLine {hoverData} isShapeStack={true} />
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
