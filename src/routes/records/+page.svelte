<script>
	import { setContext, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	import Meta from '$lib/components/Meta.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';
	import { regionsWithLabels } from '$lib/regions';

	import PinnedRecords from './components/PinnedRecords.svelte';
	import List from './components/List.svelte';
	import Table from './components/Table.svelte';
	import Filters from './components/Filters.svelte';
	import fetchRecords from './page-data-options/fetch';
	import {
		aggregateOptions,
		fuelTechLabel,
		milestoneTypeLabel,
		periodLabel,
		getFilterParams
	} from './page-data-options/filters';
	import filtersStore from './stores/filters';
	import groupByMonthDay from './page-data-options/group-by-month-day';

	export let data;

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
		{ longValue: 'au.nem', value: 'nem', label: 'NEM' },
		{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW' },
		{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD' },
		{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA' },
		{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS' },
		{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC' },
		{ longValue: 'au.wem', value: 'wem', label: 'WA' }
	];

	let errorMessage = '';
	/** @type {MilestoneRecord[]} */
	let recordsData = [];
	let totalRecords = 0;
	let pageSize = 500;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * pageSize + 1;

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

	$: if (browser) {
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

	$: if (
		browser &&
		($selectedRegions || $selectedPeriods || $selectedFuelTechs || $selectedMetrics)
	) {
		updateCurrentPage(1);
	}

	$: selectedLongValueRegion = regions.find((r) => r.value === $selectedRegion)?.longValue;

	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

	$: rolledUpRecords = groupByMonthDay(recordsData);
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

		console.log('regionsParam', regionsParam);
		console.log('periodsParam', periodsParam);
		console.log('fuelTechParams', fuelTechParams);
		console.log('metricsParam', metricsParam);

		goto(`/records?page=${page}${regionsParam}${periodsParam}${fuelTechParams}${metricsParam}`, {
			replaceState: true
		});
	}
</script>

<Meta
	title={`${regionsWithLabels[$selectedRegion] || 'NEM'} Records`}
	description="Track historical and current records of Australia's electricity grid with Open Electricity's record tracker"
	image="/img/preview.jpg"
/>

<!-- <div class="grid grid-cols-6 divide-x">
	<div class="col-span-2 flex justify-end">
		<section class="w-[400px] bg-mid-grey">
			<h2>Records</h2>

			<div>
				<h4>Filters</h4>
			</div>
		</section>
	</div> -->

<div class="bg-light-warm-grey">
	<section class="md:container py-12">
		<h2 class="text-center">Records</h2>

		<div class="flex justify-center mb-12">
			<Switch
				buttons={regions}
				selected={$selectedRegion}
				on:change={(evt) => ($selectedRegions = [evt.detail.value])}
				class="justify-center bg-white text-xxs md:text-sm"
			/>
		</div>

		<div class="p-6 md:px-0">
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
			<div class="col-span-2 pl-7 pr-12">
				<div class="sticky top-10">
					{#if $selectedFuelTechs.length || $selectedMetrics.length || $selectedPeriods.length}
						<h4>Filters</h4>
					{/if}

					{#if $selectedFuelTechs.length}
						<h6 class="mt-10">Technology</h6>
					{/if}
					<div class="flex gap-2 flex-wrap">
						{#each $selectedFuelTechs as fuelTech}
							<div
								class="bg-white border border-warm-grey text-xs rounded-full flex justify-between items-center gap-3 pl-5"
							>
								<span>{fuelTechLabel[fuelTech]}</span>
								<button
									class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
									on:click={() =>
										($selectedFuelTechs = $selectedFuelTechs.filter((d) => d !== fuelTech))}
								>
									<IconXMark class="size-6" />
								</button>
							</div>
						{/each}
					</div>

					{#if $selectedMetrics.length}
						<h6 class="mt-10">Metric</h6>
					{/if}
					<div class="flex gap-2 flex-wrap">
						{#each $selectedMetrics as metric}
							<div
								class="bg-white border border-warm-grey text-xs rounded-full flex justify-between items-center gap-3 pl-5"
							>
								<span>{milestoneTypeLabel[metric]}</span>
								<button
									class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
									on:click={() => ($selectedMetrics = $selectedMetrics.filter((d) => d !== metric))}
								>
									<IconXMark class="size-6" />
								</button>
							</div>
						{/each}
					</div>

					{#if $selectedPeriods.length}
						<h6 class="mt-10">Period</h6>
					{/if}
					<div class="flex gap-2 flex-wrap">
						{#each $selectedPeriods as period}
							<div
								class="bg-white border border-warm-grey text-xs rounded-full flex justify-between items-center gap-3 pl-5"
							>
								<span>{periodLabel[period]}</span>
								<button
									class="bg-light-warm-grey hover:bg-warm-grey rounded-full p-2 text-mid-grey"
									on:click={() => ($selectedPeriods = $selectedPeriods.filter((d) => d !== period))}
								>
									<IconXMark class="size-6" />
								</button>
							</div>
						{/each}
					</div>
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
