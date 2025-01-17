<script>
	import { setContext, getContext } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { parseISO } from 'date-fns';
	import { browser } from '$app/environment';
	import useDate from '$lib/utils/TimeSeries/use-date';
	import formatDateBasedOnInterval from '$lib/utils/formatters-data-interval';
	import { parseUnit } from '$lib/utils/si-units';
	import {
		getFormattedDate,
		getFormattedMonth,
		getFormattedDateTime
	} from '$lib/utils/formatters.js';

	import Meta from '$lib/components/Meta.svelte';
	import IconXCircle from '$lib/icons/XCircle.svelte';
	// import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import { regionsWithLabels } from '$lib/regions';

	import PageNav from '../components/PageNav.svelte';
	import HistoryChart from '../components/HistoryChart.svelte';
	import {
		milestoneTypeDisplayPrefix,
		milestoneTypeDisplayAllowedPrefixes
	} from '../page-data-options/filters';
	import recordDescription from '../page-data-options/record-description';
	// import getRelativeTime from '../page-data-options/relative-time';
	// import HistoryTable from '../components/HistoryTable.svelte';
	import Tracker from '../components/Tracker.svelte';
	import { recordState } from '../stores/state.svelte';
	import FuelTechIcon from '../components/FuelTechIcon.svelte';

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
	let period = $derived(recordState.recordByRecordId?.period || null);

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
				return formatDateBasedOnInterval(date, '1d');
			};
		}

		if (period === 'year') {
			return function (/** @type {Date} */ date) {
				return formatDateBasedOnInterval(date, '1Y');
			};
		}

		if (period === 'quarter') {
			return function (/** @type {Date} */ date) {
				return formatDateBasedOnInterval(date, '1Q');
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
				$focusTime = undefined;
				$brushFocusTime = undefined;
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
				const date = record.interval
					? period === 'interval'
						? parseISO(record.interval)
						: parseISO(useDate(record.interval))
					: new Date();
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

			$title = metric;
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
	{@const ftId = recordState.recordByRecordId?.fueltech_id || 'demand'}
	<div class="flex gap-6 px-10 md:px-16 my-10">
		<div class="flex items-center gap-6">
			<span
				class="bg-{ftId} rounded-full p-3 place-self-start"
				class:text-black={ftId === 'solar'}
				class:text-white={ftId !== 'solar'}
			>
				<FuelTechIcon fuelTech={ftId} sizeClass={10} />
			</span>

			<h2 class="leading-lg text-lg font-medium mb-0">
				{pageTitle}
			</h2>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-{$focusTime ? 2 : 1} gap-5 px-0 md:px-16 mb-10">
		<div class="w-full">
			<!-- <div class="flex items-center gap-6 my-10">
				<span
					class="bg-{ftId} rounded-full p-3 place-self-start"
					class:text-black={ftId === 'solar'}
					class:text-white={ftId !== 'solar'}
				>
					<FuelTechIcon fuelTech={ftId} sizeClass={10} />
				</span>

				<h2 class=" leading-lg text-lg font-medium mb-0">
					{pageTitle}
				</h2>
			</div> -->

			<HistoryChart
				{sortedHistoryData}
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
				on:pointerup={handlePointerup}
				on:blur={handleMouseout}
			/>
		</div>

		{#if $focusTime}
			<div in:fly={{ x: 100 }} class="bg-white rounded-lg p-6 md:border border-warm-grey relative">
				<button
					class="absolute right-0 top-0 md:-right-5 md:-top-5"
					onclick={() => ($focusTime = undefined)}
				>
					<IconXCircle class="size-8 md:size-12" />
				</button>
				<Tracker />
			</div>
		{/if}
	</div>
{/if}

<hr class="border-warm-grey border-0.5" />
