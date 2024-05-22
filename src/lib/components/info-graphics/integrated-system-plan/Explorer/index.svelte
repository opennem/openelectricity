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

	import {
		formatFyTickX,
		formatValue,
		covertHistoryDataToTWh,
		mutateHistoryDataDates
	} from '../helpers';
	import { defaultPathway } from '../scenarios';
	import { reverse } from 'd3-array';

	export let historyData;
	export let modelsData;

	const dispatchEvent = createEventDispatcher();

	let ready = false;

	setContext('model', modelStore());
	setContext('projection-explorer', projectionStore());

	const {
		selectedModel,
		selectedRegion,
		selectedDataView,
		selectedDataDescription,
		selectedDataLabel
	} = getContext('model');

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
		}
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
					seriesNames={combinedSeriesNames}
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
			<div class="w-full">
				<table class="table w-full table-fixed text-sm">
					<thead>
						<tr>
							<th class="w-8" />
							<th />
							<th class="w-[100px] text-right">{$selectedDataLabel}</th>
							<th class="w-[100px] text-right">Contribution</th>
						</tr>
					</thead>

					<tbody>
						{#each [...combinedSeriesNames].reverse() as name}
							<tr>
								<td>
									<div
										class="rounded-full bg-mid-grey w-4 h-4"
										style="background-color: {combinedSeriesColours[name]}"
									/>
								</td>
								<td class="whitespace-nowrap">
									{combinedSeriesLabels[name]}
								</td>
								<td class="text-right">{hoverData ? formatValue(hoverData[name]) : ''}</td>
								<td class="text-right">
									{hoverData ? formatValue((hoverData[name] / hoverData._max) * 100) + '%' : ''}
								</td>
							</tr>
						{/each}
					</tbody>

					<tfoot>
						<tr>
							<td />
							<td class="font-bold">Total</td>
							<td class="text-right">{hoverData ? formatValue(hoverData._max) : ''}</td>
							<td />
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</div>
{/if}

<style>
	th {
		@apply bg-warm-grey border-t px-3 py-6 border-mid-warm-grey text-xs;
	}
	td {
		@apply px-3 py-2 border-b border-mid-warm-grey;
	}
</style>
