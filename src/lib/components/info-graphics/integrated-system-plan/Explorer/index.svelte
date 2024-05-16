<script>
	import { getContext, setContext } from 'svelte';
	import { startOfYear } from 'date-fns';

	import { browser } from '$app/environment';
	import parser from '$lib/models/parser';

	import deepCopy from '$lib/utils/deep-copy';
	import { projectionStore, modelStore } from './store';
	import DataFilters from './DataFilters.svelte';
	import DisplayFilters from './DisplayFilters.svelte';
	import ExplorerChart from './Chart.svelte';
	import ChartTooltip from '../ChartTooltip.svelte';

	import { formatFyTickX } from '../helpers';

	export let historyData;

	let ready = false;

	// Convert historical data to TWh to match ISP
	const historicalData = deepCopy(historyData).map((/** @type {StatsData} */ d) => {
		const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
		d.history = { ...d.history, data: historyData };
		d.units = 'TWh';
		return d;
	});

	setContext('model', modelStore());
	setContext('projection-explorer', projectionStore(historicalData));

	const { projectionData, filteredModelData, timeSeriesData, historicalTimeSeriesData, yDomain } =
		getContext('projection-explorer');

	const { selectedModel, modelXTicks } = getContext('model');

	// const query = $page.url.searchParams;
	// $selectedModel = query.get('name');

	// $: console.log('projection context', $filteredModelData, $statsData, $timeSeriesData);
	// $: console.log('historical context', $historicalStatsData, $historicalTimeSeriesData);
	$: if (browser && $selectedModel) {
		fetchModels($selectedModel);
	}

	/**
	 *
	 * @param {string} model
	 */
	async function fetchModels(model) {
		const queryStrings = new URLSearchParams({ name: model });
		const models = await fetch('/api/models?' + queryStrings);
		$projectionData = parser(await models.json());
		ready = true;
	}

	// update historical date to match ISP
	$: updatedHistoricalTimeSeriesData = $historicalTimeSeriesData.data.map((d) => {
		const date = startOfYear(d.date, 1);
		return { ...d, date, time: date.getTime() };
	});
	// filter from 2010 and before 2025
	$: filteredHistoricalTimeSeriesData = updatedHistoricalTimeSeriesData.filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {string | undefined} */
	let hoverKey;

	const handleMousemove = (/** @type {*} */ e) => {
		if (e.detail?.key) {
			hoverKey = e.detail.key;
			hoverData = /** @type {TimeSeriesData} */ (e.detail.data);
		} else {
			hoverKey = undefined;
			hoverData = /** @type {TimeSeriesData} */ (e.detail);
		}
	};

	/** @type {TimeSeriesData | undefined} */
	let historicalHoverData = undefined;

	const handleHistoricalMousemove = (/** @type {*} */ e) => {
		if (e.detail?.key) {
			historicalHoverData = /** @type {TimeSeriesData} */ (e.detail.data);
		} else {
			historicalHoverData = /** @type {TimeSeriesData} */ (e.detail);
		}
	};
</script>

<div class="container max-w-none lg:container flex flex-wrap gap-2 mb-12 divide-x divide-warm-grey">
	<DataFilters />
	<DisplayFilters />
</div>

{#if ready}
	<div class="px-2">
		<ChartTooltip
			{hoverData}
			{hoverKey}
			defaultText="Energy Generation (TWh) by Financial Year"
			seriesColours={$timeSeriesData.seriesColours}
			seriesLabels={$timeSeriesData.seriesLabels}
		/>
	</div>

	<div class="grid grid-cols-12 gap-2 mt-6 mb-6 md:mb-0 relative px-2">
		<div class="col-span-12 md:col-span-2">
			<ExplorerChart
				dataset={filteredHistoricalTimeSeriesData}
				xKey="date"
				xTicks={[startOfYear(new Date('1999-01-01')), startOfYear(new Date('2024-01-01'))]}
				yKey={[0, 1]}
				yTicks={10}
				yDomain={$yDomain}
				zKey="key"
				seriesNames={$historicalTimeSeriesData.seriesNames}
				seriesColours={$historicalTimeSeriesData.seriesColours}
				formatTickX={formatFyTickX}
				hoverData={historicalHoverData}
				id="explorer-historical-chart"
				on:mousemove={handleHistoricalMousemove}
				on:mouseout={() => (historicalHoverData = undefined)}
			/>
		</div>

		<div class="col-span-12 md:col-span-10">
			{#if $filteredModelData.length}
				<ExplorerChart
					title={`Energy Generation (TWh) by Financial Year`}
					dataset={$timeSeriesData.data}
					xKey="date"
					xTicks={$modelXTicks}
					yKey={[0, 1]}
					yTicks={10}
					yDomain={$yDomain}
					zKey="key"
					seriesNames={$timeSeriesData.seriesNames}
					seriesColours={$timeSeriesData.seriesColours}
					{hoverData}
					overlay={false}
					bgClass="bg-light-warm-grey"
					id="explorer-projection-chart"
					formatTickX={formatFyTickX}
					on:mousemove={handleMousemove}
					on:mouseout={() => {
						hoverKey = undefined;
						hoverData = undefined;
					}}
				/>
			{:else}
				<p class="font-space text-3xl text-center py-12">No data available</p>
			{/if}
		</div>
	</div>
{/if}
