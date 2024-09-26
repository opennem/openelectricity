<script>
	import { setContext, getContext } from 'svelte';

	import { parseISO, format } from 'date-fns';
	import { browser } from '$app/environment';
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import dataVizStore from '$lib/components/charts/stores/data-viz';

	import HistoryChart from '../components/HistoryChart.svelte';
	import { formatStrings, formatStringsLong } from '../page-data-options/formatters';

	export let data;

	setContext('record-history-data-viz', dataVizStore());
	setContext('date-brush-data-viz', dataVizStore());
	const {
		title,
		seriesNames,
		seriesData,
		chartType,
		formatTickX,
		focusTime,
		hoverTime,
		hoverKey,
		convertAndFormatValue,
		chartHeightClasses
	} = getContext('record-history-data-viz');
	const {
		seriesNames: brushSeriesNames,
		seriesData: brushSeriesData,
		focusTime: brushFocusTime,
		hoverTime: brushHoverTime,
		hoverKey: brushHoverKey,
		chartType: brushChartType
	} = getContext('date-brush-data-viz');

	/** @type {MilestoneRecord[]} */
	let historyData = [];
	let totalHistory = 0;
	let loading = false;

	$: if (sortedHistoryData.length) {
		const period = sortedHistoryData[0].period;
		$title = sortedHistoryData[0].description;
		$seriesNames = ['value'];
		$seriesData = [...sortedHistoryData].reverse();
		$chartType = 'line';
		$chartHeightClasses = 'h-[500px]';

		// date brush - REFACTOR this
		$brushSeriesNames = ['value'];
		$brushSeriesData = [...sortedHistoryData].reverse();
		$brushChartType = 'line';

		$formatTickX = (/** @type {Date} */ date) =>
			format(date, formatStrings[period] || 'd MMM yyyy, h:mma');
	}

	$: id = data.id;
	$: fetchRecord(id);
	$: console.log('id', id);
	$: console.log('historyData', historyData);
	$: console.log('sortedHistoryData', sortedHistoryData);
	$: currentRecord = sortedHistoryData.length ? sortedHistoryData[0] : null;
	$: previousRecord =
		sortedHistoryData.length && sortedHistoryData.length > 1 ? sortedHistoryData[1] : null;
	$: isPeriodInterval = currentRecord?.period === 'interval';

	$: sortedHistoryData = historyData
		.map((record) => {
			const date = parseISO(record.interval);
			return {
				...record,
				date,
				time: date.getTime()
			};
		})
		.sort((a, b) => b.time - a.time);

	/**
	 * Fetch a single record
	 * @param {string} recordId
	 * @param {number} page
	 */
	async function fetchRecord(recordId, page = 1) {
		if (browser) {
			loading = true;
			const id = encodeURIComponent(recordId);
			const res = await fetch(`/api/records/${id}?page=${page}`);
			const jsonData = await res.json();

			historyData = jsonData.data;
			totalHistory = jsonData.total_records;
			loading = false;
		}
	}

	/**
	 * @param {CustomEvent<{time: number}>} evt
	 */
	function handleMousemove(evt) {
		$hoverTime = evt.detail?.time;
		$brushHoverTime = evt.detail?.time;
	}

	function handleMouseout() {
		$hoverTime = undefined;
		$hoverKey = undefined;
		$brushHoverTime = undefined;
	}

	/**
	 * @param {CustomEvent<{time: number}>} evt
	 */
	function handlePointerup(evt) {
		const pointerTime = evt.detail.time;
		const isSame = pointerTime ? $focusTime === pointerTime : false;
		const time = isSame ? undefined : pointerTime;

		$focusTime = time;
		$brushFocusTime = time;
	}
</script>

{#if loading}
	<div>Loading...</div>
{:else}
	<div class="container py-12">
		<header class="grid grid-cols-10 gap-10 mb-10">
			<div class="col-span-6 flex flex-col">
				{#if currentRecord?.fueltech_id}
					<span class="justify-self-start">
						<FuelTechTag fueltech={currentRecord?.fueltech_id} />
					</span>
				{/if}

				<span class="text-lg">{currentRecord?.description}</span>
				<span>{currentRecord?.period}</span>
			</div>

			<div class="col-span-4 grid grid-cols-2 divide-x divide-light-warm-grey bg-white">
				<div class="p-6">
					<span>Current Record</span>

					<div>
						<span class="text-2xl">{$convertAndFormatValue(currentRecord?.value)}</span>
						<span>{currentRecord?.value_unit}</span>
					</div>

					<div>
						<time datetime={currentRecord?.interval}>
							<span class="text-dark-grey">
								{currentRecord
									? format(currentRecord?.date, formatStringsLong[currentRecord.period])
									: ''}
							</span>
						</time>
					</div>
				</div>
			</div>
		</header>

		<main class="grid grid-cols-10 gap-10">
			<div class="col-span-6 bg-white p-16">
				<HistoryChart
					on:mousemove={handleMousemove}
					on:mouseout={handleMouseout}
					on:pointerup={handlePointerup}
				/>
			</div>
			<div class="col-span-4">
				<table class="bg-white text-sm w-full">
					<thead>
						<tr>
							<th class="px-4 py-2 text-left">Date</th>
							<th class="px-4 py-2 text-right">{currentRecord?.value_unit}</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedHistoryData as record}
							<tr
								class="border-b border-light-warm-grey pointer hover:bg-warm-grey"
								class:font-semibold={record.time === $focusTime}
								class:text-red={record.time === $focusTime}
								class:bg-warm-grey={record.time === $hoverTime}
								on:mousemove={() => handleMousemove({ detail: { time: record.time } })}
								on:mouseout={handleMouseout}
								on:blur={handleMouseout}
								on:pointerup={() => handlePointerup({ detail: { time: record.time } })}
							>
								<td class="px-4 py-2 font-mono text-dark-grey">{$formatTickX(record.date)}</td>
								<td class="px-4 py-2 text-right font-mono text-dark-grey"
									>{$convertAndFormatValue(record.value)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</main>
	</div>
{/if}
