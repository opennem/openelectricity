<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	import RecordHistoryChart from '../components/RecordHistoryChart.svelte';

	export let data;

	let historyData = [];
	let totalHistory = 0;
	let valueUnit = '';
	let period = '';

	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * 100 + 1;

	$: id = data.id;
	$: totalPages = Math.ceil(totalHistory / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalHistory ? totalHistory : currentLastRecordIndex;

	$: fetchRecord(id, currentPage);

	/**
	 * Fetch a single record
	 * @param {string} recordId
	 * @param {number} page
	 */
	async function fetchRecord(recordId, page = 1) {
		console.log('fetching record', recordId, page);
		if (browser) {
			const id = encodeURIComponent(recordId);
			const res = await fetch(`/api/records/${id}?page=${page}`);
			const jsonData = await res.json();

			historyData = jsonData.data;
			totalHistory = jsonData.total_records;

			if (historyData.length > 0) {
				valueUnit = historyData[0].value_unit;
				period = historyData[0].period;
			}
			console.log('record', jsonData);
		}
	}

	/**
	 * Update the current page
	 * @param {number} page
	 */
	function updateCurrentPage(page) {
		currentPage = page;
		currentStartRecordIndex = (page - 1) * 100 + 1;

		goto(`/records/${id}?page=${page}`, { replaceState: true });
	}
</script>

<header class="text-center mt-12">
	<h4>{id} — {totalHistory} records</h4>
	<h5>{period} — {valueUnit}</h5>
</header>

{#if historyData.length > 0}
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

	<RecordHistoryChart data={historyData} />

	<div class="p-10">
		<table class="w-full text-xs border p-2">
			<thead>
				<tr class="border-b">
					<th>No</th>
					<th>Interval</th>

					<th>Description</th>
					<th>Value</th>

					<th>Significance</th>
					<th />
				</tr>
			</thead>
			<tbody>
				{#each historyData as record, i}
					<tr class="border-b hover:bg-mid-warm-grey">
						<td>{currentStartRecordIndex + i}</td>
						<td>{record.interval}</td>

						<td>{record.description}</td>
						<td class="font-mono">{record.value}</td>

						<td>{record.significance}</td>

						<td>
							<!-- <a
								class="block m-1 p-1 border text-mid-grey bg-light-warm-grey"
								href="/records/{encodeURIComponent(record.record_id)}"
							>
								History
							</a> -->
							<span class="text-xxs italic">Link to Tracker Data</span>
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
