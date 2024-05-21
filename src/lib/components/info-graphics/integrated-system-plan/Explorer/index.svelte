<script>
	import { getContext, setContext, createEventDispatcher } from 'svelte';
	import { startOfYear } from 'date-fns';

	import deepCopy from '$lib/utils/deep-copy';
	import { projectionStore, modelStore } from '../store';
	import RegionFilters from './RegionFilters.svelte';
	import DataFilters from './DataFilters.svelte';
	import DisplayFilters from './DisplayFilters.svelte';
	import ExplorerChart from './Chart.svelte';
	import ChartTooltip from '../ChartTooltip.svelte';

	import { formatFyTickX, covertHistoryDataToTWh, mutateHistoryDataDates } from '../helpers';
	import { defaultPathway } from '../scenarios';

	export let historyData;
	export let modelsData;

	const dispatchEvent = createEventDispatcher();

	let ready = false;

	setContext('model', modelStore());
	setContext('projection-explorer', projectionStore());

	const { selectedModel, selectedRegion, modelXTicks } = getContext('model');

	const {
		historicalData,
		projectionData,
		filteredModelData,
		timeSeriesData,
		historicalTimeSeriesData,
		yDomain,
		pathwayOptions,
		selectedPathway
	} = getContext('projection-explorer');

	pathwayOptions.subscribe((pathways) => {
		if (pathways.length === 0) return;

		const currentSelectedFind = pathways.find((p) => p.value === $selectedPathway);
		if (currentSelectedFind) return;

		$selectedPathway = defaultPathway[$selectedModel] || pathways[0].value;
	});

	$: if (modelsData) {
		$projectionData = modelsData;
		ready = true;
	}
	$: if (historyData) {
		$historicalData = covertHistoryDataToTWh(deepCopy(historyData));
	}

	$: dispatchEvent('selected-model', $selectedModel);
	$: dispatchEvent('selected-region', $selectedRegion);

	// update historical date to match ISP
	$: updatedHistoricalTimeSeriesData = mutateHistoryDataDates($historicalTimeSeriesData.data);
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
	<RegionFilters />
</div>
<div class="container max-w-none lg:container flex flex-wrap gap-2 mb-12 divide-x divide-warm-grey">
	<DataFilters />
</div>
<div class="container max-w-none lg:container flex flex-wrap gap-2 mb-12 divide-x divide-warm-grey">
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
					overlay={{
						xStartValue: startOfYear(new Date('2030-01-01')),
						xEndValue: startOfYear(new Date('2040-01-01'))
					}}
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
