<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import Meta from '$lib/components/Meta.svelte';
	import { regionsWithLabels } from '$lib/regions';
	import PageNav from './RecordHistory/PageNav.svelte';
	import recordDescription from '../page-data-options/record-description';
	import RecordHistory from './RecordHistory/index.svelte';
	import { recordState } from './RecordHistory/stores/state.svelte';
	import FuelTechIcon from '../components/FuelTechIcon.svelte';
	import init from './RecordHistory/helpers/init';
	import fetchRecord from './RecordHistory/helpers/fetch';
	import process from './RecordHistory/helpers/process';
	import { xTickValueFormatters } from './RecordHistory/helpers/config';
	let { data } = $props();
	let { period, recordIds, focusTime } = $derived(data);
	let loading = $state(false);
	let defaultXDomain = $state();
	let { chartCxt, dateBrushCxt } = init();

	recordState.recordIds = recordIds;

	$inspect('recordState.latestMilestone', recordState.latestMilestone);

	$effect(() => {
		recordState.id = data.record_id;
		recordState.error = false;
		recordState.selectedTime = undefined;
	});

	$effect(() => {
		if (recordState.id) {
			recordState.error = false;
			recordState.showTracker = false;

			fetchRecord(recordState.id)
				.then((data) => {
					if (data) {
						updateCxt(process({ data, period }));
					} else {
						recordState.error = true;
					}
				})
				.catch((error) => {
					console.error('error fetching record', error);
				});
		}
	});

	$effect(() => {
		console.log('period', period);
		if (period) {
			chartCxt.xTicks = xTickValueFormatters[period].ticks;
			chartCxt.formatTickX = xTickValueFormatters[period].formatTick;
			chartCxt.formatX = xTickValueFormatters[period].format;

			dateBrushCxt.xTicks = xTickValueFormatters[period].ticks;
			dateBrushCxt.formatTickX = xTickValueFormatters[period].formatTick;
			dateBrushCxt.formatX = xTickValueFormatters[period].format;
		}
	});

	/**
	 * @param {{
	 * milestones: MilestoneRecord[],
	 * seriesData: TimeSeriesData[],
	 * xDomain: [Date, Date]
	 * }} data
	 */
	function updateCxt({ milestones, seriesData, xDomain }) {
		let record = milestones[0];
		console.log('record', record);
		let isWem = record.network_id === 'WEM';
		chartCxt.title = record.metric;
		chartCxt.timeZone = isWem ? '+08:00' : '+10:00';

		chartCxt.seriesData = seriesData;
		chartCxt.seriesNames = ['value'];
		chartCxt.seriesColours = { value: '#999' };
		chartCxt.seriesLabels = { value: '' };
		chartCxt.xDomain = xDomain;
		defaultXDomain = xDomain;

		chartCxt.chartOptions.setLineChart();

		// this should be dynamic based on the record metric
		if (record.metric === 'power') {
			chartCxt.chartOptions.prefix = 'M';
			chartCxt.chartOptions.displayPrefix = 'M';
			chartCxt.chartOptions.allowedPrefixes = ['M', 'G'];
			chartCxt.chartOptions.baseUnit = 'W';
		} else if (record.metric === 'energy') {
			chartCxt.chartOptions.prefix = 'M';
			chartCxt.chartOptions.displayPrefix = 'M';
			chartCxt.chartOptions.allowedPrefixes = ['M', 'G'];
			chartCxt.chartOptions.baseUnit = 'Wh';
		} else if (record.metric === 'emissions') {
			chartCxt.chartOptions.prefix = '';
			chartCxt.chartOptions.displayPrefix = 'k';
			chartCxt.chartOptions.allowedPrefixes = ['', 'k'];
			chartCxt.chartOptions.baseUnit = 'tCO2e';
		}

		dateBrushCxt.seriesData = seriesData;
		dateBrushCxt.seriesNames = ['value'];
		dateBrushCxt.seriesColours = { value: '#777' };
		dateBrushCxt.seriesLabels = { value: '' };
		dateBrushCxt.xDomain = xDomain;
		dateBrushCxt.yKey = 'value';

		recordState.milestones = milestones;
	}

	$effect(() => {
		if (focusTime) {
			let time = parseInt(focusTime);
			recordState.selectedTime = time;
			chartCxt.focusTime = time;
			recordState.showTracker = true;
		}
	});

	$effect(() => {
		recordState.selectedTime = chartCxt.focusTime;
	});

	$inspect('focusTime', focusTime);
	$inspect('recordState.selectedTime', recordState.selectedTime);
	$inspect('selectedMilestone', recordState.selectedMilestone);

	/**
	 * @param {number} time
	 */
	function handleOnFocus(time) {
		// recordState.selectedTime = time;

		let query = new URLSearchParams(page.url.searchParams.toString());
		query.set('focusTime', time.toString());
		goto(`?${query.toString()}`, { noScroll: true });
	}

	let pageTitle = $derived.by(() => {
		if (!data) return 'Record';

		let desc = recordDescription(
			data.period || '',
			data.aggregate || '',
			data.metric || '',
			data.fueltech_id || ''
		);
		let networkId = data.network_id?.toLowerCase();

		if (data.network_region) {
			desc += ` in ${regionsWithLabels[data.network_region.toLowerCase()]}`;
		} else if (networkId && regionsWithLabels[networkId]) {
			desc += ` in ${regionsWithLabels[networkId]}`;
		} else {
			desc += ` in the ${networkId?.toUpperCase()}`;
		}

		return desc;
	});
</script>

<Meta
	title={pageTitle}
	description="Track historical and current records of Australia's electricity grid with Open Electricity's record tracker"
	image="/img/preview.jpg"
/>

{#if data.record_id}
	<div class="bg-light-warm-grey">
		<PageNav
			record_id={data.record_id}
			network_id={data.network_id}
			network_region={data.network_region}
			fueltech_id={data.fueltech_id}
			metric={data.metric}
			period={data.period}
			aggregate={data.aggregate}
			recordIds={data.recordIds}
		/>
	</div>
{/if}

{#if recordState.error}
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
	{@const ftId = data.fueltech_id || 'demand'}

	<div class="grid py-6 px-10 md:px-16 grid-cols-1">
		<section>
			<header class="grid grid-cols-[7fr_2fr] items-center mb-6">
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

				<div
					class="inline-flex flex-col text-dark-grey rounded-2xl px-8 py-6 bg-light-warm-grey text-right ml-2"
				>
					<div class="text-xs text-mid-warm-grey font-space font-semibold uppercase">
						Current record
					</div>
					<span class="text-xs">
						{chartCxt.formatXWithTimeZone(recordState.latestMilestone?.date)}
					</span>
					<div class="text-2xl leading-none font-medium">
						{chartCxt.convertAndFormatValue(recordState.latestMilestone?.value)}
						<small class="text-xs">
							{chartCxt.chartOptions.displayUnit}
						</small>
					</div>
				</div>
			</header>

			{#if period && data.record_id}
				<RecordHistory
					{chartCxt}
					{dateBrushCxt}
					{period}
					{defaultXDomain}
					onfocus={handleOnFocus}
				/>
			{/if}
		</section>
	</div>
{/if}

<hr class="border-warm-grey border-0.5" />
