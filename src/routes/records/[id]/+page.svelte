<script>
	import { fade } from 'svelte/transition';
	import Meta from '$lib/components/Meta.svelte';
	import IconXCircle from '$lib/icons/XCircle.svelte';
	import { regionsWithLabels } from '$lib/regions';
	import PageNav from './RecordHistory/PageNav.svelte';
	import recordDescription from '../page-data-options/record-description';
	import MiniTracker from './MiniTracker/Chart.svelte';
	import RecordHistory from './RecordHistory/index.svelte';
	import { recordState } from './RecordHistory/stores/state.svelte';
	import FuelTechIcon from '../components/FuelTechIcon.svelte';
	import init from './RecordHistory/helpers/init';
	import fetchRecord from './RecordHistory/helpers/fetch';
	import process from './RecordHistory/helpers/process';
	let { data } = $props();

	let loading = $state(false);
	let showTracker = $state(false);
	let period = $derived(data.period || '');

	let { chartCxt, dateBrushCxt } = init(period);

	recordState.recordIds = data.recordIds;

	$effect(() => {
		recordState.id = data.record_id;
		recordState.error = false;
		recordState.selectedTime = undefined;
	});

	$inspect('data props', data);

	$effect(() => {
		let id = recordState.id;
		if (id) {
			recordState.error = false;
			fetchRecord(id)
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

	/**
	 * @param {{
	 * milestones: MilestoneRecord[],
	 * seriesData: TimeSeriesData[],
	 * xDomain: [Date, Date]
	 * }} data
	 */
	function updateCxt({ milestones, seriesData, xDomain }) {
		let record = milestones[0];
		chartCxt.title = record.metric;

		chartCxt.seriesData = seriesData;
		chartCxt.seriesNames = ['value'];
		chartCxt.seriesColours = { value: '#777' };
		chartCxt.seriesLabels = { value: '' };
		chartCxt.xDomain = xDomain;

		dateBrushCxt.seriesData = seriesData;
		dateBrushCxt.seriesNames = ['value'];
		dateBrushCxt.seriesColours = { value: '#777' };
		dateBrushCxt.seriesLabels = { value: '' };
		dateBrushCxt.xDomain = xDomain;
		dateBrushCxt.yKey = 'value';

		chartCxt.chartOptions.setLineChart();

		recordState.milestones = milestones;
	}

	/**
	 * @param {number} time
	 */
	function handleOnFocus(time) {
		recordState.selectedTime = time;
		showTracker = true;
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
			desc += ` in the ${networkId}`;
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

	<div
		class="grid grid-cols-2 gap-5 px-0 md:px-16 mb-10"
		class:md:grid-cols-[5fr_2fr]={showTracker}
		class:md:grid-cols-1={!showTracker}
	>
		<div class="w-full p-6 bg-white rounded-lg border border-warm-grey">
			{#if period && data.record_id}
				<RecordHistory {chartCxt} {dateBrushCxt} {period} onfocus={handleOnFocus} />
			{/if}
		</div>

		{#if showTracker}
			<div class="bg-white rounded-lg p-6 md:border border-warm-grey relative">
				<button
					class="absolute right-0 top-0 md:-right-5 md:-top-5"
					onclick={() => (showTracker = false)}
				>
					<IconXCircle class="size-8 md:size-12" />
				</button>
				<MiniTracker record={recordState.selectedMilestone} />
			</div>
		{/if}
	</div>
{/if}

<hr class="border-warm-grey border-0.5" />
