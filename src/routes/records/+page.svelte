<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import Filters from './components/Filters.svelte';

	export let data;
	let recordsData = [];
	let totalRecords = 0;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * 100 + 1;

	let errorMessage = '';

	/** @type {string[]} */
	let checkedRegions =
		data.regions && data.regions.length
			? data.regions
			: ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

	$: fetchRecords(currentPage, checkedRegions);
	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

	fetchRecords(currentPage, checkedRegions);
	async function fetchRecords(page = 1, regions = checkedRegions) {
		const validRegions = regions.filter((r) => r !== '_all');
		const regionsParam =
			regions.length === 0 || regions.length === 7 ? '' : '&regions=' + validRegions.join(',');
		if (browser) {
			const res = await fetch(`/api/records?page=${page}${regionsParam}`);
			const jsonData = await res.json();

			if (jsonData.success) {
				errorMessage = '';
				recordsData = jsonData.data;
				totalRecords = jsonData.total_records;
			} else {
				recordsData = [];
				totalRecords = 0;
				errorMessage = jsonData.error;
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

		const regionsParam = checkedRegions.join(',');
		goto(`/records?page=${page}&regions=${regionsParam}`, { replaceState: true });
	}

	/**
	 * Handle filters apply
	 * @param {{checkedRegions: string[]}} detail
	 */
	function handleFiltersApply(detail) {
		console.log('Regions', detail.checkedRegions);
		checkedRegions = detail.checkedRegions;
		updateCurrentPage(1);
	}
</script>

<header class=" mt-12">
	<Filters on:apply={(evt) => handleFiltersApply(evt.detail)} />

	<hr class="my-10" />

	<h4 class="text-center">{totalRecords} records</h4>
</header>

{#if errorMessage}
	<div class="flex items-center justify-center h-64">
		<p class="text-red">{errorMessage}</p>
	</div>
{/if}

{#if recordsData.length > 0}
	<div class="py-5 flex justify-center gap-16">
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
	</div>
	<div class="py-5 px-10">
		<table class="w-full text-xs border p-2">
			<thead>
				<tr class="border-b">
					<th>No</th>
					<th>Interval</th>
					<th>Period</th>

					<th>Record ID</th>
					<th>Description</th>
					<th>Value</th>
					<th>Value Unit</th>
					<th>Network</th>
					<th>Region</th>
					<th>Fuel Tech</th>
					<th>Metric</th>
					<th>Aggregate</th>
					<th>Significance</th>
					<th />
				</tr>
			</thead>
			<tbody>
				{#each recordsData as record, i}
					<tr class="border-b hover:bg-mid-warm-grey">
						<td>{currentStartRecordIndex + i}</td>
						<td>{record.interval}</td>
						<td>{record.period}</td>

						<td>{record.record_id}</td>
						<td>{record.description}</td>
						<td class="font-mono">{record.value}</td>
						<td>{record.value_unit}</td>

						<td>{record.network_id}</td>
						<td>{record.network_region || ''}</td>
						<td>{record.fueltech_id || ''}</td>

						<td>{record.metric}</td>
						<td>{record.aggregate}</td>
						<td>{record.significance}</td>

						<td>
							<a
								class="block m-1 p-1 border text-mid-grey bg-light-warm-grey"
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
		@apply border-r p-1 align-top;
	}
</style>
