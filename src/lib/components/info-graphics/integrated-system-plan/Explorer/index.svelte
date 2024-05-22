<script>
	import { getContext, setContext, createEventDispatcher } from 'svelte';
	import { startOfYear } from 'date-fns';

	import deepCopy from '$lib/utils/deep-copy';
	import { projectionStore, modelStore } from '../store';
	import RegionFilters from './RegionFilters.svelte';
	import DataFilters from './DataFilters.svelte';
	import DisplayFilters from './DisplayFilters.svelte';
	import ExplorerChart from './Chart.svelte';
	import ExplorerTable from './Table.svelte';
	import ChartTooltip from '../ChartTooltip.svelte';

	import { formatFyTickX, covertHistoryDataToTWh, mutateHistoryDataDates } from '../helpers';
	import { defaultPathway } from '../scenarios';

	export let historyData;
	export let modelsData;

	const dispatchEvent = createEventDispatcher();

	let ready = false;

	setContext('model', modelStore());
	setContext('projection-explorer', projectionStore());

	const { selectedModel, selectedRegion, selectedDataView, selectedDataDescription } =
		getContext('model');

	const {
		historicalData,
		projectionData,
		filteredModelData,
		timeSeriesData,
		historicalTimeSeriesData,
		yDomain,
		pathwayOptions,
		selectedPathway,
		seriesItems
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

	$: if (modelsData && historyData) {
		console.log('modelsData && historyData', modelsData, historyData);
	}

	$: dispatchEvent('selected-model', $selectedModel);
	$: dispatchEvent('selected-region', $selectedRegion);
	$: dispatchEvent('selected-data-view', $selectedDataView);

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

	$: combinedSeriesNames = [
		...new Set([...$timeSeriesData.seriesNames, ...$historicalTimeSeriesData.seriesNames])
	];
	/** @type {Object.<string, string>} */
	let combinedSeriesColours = {};
	/** @type {Object.<string, string>} */
	let combinedSeriesLabels = {};
	let combinedHistoryProjectionData = [];
	let combinedData = [];
	let tableItems = [];

	$: {
		const lastHistory =
			filteredHistoricalTimeSeriesData[filteredHistoricalTimeSeriesData.length - 1];
		const firstProjection = $timeSeriesData.data[0];

		// console.log(
		// 	'check',
		// 	lastHistory?.time,
		// 	firstProjection?.time,
		// 	lastHistory?.date,
		// 	firstProjection?.date
		// );
		if (lastHistory?.time && firstProjection?.time) {
			const projectionData =
				lastHistory?.time === firstProjection?.time
					? $timeSeriesData.data.slice(1)
					: $timeSeriesData.data;

			const setLatestEmpty = (data) =>
				deepCopy(data).map((d, i) => {
					// set last item to null
					if (i === data.length - 1) {
						Object.keys(d).forEach((key) => {
							if (key !== 'date' && key !== 'time') {
								d[key] = null;
							}
						});
					}
					return { ...d, date: new Date(d.time) };
				});

			const getEmpty = (data) =>
				deepCopy(data).map((d) => {
					Object.keys(d).forEach((key) => {
						if (key !== 'date' && key !== 'time') {
							d[key] = null;
						}
					});
					return { ...d, date: new Date(d.time) };
				});

			combinedHistoryProjectionData =
				$selectedDataView === 'energy'
					? [...setLatestEmpty(filteredHistoricalTimeSeriesData), ...projectionData]
					: [...getEmpty(filteredHistoricalTimeSeriesData), ...projectionData];

			$seriesItems = [...combinedSeriesNames].reverse().map((name) => {
				return { id: name, name: name };
			});
		}
	}

	$: sortedItems = $seriesItems.map((d) => d.id).reverse();

	$: {
		let colours = {};
		sortedItems.forEach((name) => {
			colours[name] =
				$historicalTimeSeriesData.seriesColours[name] || $timeSeriesData.seriesColours[name];
		});
		combinedSeriesColours = colours;
	}

	function handleSort(e) {
		$seriesItems = e.detail;
	}

	$: {
		let colours = {};
		let labels = {};

		combinedSeriesNames.forEach((name) => {
			colours[name] =
				$historicalTimeSeriesData.seriesColours[name] || $timeSeriesData.seriesColours[name];

			labels[name] =
				$historicalTimeSeriesData.seriesLabels[name] || $timeSeriesData.seriesLabels[name];
		});

		combinedSeriesColours = colours;
		combinedSeriesLabels = labels;

		combinedData = combinedHistoryProjectionData.map((d) => {
			const obj = {
				date: d.date,
				time: d.time,
				_max: d._max,
				_min: d._min
			};

			combinedSeriesNames.forEach((name) => {
				obj[name] = d[name] || 0;
			});

			return obj;
		});
	}

	// $: console.log(
	// 	'combinedData',
	// 	$timeSeriesData.data,
	// 	combinedHistoryProjectionData,
	// 	combinedSeriesNames,
	// 	combinedSeriesColours,
	// 	combinedSeriesLabels,
	// 	Object.keys(combinedSeriesLabels).length,
	// 	Object.keys(combinedSeriesColours).length
	// );
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
	<div class="grid grid-cols-8 gap-6 px-6">
		<div class="col-span-8 md:col-span-5">
			<div class="">
				<ChartTooltip
					{hoverData}
					{hoverKey}
					defaultText={$selectedDataDescription}
					seriesColours={combinedSeriesColours}
					seriesLabels={combinedSeriesLabels}
				/>
			</div>
			{#if $filteredModelData.length}
				<ExplorerChart
					title={$selectedDataDescription}
					dataset={combinedData}
					xKey="date"
					xTicks={[
						startOfYear(new Date('2010-01-01')),
						startOfYear(new Date('2024-01-01')),
						startOfYear(new Date('2040-01-01')),
						startOfYear(new Date('2052-01-01'))
					]}
					yKey={[0, 1]}
					yTicks={10}
					yDomain={$yDomain}
					zKey="key"
					seriesNames={sortedItems}
					seriesColours={combinedSeriesColours}
					{hoverData}
					overlay={{
						xStartValue: startOfYear(new Date('2025-01-01')),
						xEndValue: startOfYear(new Date('2052-01-01'))
					}}
					blankOverlay={{
						xStartValue: startOfYear(new Date('2023-01-01')),
						xEndValue: startOfYear(new Date('2025-01-01'))
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

		<div class="col-span-8 md:col-span-3">
			<ExplorerTable
				{combinedSeriesLabels}
				{combinedSeriesColours}
				{hoverData}
				on:sort={handleSort}
			/>
		</div>
	</div>
{/if}
