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
	import TrackerChart from '../components/TrackerChart.svelte';
	import { recordState } from '../stores/state.svelte';

	let { data } = $props();
	$inspect('data', data.id);
	$inspect('recordState.id', recordState.id);
	$inspect('recordState.recordByRecordId', recordState.recordByRecordId);

	$effect(() => {
		recordState.id = data.id;
		recordState.recordIds = data.recordIds;
	});

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
		focusData,
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
		maximumFractionDigits,
		timeZone
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
	let historyData = $state.raw([]);
	let loading = $state(false);
	let error = $state(false);

	/**
	 * @param {string} period
	 * @param {string} timeZone
	 */
	function timeFormatter(period, timeZone) {
		if (period === 'interval') {
			return function (/** @type {Date} */ date) {
				return getFormattedDateTime(date, 'medium', 'short', timeZone);
			};
		}

		if (period === 'day') {
			return function (/** @type {Date} */ date) {
				return getFormattedDate(date, undefined, 'numeric', 'short', 'numeric', timeZone);
			};
		}

		return function (/** @type {Date} */ date) {
			return getFormattedMonth(date, 'short', timeZone);
		};
	}

	/**
	 * Fetch a single record
	 * @param {string} recordId
	 * @param {number} page
	 */
	async function fetchRecord(recordId, page = 1) {
		if (browser) {
			recordState.record = null;
			loading = true;
			error = false;
			const id = encodeURIComponent(recordId);
			const res = await fetch(`/api/records/${id}?page=${page}`);
			const jsonData = await res.json();

			if (jsonData.total_records) {
				historyData = jsonData.data;
			} else {
				historyData = [];
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

	let sortedHistoryData = $derived(
		historyData
			.map((record) => {
				const date = record.interval ? parseISO(record.interval) : new Date();
				return {
					...record,
					date,
					time: date.getTime()
				};
			})
			.sort((a, b) => b.time - a.time)
	);
	$effect(() => {
		if (historyData.length) {
			recordState.record = sortedHistoryData[0];
			// console.log('sortedHistoryData', sortedHistoryData[0]);
			const period = sortedHistoryData[0].period;
			const metric = sortedHistoryData[0].metric;
			const parsed = parseUnit(sortedHistoryData[0].value_unit);
			const isWem = sortedHistoryData[0].network_id === 'WEM';
			const sortedData = [...sortedHistoryData].reverse();

			if (isWem) {
				$timeZone = 'Australia/Perth';
			} else {
				$timeZone = undefined;
			}

			$title = sortedHistoryData[0].description;
			$seriesNames = ['value'];
			$seriesData = sortedData;
			$chartType = 'line';
			$chartHeightClasses = 'h-[300px] md:h-auto';
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
			$brushFormatTickX = (/** @type {Date} */ date) =>
				getFormattedMonth(date, undefined, $timeZone);
			$formatTickX = timeFormatter(period, $timeZone);
		}
	});
	$effect(() => {
		$seriesLabels = { value: $displayUnit || '' };
	});

	$effect(() => {
		if (recordState.id) fetchRecord(recordState.id);
	});

	let pageTitle = $derived.by(() => {
		let record = recordState.record;
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
	});
</script>

<Meta
	title={pageTitle}
	description="Track historical and current records of Australia's electricity grid with Open Electricity's record tracker"
	image="/img/preview.jpg"
/>

{#if recordState.id}
	<PageNav />
{/if}

{#if error}
	<div class="flex h-96 items-center justify-center">
		<p>
			There is no tracking for <span class="font-medium">{recordState.id}</span>
		</p>
	</div>
{:else if loading}
	<div
		transition:fade
		class="md:grid wrapper flex flex-col gap-6 px-10 md:px-16 pt-10 pb-32 md:h-[calc(100vh-240px)] z-10 animate-pulse"
	>
		<div class="bg-mid-warm-grey rounded-lg h-[128px]"></div>
		<div class="bg-mid-warm-grey rounded-lg"></div>
		<div class="bg-mid-warm-grey rounded-lg"></div>
		<div class="bg-mid-warm-grey rounded-lg"></div>
	</div>
{:else}
	<div
		class="md:grid wrapper flex flex-col md:gap-6 px-0 md:px-16 pt-10 md:h-[70vh] md:min-h-[700px] z-10"
	>
		<div
			class="bg-white mx-10 md:mx-0 mb-10 md:mb-0 px-6 py-6 rounded-lg border border-warm-grey flex flex-col justify-center"
		>
			<h5 class="font-space uppercase text-mid-grey text-sm font-medium mb-0">Current Record</h5>

			<div>
				<span class="text-3xl text-dark-grey font-medium leading-3xl">
					{$convertAndFormatValue(recordState.record?.value)}
				</span>

				{#if $allowPrefixSwitch}
					<button class="text-mid-grey text-sm hover:underline" onclick={moveToNextDisplayPrefix}>
						{$displayUnit || ''}
					</button>
				{:else}
					<span class="text-mid-grey text-sm">{$displayUnit || ''}</span>
				{/if}
			</div>

			<time datetime={recordState.record?.interval}>
				<span class="text-dark-grey text-sm">
					{recordState.record ? getRelativeTime(recordState.record?.date, 'long') : ''}
				</span>
			</time>
		</div>

		<div class="py-6 px-10 md:px-6">
			<span class="justify-self-start">
				<FuelTechTag
					fueltech={recordState.recordByRecordId?.fueltech_id || 'demand'}
					showText={!!recordState.recordByRecordId?.fueltech_id}
				/>
			</span>

			<h2 class="mt-4 mb-0">
				{pageTitle}
			</h2>
		</div>

		<HistoryTable
			{sortedHistoryData}
			on:mousemove={handleMousemove}
			on:mouseout={handleMouseout}
			on:blur={handleMouseout}
			on:pointerup={handlePointerup}
		/>

		<div class="bg-white p-4 md:rounded-lg md:border border-warm-grey">
			<HistoryChart
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
				on:pointerup={handlePointerup}
			/>
		</div>
	</div>

	<!-- <div class="px-0 md:px-16 pt-10 pb-32 md:pb-0">
		<div class="bg-white p-4 md:rounded-lg md:border border-warm-grey">
			<TrackerChart />
		</div>
	</div> -->
{/if}

<hr class="border-warm-grey border-0.5" />

<style>
	.wrapper {
		grid-template-columns: 2fr 5fr;
		grid-template-rows: 1fr 9fr;
	}
</style>
