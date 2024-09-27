<script>
	import { setContext, getContext } from 'svelte';
	import { group, rollup } from 'd3-array';
	import { timeDay, timeMonth } from 'd3-time';

	import { browser } from '$app/environment';

	import Meta from '$lib/components/Meta.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import IconXMark from '$lib/icons/XMark.svelte';

	import PinnedRecords from './components/PinnedRecords.svelte';
	import List from './components/List.svelte';
	import Table from './components/Table.svelte';
	import Filters from './components/Filters.svelte';
	import fetchRecords from './page-data-options/fetch';
	import {
		aggregateOptions,
		periodOptions,
		fuelTechOptions,
		milestoneTypeOptions,
		fuelTechLabel,
		milestoneTypeLabel,
		periodLabel
	} from './page-data-options/filters';
	import filtersStore from './stores/filters';

	export let data;

	setContext('records-filters', filtersStore());

	const { selectedView, selectedFuelTechs, selectedMetrics, selectedPeriods } =
		getContext('records-filters');

	const regions = [
		{ value: 'au.nem', shortValue: '', label: 'NEM' },
		{ value: 'au.nem.nsw1', shortValue: 'nsw1', label: 'NSW' },
		{ value: 'au.nem.qld1', shortValue: 'qld1', label: 'QLD' },
		{ value: 'au.nem.sa1', shortValue: 'sa1', label: 'SA' },
		{ value: 'au.nem.tas1', shortValue: 'tas1', label: 'TAS' },
		{ value: 'au.nem.vic1', shortValue: 'vic1', label: 'VIC' },
		{ value: 'au.wem', shortValue: 'wem', label: 'WA' }
	];
	let selectedRegion = regions[0].value;

	let errorMessage = '';
	/** @type {MilestoneRecord[]} */
	let recordsData = [];
	let totalRecords = 0;
	let pageSize = 500;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * pageSize + 1;

	//TODO: refactor to store
	/** @type {string[]} */
	let checkedRegions = data.regions && data.regions.length ? data.regions : ['nem'];

	/** @type {string[]} */
	let checkedFuelTechs =
		data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : fuelTechOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedPeriods =
		data.periods && data.periods.length ? data.periods : periodOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedAggregates =
		data.aggregates && data.aggregates.length
			? data.aggregates
			: aggregateOptions.map((i) => i.value);

	let checkedMilestoneTypes =
		data.milestoneTypes && data.milestoneTypes.length
			? data.milestoneTypes
			: milestoneTypeOptions.map((i) => i.value);

	let selectedSignificance = data.significance || 9;

	let recordIdSearch = data.stringFilter || '';

	$: if (browser) {
		fetchRecords(
			currentPage,
			checkedRegions,
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

	$: {
		let selectedRegionShortValue = regions.find((r) => r.value === selectedRegion)?.shortValue;
		if (selectedRegionShortValue) {
			checkedRegions = [selectedRegionShortValue];
		}
	}

	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

	$: rolledUpRecords = rollup(
		recordsData,
		(/** @type {MilestoneRecord[]} */ d) => {
			const latestTime = d.map((d) => d.time).reduce((a, b) => Math.max(a, b), 0);
			return {
				time: latestTime,
				date: new Date(latestTime),
				records: group(d, (d) => d.record_id)
			};
		},
		(/** @type {MilestoneRecord} */ d) => timeMonth(d.date),
		(/** @type {MilestoneRecord} */ d) => timeDay(d.date)
	);
	// $: sortedRolledUpRecords = Array.from(rolledUpRecords.values()).sort((a, b) => b.time - a.time);
	$: console.log('rolledUpRecords', rolledUpRecords);
	// $: console.log('sortedRolledUpRecords', sortedRolledUpRecords);
</script>

<Meta title="Records" image="/img/preview.jpg" />

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
				selected={selectedRegion}
				on:change={(evt) => (selectedRegion = evt.detail.value)}
				class="justify-center bg-white text-xxs md:text-sm"
			/>
		</div>

		<div class="px-6 md:px-0">
			<PinnedRecords region={selectedRegion} />
		</div>
	</section>
</div>

<div class="border-y border-warm-grey py-6">
	<Filters />
</div>

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
							class="bg-light-warm-grey text-xs rounded-full flex justify-between items-center gap-3 pl-5"
						>
							<span>{fuelTechLabel[fuelTech]}</span>
							<button
								class="bg-warm-grey hover:bg-mid-warm-grey rounded-full p-2 text-mid-grey"
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
							class="bg-light-warm-grey text-xs rounded-full flex justify-between items-center gap-3 pl-5"
						>
							<span>{milestoneTypeLabel[metric]}</span>
							<button
								class="bg-warm-grey hover:bg-mid-warm-grey rounded-full p-2 text-mid-grey"
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
							class="bg-light-warm-grey text-xs rounded-full flex justify-between items-center gap-3 pl-5"
						>
							<span>{periodLabel[period]}</span>
							<button
								class="bg-warm-grey hover:bg-mid-warm-grey rounded-full p-2 text-mid-grey"
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
	<div class="md:container">
		<Table dataset={recordsData} />
	</div>
{/if}
