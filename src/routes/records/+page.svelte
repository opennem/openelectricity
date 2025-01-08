<script>
	import { run } from 'svelte/legacy';

	import { setContext, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	import Meta from '$lib/components/Meta.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { regionsWithLabels } from '$lib/regions';

	import PinnedRecords from './components/PinnedRecords.svelte';
	import List from './components/List.svelte';
	import Table from './components/Table.svelte';
	import Filters from './components/Filters.svelte';
	import FilterTags from './components/FilterTags.svelte';
	import fetchRecords from './page-data-options/fetch';
	import { aggregateOptions, getFilterParams } from './page-data-options/filters';
	import filtersStore from './stores/filters';
	import groupByMonthDay from './page-data-options/group-by-month-day';

	let { data } = $props();

	setContext('records-filters', filtersStore());

	const {
		selectedView,
		selectedRegion,
		selectedRegions,
		selectedFuelTechs,
		selectedMetrics,
		selectedPeriods
	} = getContext('records-filters');

	// TODO: refactor to store
	const regions = [
		{ longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
		{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
		{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
		{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
		{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
		{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
		{ longValue: 'au.wem', value: 'wem', label: 'WA', longLabel: 'Western Australia' }
	];

	let errorMessage = $state('');
	/** @type {MilestoneRecord[]} */
	let recordsData = $state([]);
	let totalRecords = $state(0);
	let pageSize = 500;
	let currentPage = $state(data.page || 1);
	let currentStartRecordIndex = $state((currentPage - 1) * pageSize + 1);

	console.log('data.regions', data.regions);

	$selectedRegions = data.regions && data.regions.length ? data.regions : ['nem'];
	$selectedFuelTechs = data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : [];
	$selectedPeriods = data.periods && data.periods.length ? data.periods : [];
	$selectedMetrics = data.metrics && data.metrics.length ? data.metrics : [];

	/** @type {string[]} */
	let checkedAggregates =
		data.aggregates && data.aggregates.length
			? data.aggregates
			: aggregateOptions.map((i) => i.value);

	let selectedSignificance = data.significance || 9;
	let recordIdSearch = data.stringFilter || '';

	// $: console.log('rolledUpRecords', rolledUpRecords);

	/**
	 * Update the current page
	 * @param {number} page
	 */
	function updateCurrentPage(page) {
		currentPage = page;
		currentStartRecordIndex = (page - 1) * pageSize + 1;

		const { regionsParam, periodsParam, fuelTechParams, metricsParam } = getFilterParams({
			regions: $selectedRegions,
			periods: $selectedPeriods,
			stringFilter: recordIdSearch,
			fuelTechs: $selectedFuelTechs,
			aggregates: checkedAggregates,
			metrics: $selectedMetrics,
			significance: selectedSignificance
		});

		goto(`/records?page=${page}${regionsParam}${periodsParam}${fuelTechParams}${metricsParam}`, {
			replaceState: true
		});
	}
	$effect(() => {
		if (browser) {
			fetchRecords(
				currentPage,
				$selectedRegions,
				$selectedPeriods,
				$selectedFuelTechs,
				checkedAggregates,
				$selectedMetrics,
				selectedSignificance,
				recordIdSearch,
				pageSize
			).then((res) => {
				errorMessage = res.errorMessage;
				recordsData = res.recordsData;
				totalRecords = res.totalRecords;
			});
		}
	});
	$effect(() => {
		if (
			browser &&
			($selectedRegions || $selectedPeriods || $selectedFuelTechs || $selectedMetrics)
		) {
			updateCurrentPage(1);
		}
	});
	let selectedLongValueRegion = $derived(
		regions.find((r) => r.value === $selectedRegion)?.longValue
	);
	let totalPages = $derived(Math.ceil(totalRecords / 100));
	let currentLastRecordIndex = $derived(currentStartRecordIndex + 99);
	let lastRecordIndex = $derived(
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex
	);
	let rolledUpRecords = $derived(groupByMonthDay(recordsData));
</script>

<Meta
	title={`${regionsWithLabels[$selectedRegion] || 'NEM'} Records`}
	description="Track historical and current records of Australia's electricity grid with Open Electricity's record tracker"
	image="/img/preview.jpg"
/>

<div class="bg-light-warm-grey">
	<section class="md:container py-12">
		<div class="flex items-center gap-2 justify-between md:justify-center pl-10 pr-5 md:px-0">
			<h2 class="text-xl md:text-2xl mb-0 md:mb-12">Records</h2>
			<div class="md:hidden flex justify-center text-sm">
				<FormSelect
					options={regions.map((r) => ({ label: r.longLabel, value: r.value }))}
					selected={$selectedRegion}
					paddingX="px-4"
					paddingY="py-3"
					align="right"
					on:change={(evt) => ($selectedRegions = [evt.detail.value])}
				/>
			</div>
		</div>

		<div class="hidden md:flex justify-center mb-12">
			<Switch
				buttons={regions}
				selected={$selectedRegion}
				on:change={(evt) => ($selectedRegions = [evt.detail.value])}
				class="justify-center bg-white text-xxs md:text-sm"
			/>
		</div>

		<div class="py-10 md:py-6">
			<PinnedRecords region={selectedLongValueRegion} />
		</div>
	</section>
</div>

<div class="border-y border-warm-grey py-6">
	<Filters />
</div>

<div class="bg-light-warm-grey">
	{#if $selectedView === 'list'}
		<div class="md:container md:grid grid-cols-6 md:divide-x divide-warm-grey py-12">
			<div class="col-span-2 px-10 md:pl-7 md:pr-12">
				<div class="sticky top-10 hidden md:block">
					<FilterTags />
				</div>
			</div>

			<main class="min-h-[600px] col-span-4 md:pl-12 px-6">
				<List {rolledUpRecords} />
			</main>
		</div>
	{:else}
		<div class="md:container p-6">
			<Table dataset={recordsData} />
		</div>
	{/if}
</div>
