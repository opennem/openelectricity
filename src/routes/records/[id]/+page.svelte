<script>
	import { setContext, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { parseISO } from 'date-fns';
	import { browser } from '$app/environment';
	import { parseUnit } from '$lib/utils/si-units';
	import {
		getFormattedDate,
		getFormattedMonth,
		getFormattedDateTime
	} from '$lib/utils/formatters.js';

	import Meta from '$lib/components/Meta.svelte';
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import { regionsWithLabels } from '$lib/regions';

	import PageNav from '../components/PageNav.svelte';
	import HistoryChart from '../components/HistoryChart.svelte';
	import {
		milestoneTypeDisplayPrefix,
		milestoneTypeDisplayAllowedPrefixes
	} from '../page-data-options/filters';
	import recordDescription from '../page-data-options/record-description';
	import getRelativeTime from '../page-data-options/relative-time';
	import HistoryTable from '../components/HistoryTable.svelte';

	export let data;

	setContext('record-history-data-viz', dataVizStore());
	setContext('date-brush-data-viz', dataVizStore());
	const {
		title,
		seriesNames,
		seriesLabels,
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
		getNextPrefix,
		maximumFractionDigits
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
	let error = false;

	$: if (sortedHistoryData.length) {
		// console.log('sortedHistoryData', sortedHistoryData[0]);
		const period = sortedHistoryData[0].period;
		const metric = sortedHistoryData[0].metric;
		const parsed = parseUnit(sortedHistoryData[0].value_unit);
		console.log('metric', metric);

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

		if (metric === 'proportion') {
			$maximumFractionDigits = 1;
		}

		$brushSeriesNames = ['value'];
		$brushSeriesData = sortedData;
		$brushChartType = 'line';
		$brushFormatTickX = (/** @type {Date} */ date) => getFormattedMonth(date, undefined);
		$formatTickX = timeFormatter(period);
	}
	$: $seriesLabels = { value: $displayUnit || '' };

	$: id = data.id;
	$: fetchRecord(id);
	// $: console.log('id', id);
	// $: console.log('historyData', historyData);
	// $: console.log('sortedHistoryData', sortedHistoryData);
	$: currentRecord = sortedHistoryData.length ? sortedHistoryData[0] : undefined;
	$: previousRecord =
		sortedHistoryData.length && sortedHistoryData.length > 1 ? sortedHistoryData[1] : null;
	$: isPeriodInterval = currentRecord?.period === 'interval';

	$: console.log('currentRecord', currentRecord);
	$: timestamp = currentRecord?.time;
	$: recordId = currentRecord?.record_id;

	$: workerImageLocation =
		recordId && timestamp
			? `https://browser-worker.opennem2161.workers.dev/?key=${recordId}-${timestamp}`
			: '/img/preview.jpg';
	$: console.log('workerImageLocation', workerImageLocation);

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
	 * Fetch a single record
	 * @param {string} recordId
	 * @param {number} page
	 */
	async function fetchRecord(recordId, page = 1) {
		if (browser) {
			loading = true;
			error = false;
			const id = encodeURIComponent(recordId);
			const res = await fetch(`/api/records/${id}?page=${page}`);
			const jsonData = await res.json();

			if (jsonData.total_records) {
				historyData = jsonData.data;
				totalHistory = jsonData.total_records;
			} else {
				historyData = [];
				totalHistory = 0;
				error = true;
			}
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

<div class="px-10 md:px-16 pt-10 pb-0">
	<PageNav {id} record={currentRecord} />
</div>

{#if error}
	<div class="flex h-96 items-center justify-center">
		<p>Record not found.</p>
	</div>
{:else if loading}
	<div
		transition:fade
		class="md:grid wrapper flex flex-col gap-6 px-10 md:px-16 pt-10 pb-32 md:h-[calc(100vh-120px)] z-10 md:overflow-auto animate-pulse"
	>
		<div class="bg-mid-warm-grey rounded-lg h-[128px]" />
		<div class="bg-mid-warm-grey rounded-lg" />
		<div class="bg-mid-warm-grey rounded-lg" />
		<div class="bg-mid-warm-grey rounded-lg" />
	</div>
{:else}
	<div
		class="md:grid wrapper flex flex-col md:gap-6 px-0 md:px-16 pt-10 pb-32 md:h-[calc(100vh-120px)] z-10 md:overflow-auto"
	>
		<div class="py-6 px-10 md:px-0">
			{#if currentRecord?.fueltech_id}
				<span class="justify-self-start">
					<FuelTechTag fueltech={currentRecord?.fueltech_id} />
				</span>
			{/if}

			<h2 class="mt-4 mb-0">
				{pageTitle}
			</h2>
		</div>

		<div
			class="bg-white mx-10 md:mx-0 mb-10 md:mb-0 px-6 py-6 rounded-lg border border-warm-grey flex flex-col justify-center"
		>
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

		<div class="bg-white p-4 md:rounded-lg md:border border-warm-grey">
			<HistoryChart
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
				on:pointerup={handlePointerup}
			/>
		</div>

		<div class="md:hidden h-10 bg-white" />

		<HistoryTable
			{sortedHistoryData}
			on:mousemove={handleMousemove}
			on:mouseout={handleMouseout}
			on:blur={handleMouseout}
			on:pointerup={handlePointerup}
		/>
	</div>
{/if}

<hr class="border-warm-grey border-0.5" />

<style>
	.wrapper {
		grid-template-columns: 5fr 2fr;
		grid-template-rows: 1fr 9fr;
	}
</style>
