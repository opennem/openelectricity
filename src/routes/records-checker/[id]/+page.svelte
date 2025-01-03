<script>
	import { run } from 'svelte/legacy';

	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { parseISO } from 'date-fns';

	import RecordHistoryChart from '../components/RecordHistoryChart.svelte';

	let { data } = $props();

	let historyData = $state([]);
	let totalHistory = $state(0);
	let valueUnit = $state('');
	let period = $state('');

	let currentPage = $state(data.page || 1);
	let currentStartRecordIndex = $state((currentPage - 1) * 100 + 1);

	let issueInstanceIds = $state([]);






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


	// remove seconds and time difference from timestamp
	function removeSeconds(timestamp) {
		return timestamp.slice(0, -9);
	}

	const auNumber = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 0
	});
	let timeSeriesData = $derived(historyData
		.map((record) => {
			const date = parseISO(record.interval);
			return {
				...record,
				date,
				time: date.getTime(),
				value: record.value
			};
		})
		.sort((a, b) => b.time - a.time));
	let aggregate = $derived(historyData[0]?.aggregate);
	run(() => {
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
	});
	run(() => {
		console.log('issueInstanceIds', issueInstanceIds);
	});
	let id = $derived(data.id);
	let totalPages = $derived(Math.ceil(totalHistory / 100));
	let currentLastRecordIndex = $derived(currentStartRecordIndex + 99);
	let lastRecordIndex =
		$derived(currentLastRecordIndex > totalHistory ? totalHistory : currentLastRecordIndex);
	run(() => {
		fetchRecord(id, currentPage);
	});
	let hasIssue = $derived((id) => {
		return issueInstanceIds.includes(id);
	});
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
			onclick={() => updateCurrentPage(currentPage - 1)}>Previous</button
		>
		<div class="text-xs text-center">
			Page {currentPage} of {totalPages}
			<br />
			({currentStartRecordIndex} to {lastRecordIndex})
		</div>
		<button
			class="border rounded text-xs py-1 px-4"
			class:invisible={currentPage === totalPages}
			onclick={() => updateCurrentPage(currentPage + 1)}>Next</button
		>
	</div>

	<RecordHistoryChart data={[...timeSeriesData].reverse()} {issueInstanceIds} />

	<div class="p-10">
		<table class="w-full text-xs border border-mid-warm-grey p-2">
			<thead>
				<tr class="border-b border-mid-warm-grey">
					<th colspan="2" class="!text-center">Current Record</th>
					<th></th>
				</tr>
			</thead>

			<thead>
				<tr class="border-b border-mid-warm-grey">
					<!-- <th>No</th> -->
					<th>Interval</th>
					<th class="!text-right">Value & unit</th>

					<!-- <th>Significance</th> -->
					<th class="!text-right">Instance</th>
					<!-- <th /> -->
				</tr>
			</thead>
			<tbody>
				{#each timeSeriesData as record, i}
					<tr
						class:bg-error-red={hasIssue(record.instance_id)}
						class:text-white={hasIssue(record.instance_id)}
						class="border-b border-mid-warm-grey hover:bg-warm-grey"
					>
						<!-- <td>{currentStartRecordIndex + i}</td> -->
						<td class="font-mono text-dark-grey">
							{removeSeconds(record.interval)}
						</td>
						<td>
							<div class="flex justify-end gap-1">
								<span class="font-mono text-black">{auNumber.format(record.value)}</span>
								<span class="text-mid-grey">{record.value_unit}</span>
							</div>
						</td>

						<!-- <td>{record.significance}</td> -->
						<td class="!text-right">{record.instance_id}</td>

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
		@apply border-r border-mid-warm-grey p-1 align-top text-left;
	}
</style>
