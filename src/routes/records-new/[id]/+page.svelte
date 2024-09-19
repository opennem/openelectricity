<script>
	import { setContext, getContext } from 'svelte';

	import { parseISO, format } from 'date-fns';
	import { browser } from '$app/environment';
	import { formatValue } from '$lib/utils/formatters.js';
	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import HistoryChart from '../components/HistoryChart.svelte';

	export let data;

	setContext('record-history-data-viz', dataVizStore());
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

	/** @type {MilestoneRecord[]} */
	let historyData = [];
	let totalHistory = 0;

	$: if (sortedHistoryData.length) {
		const period = sortedHistoryData[0].period;
		$title = sortedHistoryData[0].description;
		$seriesNames = ['value'];
		$seriesData = [...sortedHistoryData].reverse();
		$chartType = 'line';
		$chartHeightClasses = 'h-[500px]';

		// TODO: move this somewhere else to be reused
		/**
		 * @type {Object<string, string>}
		 */
		const formatStrings = {
			interval: 'Pp',
			day: 'd MMM yyyy',
			'7d': 'd MMM yyyy',
			month: 'MMM yyyy',
			quarter: 'MMM yyyy',
			season: 'MMM yyyy',
			year: 'yyyy',
			financial_year: 'yyyy'
		};

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
			const id = encodeURIComponent(recordId);
			const res = await fetch(`/api/records/${id}?page=${page}`);
			const jsonData = await res.json();

			historyData = jsonData.data;
			totalHistory = jsonData.total_records;
		}
	}

	/**
	 * @param {CustomEvent<{time: number}>} evt
	 */
	function handleMousemove(evt) {
		$hoverTime = evt.detail.time;
	}

	function handleMouseout() {
		$hoverTime = undefined;
		$hoverKey = undefined;
	}

	/**
	 * @param {CustomEvent<{time: number}>} evt
	 */
	function handlePointerup(evt) {
		const pointerTime = evt.detail.time;
		const isSame = pointerTime ? $focusTime === pointerTime : false;
		const time = isSame ? undefined : pointerTime;

		$focusTime = time;
	}
</script>

<div class="container py-12">
	<header class="grid grid-cols-10 gap-10 mb-10">
		<div class="col-span-6 flex flex-col">
			<span>{currentRecord?.fueltech_id}</span>
			<span class="text-lg">{currentRecord?.description}</span>
			<span>{currentRecord?.period}</span>
		</div>

		<div class="col-span-4 grid grid-cols-2 divide-x divide-light-warm-grey bg-white">
			<div class="p-6">
				<h6>Previous Record</h6>
				<div>
					<span class="text-2xl">{$convertAndFormatValue(previousRecord?.value)}</span>
					<span>{previousRecord?.value_unit}</span>
				</div>

				<div>
					<time datetime={previousRecord?.interval}>
						<span class="text-dark-grey">
							{previousRecord ? $formatTickX(previousRecord?.date, 'd MMM yyyy') : ''}
						</span>
					</time>
				</div>
			</div>
			<div class="p-6">
				<span>Current Record</span>

				<div>
					<span class="text-2xl">{$convertAndFormatValue(currentRecord?.value)}</span>
					<span>{currentRecord?.value_unit}</span>
				</div>

				<div>
					<time datetime={currentRecord?.interval}>
						<span class="text-dark-grey">
							{currentRecord ? $formatTickX(currentRecord?.date, 'd MMM yyyy') : ''}
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
							class="border-b border-light-warm-grey pointer hover:bg-light-warm-grey"
							class:font-semibold={record.time === $focusTime}
							class:text-red={record.time === $focusTime}
							on:mousemove={() => handleMousemove({ detail: { time: record.time } })}
							on:mouseout={handleMouseout}
							on:blur={handleMouseout}
							on:pointerup={() => handlePointerup({ detail: { time: record.time } })}
						>
							<td class="px-4 py-2">{$formatTickX(record.date)}</td>
							<td class="px-4 py-2 text-right">{$convertAndFormatValue(record.value)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</main>
</div>
