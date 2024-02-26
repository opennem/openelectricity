<script>
	import { LayerCake, Svg, Html, flatten, groupLonger } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { formatInTimeZone } from 'date-fns-tz';

	import { fuelTechColour, fossilRenewablesGroups } from '$lib/fuel_techs.js';
	import MultiLine from '$lib/components/charts/MultiLine.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import Annotations from './Annotations.svelte';

	import {
		formatTickX,
		formatTickY,
		displayXTicks,
		calculateTotalStatsData,
		getOrderedStatsData,
		groupedStatsData,
		getKeysAndRollingSumPercentDataset
	} from './helpers';

	export const formatHoverTickX = (/** @type {Date} */ d) =>
		formatInTimeZone(d, '+10:00', 'MMM yyyy');

	/** @type {StatsData[]} */
	export let data;
	export let title = '';
	export let description = '';

	/** @type {StatsData[]} */
	let historicalDataset = [];

	/** @type {TimeSeriesData[] | []} */
	let tsData = [];

	/** @type {string[]} */
	let seriesNames = [];

	/** @type {string[]} */
	let seriesColours = [];

	/** @type {StatsData} */
	let totalStatsData;

	/** @type {StatsData[]} */
	let ordered;

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	let chartHeight = 650; // pixels
	let innerWidth = 0;

	$: console.log('innerWidth', innerWidth);

	$: md = innerWidth > 1024;
	$: chartBottom = md ? 40 : 100;

	$: if (data && data.length) {
		totalStatsData = calculateTotalStatsData(data);
		ordered = getOrderedStatsData(data);
		historicalDataset = groupedStatsData(fossilRenewablesGroups, ordered);

		const { keys, rollingSumPercentageDataset } = getKeysAndRollingSumPercentDataset([
			...historicalDataset,
			totalStatsData
		]);

		seriesNames = keys;
		seriesColours = fossilRenewablesGroups.map((d) => fuelTechColour(d));
		tsData = rollingSumPercentageDataset;
	}

	$: groupedData = groupLonger(tsData, seriesNames);
	$: flatData = flatten(groupedData, 'values');
	$: latestDatapoint = tsData[tsData.length - 1];
</script>

<svelte:window bind:innerWidth />

<div class="pt-6 md:absolute md:w-6/12 md:mt-[150px] md:ml-24 md:pt-0 md:z-10">
	<h2 class="text-3xl leading-3xl font-semibold md:text-9xl md:leading-9xl">{title}</h2>
	<p>{@html description}</p>
</div>

<div class="chart-container h-[350px] md:h-[650px]">
	<LayerCake
		padding={{ top: 20, right: 15, bottom: chartBottom, left: 45 }}
		x={'date'}
		y={'value'}
		z={'group'}
		xDomain={[new Date(2000, 0, 1).getTime(), new Date(2030, 11, 31).getTime()]}
		yDomain={[0, null]}
		zDomain={seriesNames}
		zScale={scaleOrdinal()}
		zRange={seriesColours}
		data={groupedData}
		{flatData}
	>
		<Html>
			<div class="italic text-right text-xs text-dark-grey mr-8">
				NEM 12 Month Rolling Sum (Energy % of total)
			</div>
		</Html>

		<Svg>
			<AxisX
				formatTick={formatTickX}
				ticks={displayXTicks}
				tickMarks={false}
				gridlines={true}
				snapTicks={true}
				tickLabel={!Boolean(hoverData)}
			/>
			<AxisY formatTick={formatTickY} ticks={5} />

			<MultiLine opacity={0.1} />
			<MultiLine {hoverData} />
		</Svg>

		<Html>
			<HoverLine
				dataset={tsData}
				formatValue={formatHoverTickX}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>

			<Annotations
				rounded={hoverData !== undefined}
				annotation={hoverData || latestDatapoint}
				dataset={historicalDataset}
				showBesideLatestPoint={md}
			/>
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
