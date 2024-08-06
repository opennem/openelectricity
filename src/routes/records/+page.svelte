<script>
	import { onMount } from 'svelte';

	let data = [];
	let totalRecords = 0;

	onMount(() => {
		fetchRecords();
	});

	async function fetchRecords() {
		const res = await fetch(`/api/records`);
		const jsonData = await res.json();
		data = jsonData.data;
		totalRecords = jsonData.total_records;
		console.log('jsonData', jsonData);
	}
</script>

<h3>Records ({data.length} / {totalRecords})</h3>

{#if data.length > 0}
	<div class="p-10">
		<table class="w-full text-xs border p-2">
			<thead>
				<tr class="border-b">
					<th>No</th>
					<th>Interval</th>

					<th>Record ID</th>
					<th>Description</th>
					<th>Value</th>
					<th>Value Unit</th>
					<th>Network</th>
					<th>Region</th>
					<th>Metric</th>
					<th>Aggregate</th>
					<th>Significance</th>
				</tr>
			</thead>
			<tbody>
				{#each data as record, i}
					<tr class="border-b hover:bg-mid-warm-grey">
						<td>{i + 1}</td>
						<td>{record.interval}</td>

						<td>{record.record_id}</td>
						<td>{record.description}</td>
						<td>{record.value}</td>
						<td>{record.value_unit}</td>

						<td>{record.network_id}</td>
						<td>{record.network_region}</td>

						<td>{record.metric}</td>
						<td>{record.aggregate}</td>
						<td>{record.significance}</td>
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
