<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { parseISO } from 'date-fns';

	import RecordHistoryChart from '../components/RecordHistoryChart.svelte';

	export let data;

	let historyData = [];
	let totalHistory = 0;
	let valueUnit = '';
	let period = '';

	let currentPage = data.page || 1;
	let currentStartRecordIndex = (currentPage - 1) * 100 + 1;

	let issueInstanceIds = [];

	$: console.log('issueInstanceIds', issueInstanceIds);

	$: id = data.id;
	$: totalPages = Math.ceil(totalHistory / 100);
	$: currentLastRecordIndex = currentStartRecordIndex + 99;
	$: lastRecordIndex =
		currentLastRecordIndex > totalHistory ? totalHistory : currentLastRecordIndex;
	$: fetchRecord(id, currentPage);

	$: timeSeriesData = historyData
		.map((record) => {
			const date = parseISO(record.interval);
			return {
				...record,
				date,
				time: date.getTime(),
				value: record.value
			};
		})
		.sort((a, b) => b.time - a.time);

	$: aggregate = historyData[0]?.aggregate;

	$: {
		issueInstanceIds = [];

		timeSeriesData.forEach((d, i) => {
			const current = d.value;
			const next = timeSeriesData[i + 1]?.value;

			// High peak check - if the current value is lower than the next value
			if (aggregate === 'high' && next && current < next) {
				issueInstanceIds.push(d.instance_id);
			}

			// Low peak check - if the current value is higher than the next value
			if (aggregate === 'low' && next && current > next) {
				issueInstanceIds.push(d.instance_id);
			}
		});
	}

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

	$: hasIssue = (id) => {
		return issueInstanceIds.includes(id);
	};
</script>

<header class=" my-12 mx-10 pb-12 flex justify-center border-b border-mid-warm-grey items-center">
	<div class="text-center">
		<h5>{id} — {totalHistory} records</h5>
		<h6>{period} — {valueUnit}</h6>
	</div>
	<!-- <div>
		<button
			class="border rounded py-1 px-4 bg-light-warm-grey font-semibold"
			on:click={() => updateCurrentPage(currentPage + 1)}
		>
			Check data
		</button>
	</div> -->
</header>

{#if timeSeriesData.length > 0}
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

	<RecordHistoryChart data={[...timeSeriesData].reverse()} {issueInstanceIds} />

	<div class="p-10">
		<table class="w-full text-xs border p-2">
			<thead>
				<tr class="border-b">
					<!-- <th>No</th> -->
					<th>Interval</th>

					<th>Description</th>
					<th>Value</th>

					<!-- <th>Significance</th> -->
					<th>Instance</th>
					<!-- <th /> -->
				</tr>
			</thead>
			<tbody>
				{#each timeSeriesData as record, i}
					<tr
						class:bg-error-red={hasIssue(record.instance_id)}
						class:text-white={hasIssue(record.instance_id)}
						class="border-b hover:bg-mid-warm-grey"
					>
						<!-- <td>{currentStartRecordIndex + i}</td> -->
						<td>{record.interval}</td>

						<td>{record.description}</td>
						<td class="font-mono">{record.value}</td>

						<!-- <td>{record.significance}</td> -->
						<td>{record.instance_id}</td>

						<!-- <td>
							<span class="text-xxs italic">Link to Tracker Data</span>
						</td> -->
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
