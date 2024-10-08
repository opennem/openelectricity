<script>
	import { setContext, getContext } from 'svelte';
	import { parseISO, format } from 'date-fns';
	import { browser } from '$app/environment';
	import { parseUnit } from '$lib/utils/si-units';
	import {
		getFormattedDate,
		getFormattedMonth,
		getFormattedDateTime,
		getFormattedTime
	} from '$lib/utils/formatters.js';

	import Meta from '$lib/components/Meta.svelte';
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import { regionsWithLabels } from '$lib/regions';

	import HistoryChart from '../components/HistoryChart.svelte';
	import {
		milestoneTypeDisplayPrefix,
		milestoneTypeDisplayAllowedPrefixes
	} from '../page-data-options/filters';
	import recordDescription from '../page-data-options/record-description';
	import getRelativeTime from '../page-data-options/relative-time';

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
		chartHeightClasses,
		baseUnit,
		prefix,
		displayPrefix,
		allowedPrefixes,
		allowPrefixSwitch,
		displayUnit,
		getNextPrefix
	} = getContext('record-history-data-viz');
	const {
		seriesNames: brushSeriesNames,
		seriesData: brushSeriesData,
		focusTime: brushFocusTime,
		hoverTime: brushHoverTime,
		hoverKey: brushHoverKey,
		chartType: brushChartType,
		formatTickX: brushFormatTickX
	} = getContext('date-brush-data-viz');

	/** @type {MilestoneRecord[]} */
	let historyData = [];
	let totalHistory = 0;
	let loading = false;

	$: if (sortedHistoryData.length) {
		// console.log('sortedHistoryData', sortedHistoryData[0]);
		const period = sortedHistoryData[0].period;
		const metric = sortedHistoryData[0].metric;
		const parsed = parseUnit(sortedHistoryData[0].value_unit);

		const sortedData = [...sortedHistoryData].reverse();

		$title = sortedHistoryData[0].description;
		$seriesNames = ['value'];
		$seriesData = sortedData;
		$chartType = 'line';
		$chartHeightClasses = 'h-[500px]';
		$baseUnit = parsed.baseUnit;
		$prefix = parsed.prefix;
		$displayPrefix = milestoneTypeDisplayPrefix[metric];
		$allowedPrefixes = milestoneTypeDisplayAllowedPrefixes[metric];

		$brushSeriesNames = ['value'];
		$brushSeriesData = sortedData;
		$brushChartType = 'line';
		$brushFormatTickX = (/** @type {Date} */ date) => getFormattedMonth(date, undefined);
		$formatTickX = timeFormatter(period);
	}

	$: id = data.id;
	$: fetchRecord(id);
	// $: console.log('id', id);
	// $: console.log('historyData', historyData);
	// $: console.log('sortedHistoryData', sortedHistoryData);
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

	let prevDay = '';

	/**
	 * @param {string} period
	 */
	function timeFormatter(period) {
		if (period === 'interval') {
			return function (/** @type {Date} */ date) {
				return getFormattedDateTime(date, 'medium', 'short');
			};
		}

		if (period === 'day') {
			return function (/** @type {Date} */ date) {
				return getFormattedDate(date, undefined, 'numeric', 'short', 'numeric');
			};
		}

		return function (/** @type {Date} */ date) {
			return getFormattedMonth(date, 'short');
		};
	}

	/**
	 * @param {string} period
	 * @param {boolean} [timeOnly]
	 */
	function tableTimeFormatter(period, timeOnly = false) {
		if (period === 'interval') {
			return function (/** @type {Date} */ date) {
				const day = getFormattedDate(date, undefined, 'numeric', 'short', 'numeric');
				if (!prevDay || day !== prevDay) {
					prevDay = day;
					return getFormattedDate(date, undefined, 'numeric', 'short', 'numeric');
				}

				if (timeOnly) return getFormattedTime(date);

				return '';
			};
		}

		if (period === 'day') {
			return function (/** @type {Date} */ date) {
				return getFormattedDate(date, undefined, 'numeric', 'short', 'numeric');
			};
		}

		if (period === 'year') {
			return function (/** @type {Date} */ date) {
				return getFormattedMonth(date, undefined);
			};
		}

		return function (/** @type {Date} */ date) {
			return getFormattedMonth(date, 'short');
		};
	}

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

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}

	$: getRecordTitle = (record) => {
		if (!record) return 'Record';

		let desc = recordDescription(
			record.period || '',
			record.aggregate || '',
			record.metric || '',
			record.fueltech_id || ''
		);

		if (record.network_region) {
			desc += ` in ${regionsWithLabels[record.network_region.toLowerCase()]}`;
		} else if (regionsWithLabels[record.network_id.toLowerCase()]) {
			desc += ` in ${regionsWithLabels[record.network_id.toLowerCase()]}`;
		} else {
			desc += ` in the ${record.network_id}`;
		}

		return desc;
	};

	$: pageTitle = getRecordTitle(currentRecord);
</script>

<Meta
	title={pageTitle}
	description="Track historical and current records of Australia's electricity grid with Open Electricity's record tracker"
	image="/img/preview.jpg"
/>

{#if loading}
	<div>Loading...</div>
{:else}
	<div class="md:grid wrapper gap-6 p-16 pb-32 md:h-[calc(100vh-100px)] z-10 overflow-auto">
		<div class="py-6">
			{#if currentRecord?.fueltech_id}
				<span class="justify-self-start">
					<FuelTechTag fueltech={currentRecord?.fueltech_id} />
				</span>
			{/if}

			<h2 class="mt-4">
				{pageTitle}
			</h2>
		</div>

		<div class="bg-white px-6 py-6 rounded-lg border border-warm-grey flex flex-col justify-center">
			<h5 class="font-space uppercase text-mid-grey text-sm font-medium mb-0">Current Record</h5>

			<div>
				<span class="text-3xl text-dark-grey font-medium leading-3xl">
					{$convertAndFormatValue(currentRecord?.value)}
				</span>

				{#if $allowPrefixSwitch}
					<button class="text-mid-grey text-sm hover:underline" on:click={moveToNextDisplayPrefix}>
						{$displayUnit || ''}
					</button>
				{:else}
					<span class="text-mid-grey text-sm">{$displayUnit || ''}</span>
				{/if}
			</div>

			<time datetime={currentRecord?.interval}>
				<span class="text-dark-grey text-sm">
					{currentRecord ? getRelativeTime(currentRecord?.date, 'long') : ''}
				</span>
			</time>
		</div>

		<div class="bg-white p-4 rounded-lg border border-warm-grey">
			<HistoryChart
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
				on:pointerup={handlePointerup}
			/>
		</div>

		<div class="md:overflow-y-auto rounded-lg border border-warm-grey">
			<table class="bg-white text-sm w-full">
				<thead>
					<tr class="sticky top-0 z-10 bg-light-warm-grey/60 backdrop-blur-xl">
						<th class="text-left">
							<div class="px-4 py-2">Date</div>
						</th>
						<th class="text-right">
							{#if $allowPrefixSwitch}
								<div class="px-4 py-2">
									<button class="hover:underline" on:click={moveToNextDisplayPrefix}>
										{$displayUnit || ''}
									</button>
								</div>
							{:else}
								<div class="px-4 py-2">{$displayUnit || ''}</div>
							{/if}
						</th>
					</tr>
				</thead>

				<tbody>
					{#each sortedHistoryData as record}
						<tr
							class="border-b border-light-warm-grey pointer hover:bg-warm-grey"
							class:font-semibold={record.time === $focusTime}
							class:bg-warm-grey={record.time === $hoverTime}
							on:mousemove={() => handleMousemove({ detail: { time: record.time } })}
							on:mouseout={handleMouseout}
							on:blur={handleMouseout}
							on:pointerup={() => handlePointerup({ detail: { time: record.time } })}
						>
							<td
								class="pl-4 py-2 font-mono text-dark-grey grid grid-cols-2 gap-1"
								class:text-red={record.time === $focusTime}
							>
								<time datetime={record.interval}>
									{tableTimeFormatter(record.period)(record.date)}
								</time>

								{#if record.period === 'interval'}
									<time datetime={record.interval}>
										{tableTimeFormatter(record.period, true)(record.date)}
									</time>
								{/if}
							</td>

							<td
								class="px-4 py-2 text-right font-mono text-dark-grey"
								class:text-red={record.time === $focusTime}
							>
								{$convertAndFormatValue(record.value)}
							</td>
						</tr>
					{/each}
				</tbody>

				<tfoot>
					<tr class="sticky bottom-0 bg-light-warm-grey/60 backdrop-blur-xl">
						<th class="text-left">
							<div class="px-4 py-2">Total records</div>
						</th>
						<th class="text-right">
							<div class="px-4 py-2">{sortedHistoryData.length}</div>
						</th>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
{/if}

<hr class="border-warm-grey border-0.5" />

<style>
	.wrapper {
		grid-template-columns: 5fr 2fr;
		grid-template-rows: 1fr 9fr;
	}
</style>
