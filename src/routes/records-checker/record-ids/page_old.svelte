<script>
	import { run } from 'svelte/legacy';

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import Filters from '../components/Filters.svelte';
	import {
		regionOptions,
		aggregateOptions,
		periodOptions,
		fuelTechOptions
	} from '../page-data-options/filters.js';

	let { data } = $props();
	let recordsData = $state([]);
	let totalRecords = $state(0);
	let currentPage = $state(data.page || 1);
	let currentStartRecordIndex = $state((currentPage - 1) * 100 + 1);

	let errorMessage = $state('');

	/** @type {string[]} */
	let checkedRegions =
		$state(data.regions && data.regions.length
			? data.regions
			: ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1']);

	/** @type {string[]} */
	let checkedFuelTechs =
		data.fuelTechs && data.fuelTechs.length ? data.fuelTechs : fuelTechOptions.map((i) => i.value);

	/** @type {string[]} */
	let checkedPeriods =
		$state(data.periods && data.periods.length ? data.periods : periodOptions.map((i) => i.value));

	let recordIdSearch = data.stringFilter || '';



	function getFilterParams({ regions, periods, fuelTechs, stringFilter }) {
		const validRegions = regions.filter((r) => r !== '_all');
		const regionsParam =
			regions.length === 0 || regions.length === 7 ? '' : '&regions=' + validRegions.join(',');
		const periodsParam =
			periods.length === periodOptions.length ? '' : '&periods=' + periods.join(',');

		const fuelTechParams =
			fuelTechs.length === fuelTechOptions.length ? '' : '&fuelTechs=' + fuelTechs.join(',');

		const recordIdSearchParam = stringFilter
			? `&recordIdFilter=${encodeURIComponent(stringFilter.trim())}`
			: '';

		return {
			regionsParam,
			periodsParam,
			recordIdSearchParam,
			fuelTechParams
		};
	}

	async function fetchRecords(
		page = 1,
		regions = checkedRegions,
		periods = checkedPeriods,
		fuelTechs = checkedFuelTechs
	) {
		const { regionsParam, periodsParam, recordIdSearchParam, fuelTechParams } = getFilterParams({
			regions,
			periods,
			stringFilter: recordIdSearch,
			fuelTechs
		});

		if (browser) {
			const res2 = await fetch('/api/record-ids?page=' + page);
			const jsonData2 = await res2.json();

			// const res = await fetch(
			// 	`/api/records?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}`
			// );
			// const jsonData = await res.json();

			// console.log('res2', jsonData2);

			if (jsonData2.success) {
				errorMessage = '';
				recordsData = jsonData2.data;
				totalRecords = jsonData2.data.length;
			} else {
				recordsData = [];
				totalRecords = 0;
				errorMessage = jsonData2.error;
			}
		}
	}

	/**
	 * Update the current page
	 * @param {number} page
	 */
	function updateCurrentPage(page) {
		currentPage = page;
		currentStartRecordIndex = (page - 1) * 100 + 1;

		const { regionsParam, periodsParam, recordIdSearchParam, fuelTechParams } = getFilterParams({
			regions: checkedRegions,
			periods: checkedPeriods,
			stringFilter: recordIdSearch,
			fuelTechs: checkedFuelTechs
		});

		goto(
			`/records?page=${page}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}`,
			{
				replaceState: true
			}
		);
	}

	/**
	 * Handle filters apply
	 * @param {{checkedRegions: string[], checkedPeriods: string[], checkedFuelTechs: string[], recordIdSearch: string}} detail
	 */
	function handleFiltersApply(detail) {
		console.log('Regions', detail.checkedRegions);
		checkedRegions = detail.checkedRegions;
		checkedPeriods = detail.checkedPeriods;
		recordIdSearch = detail.recordIdSearch;
		checkedFuelTechs = detail.checkedFuelTechs;
		updateCurrentPage(1);
	}

	// remove seconds and time difference from timestamp
	function removeSeconds(timestamp) {
		return timestamp.slice(0, -9);
	}

	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});
	run(() => {
		fetchRecords(currentPage, checkedRegions, checkedPeriods);
	});
	let totalPages = $derived(Math.ceil(totalRecords / 100));
	let currentLastRecordIndex = $derived(currentStartRecordIndex + 99);
	let lastRecordIndex =
		$derived(currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex);
	run(() => {
		console.log('data', data);
	});
</script>

<header class=" mt-12">
	<!-- <Filters
		initCheckedRegions={checkedRegions}
		initCheckedPeriods={checkedPeriods}
		initRecordIdSearch={recordIdSearch}
		initCheckedFuelTechs={checkedFuelTechs}
		on:apply={(evt) => handleFiltersApply(evt.detail)}
	/>

	<hr class="my-10" /> -->

	<h4 class="text-center">{totalRecords} record IDs</h4>
</header>

{#if errorMessage}
	<div class="flex items-center justify-center h-64">
		<p class="text-red">{errorMessage}</p>
	</div>
{/if}

{#if recordsData.length > 0}
	<!-- <div class="py-5 flex justify-center gap-16">
		<div class="flex gap-5">
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				on:click={() => updateCurrentPage(1)}>Back to first page</button
			>
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === 1}
				on:click={() => updateCurrentPage(currentPage - 1)}>Previous</button
			>
		</div>

		<div class="text-xs text-center">
			Page {currentPage} of {totalPages}
			<br />
			({currentStartRecordIndex} to {lastRecordIndex})
		</div>

		<div class="flex gap-5">
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				on:click={() => updateCurrentPage(currentPage + 1)}>Next</button
			>
			<button
				class="border rounded text-xs py-1 px-4"
				class:invisible={currentPage === totalPages}
				on:click={() => updateCurrentPage(totalPages)}>Jump to last page</button
			>
		</div>
	</div> -->
	<div class="py-5 px-10">
		<table class="w-full text-xs border border-mid-warm-grey p-2">
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th colspan="2"></th>
					<th colspan="2" class="!text-center">Current Record</th>
					<th colspan="8"></th>
				</tr>
			</thead>
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th>No.</th>
					<th>Record ID</th>

					<th>Interval</th>
					<th class="!text-right">Value & unit</th>

					<th>Network</th>
					<th>Region</th>
					<th>Fuel Tech</th>

					<th>Metric</th>
					<th>Period</th>
					<th>Aggregate</th>
					<th>Significance</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each recordsData as record, i}
					<tr class="border-b border-mid-warm-grey hover:bg-warm-grey">
						<td>{currentStartRecordIndex + i}</td>
						<td>{record.record_id}</td>

						<td class="font-mono text-dark-grey">
							{removeSeconds(record.interval)}
						</td>
						<td>
							<div class="flex justify-end gap-1">
								<span class="font-mono text-black">{auNumber.format(record.value)}</span>
								<span class="text-mid-grey">{record.value_unit}</span>
							</div>
						</td>

						<td>{record.network_id}</td>
						<td>{record.network_region || 'all'}</td>
						<td>{record.fueltech_id || ''}</td>

						<td>{record.period}</td>
						<td>{record.metric}</td>
						<td>{record.aggregate}</td>
						<td>{record.significance}</td>

						<td>
							<a
								class="p-1 text-xxs border border-mid-warm-grey text-mid-grey bg-light-warm-grey"
								href="/records/{encodeURIComponent(record.record_id)}"
							>
								History
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	td,
	th {
		@apply border-r border-mid-warm-grey p-1 align-top text-left;
	}
</style>
