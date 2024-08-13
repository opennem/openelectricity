<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import regionOptions from './page-data-options/regions.js';

	export let data;
	let recordsData = [];
	let totalRecords = 0;
	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * 100 + 1;

	let selectedRegion = 'nem';

	$: fetchRecords(currentPage, selectedRegion);
	$: totalPages = Math.ceil(totalRecords / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalRecords ? totalRecords : currentLastRecordIndex;

	async function fetchRecords(page = 1, region = selectedRegion) {
		console.log('region', region);

		if (browser) {
			const res = await fetch(`/api/records?page=${page}&region=${region}`);
			const jsonData = await res.json();
			recordsData = jsonData.data;
			totalRecords = jsonData.total_records;
			console.log('all records', jsonData);
		}
	}

	/**
	 * Update the current page
	 * @param {number} page
	 */
	function updateCurrentPage(page) {
		currentPage = page;
		currentStartRecordIndex = (page - 1) * 100 + 1;
		goto(`/records?page=${page}`, { replaceState: true });
	}
</script>

<header class="text-center mt-12">
	<h4>{totalRecords} records</h4>

	<div class="flex justify-center">
		<FormSelect
			options={regionOptions}
			selected={selectedRegion}
			on:change={(evt) => (selectedRegion = evt.detail.value)}
		/>
	</div>
</header>

{#if recordsData.length > 0}
	<div class="py-5 flex justify-center gap-16">
		<button
			class="border rounded text-xs py-1 px-4"
			class:invisible={currentPage === 1}
			on:click={() => updateCurrentPage(currentPage - 1)}>Previous</button
		>
		<div class="text-xs text-center">
			Page {currentPage} of {totalPages}
			<br />
			({currentStartRecordIndex} to {lastRecordIndex})
		</div>
		<button
			class="border rounded text-xs py-1 px-4"
			class:invisible={currentPage === totalPages}
			on:click={() => updateCurrentPage(currentPage + 1)}>Next</button
		>
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
