<script>
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Meta from '$lib/components/Meta.svelte';
	import { regionsWithLabels } from '$lib/regions';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FuelTechIcon from '../components/FuelTechIcon.svelte';
	import recordDescription from '../page-data-options/record-description';
	import PageNav from './RecordHistory/PageNav.svelte';
	import RecordHistory from './RecordHistory/index.svelte';
	import { recordState } from './RecordHistory/stores/state.svelte';
	import init from './RecordHistory/helpers/init';
	import fetchRecord from './RecordHistory/helpers/fetch';
	import process from './RecordHistory/helpers/process';
	import { xTickValueFormatters } from './RecordHistory/helpers/config';

	let { data } = $props();
	let { period, recordIds, focusDateTime } = $derived(data);
	let loading = $state(false);
	let defaultXDomain = $state();
	let { chartCxt, dateBrushCxt } = init();

	recordState.recordIds = recordIds;

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
		if (period) {
			chartCxt.xTicks = xTickValueFormatters[period].ticks;
			chartCxt.formatTickX = xTickValueFormatters[period].formatTick;
			chartCxt.formatX = xTickValueFormatters[period].format;

			dateBrushCxt.xTicks = xTickValueFormatters[period].ticks;
			dateBrushCxt.formatTickX = xTickValueFormatters[period].formatTick;
			dateBrushCxt.formatX = xTickValueFormatters[period].format;
		}
	});

	$effect(() => {
		if (focusDateTime) {
			let date = new Date(focusDateTime);
			recordState.selectedTime = date.getTime();
			chartCxt.focusTime = date.getTime();
			recordState.showTracker = true;
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
		let isWem = record.network_id === 'WEM';
		chartCxt.title = record.metric;
		chartCxt.timeZone = isWem ? '+08:00' : '+10:00';

		chartCxt.seriesData = seriesData;
		chartCxt.seriesNames = ['value'];
		chartCxt.seriesColours = { value: '#999' };
		chartCxt.seriesLabels = { value: '' };
		chartCxt.xDomain = xDomain;
		defaultXDomain = xDomain;

		chartCxt.chartTooltips.valueColour = fuelTechColourMap[record.fueltech_id || 'demand'];
		chartCxt.chartOptions.setLineChart();

		// TODO: refactor this bit into a config object
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

	/**
	 * @param {string} [dateTimeStr]
	 */
	function handleOnFocus(dateTimeStr) {
		let query = new URLSearchParams(page.url.searchParams.toString());

		if (dateTimeStr) {
			query.set('focusDateTime', dateTimeStr);
		} else {
			query.delete('focusDateTime');
		}

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

	let filterOptionsVisible = $state(false);

	/**
	 * @param {boolean} showMobileFilterOptions
	 */
	function handleFilterChange(showMobileFilterOptions) {
		filterOptionsVisible = showMobileFilterOptions;
	}
</script>

<Meta
	title={pageTitle}
	description="Track historical and current records of Australia's electricity grid with Open Electricity's record tracker"
	image={`https://openelectricity.org.au/api/record-preview?key=${data.record_id}~${focusDateTime}`}
/>

{#if data.record_id}
	<div
		class="bg-light-warm-grey sticky top-0 shadow-sm"
		style="z-index: {filterOptionsVisible ? '9999' : '99'}"
	>
		<PageNav
			record_id={data.record_id}
			network_id={data.network_id}
			network_region={data.network_region}
			fueltech_id={data.fueltech_id}
			metric={data.metric}
			period={data.period}
			aggregate={data.aggregate}
			recordIds={data.recordIds}
			onfilterchange={handleFilterChange}
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

	<div class="grid py-6 px-0 md:px-16 grid-cols-1">
		<section>
			<header
				class="grid grid-cols-1 md:grid-cols-[7fr_2fr] items-center mb-6 px-10 md:px-0 gap-10 md:gap-0"
			>
				<div class="flex items-center gap-6 pt-5 md:pt-0">
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

				<button
					class="flex md:flex-col md:justify-end text-dark-grey rounded-2xl px-8 pt-6 pb-4 bg-light-warm-grey md:ml-2 border hover:border-mid-warm-grey transition-border duration-200"
					onclick={() => handleOnFocus(recordState.latestMilestone?.interval || '')}
					class:border-transparent={recordState.latestMilestone?.time !== recordState.selectedTime}
					class:border-mid-warm-grey={recordState.latestMilestone?.time ===
						recordState.selectedTime}
				>
					<div class="text-xs text-mid-grey font-space uppercase w-full text-left">
						Current record
					</div>

					<div class="text-right w-full">
						<div class="text-2xl leading-none font-semibold">
							{chartCxt.convertAndFormatValue(recordState.latestMilestone?.value)}
							<small class="text-xs font-mono">
								{chartCxt.chartOptions.displayUnit}
							</small>
						</div>

						<span class="text-xs font-light text-mid-grey">
							{chartCxt.formatXWithTimeZone(recordState.latestMilestone?.date)}
						</span>
					</div>
				</button>
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
