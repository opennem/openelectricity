<script>
	import { parseISO, format } from 'date-fns';
	import { browser } from '$app/environment';
	import { formatValue } from '$lib/utils/formatters.js';

	export let data;

	/** @type {MilestoneRecord[]} */
	let historyData = [];
	let totalHistory = 0;

	$: id = data.id;
	$: fetchRecord(id);
	$: console.log('id', id);
	$: console.log('historyData', historyData);
	$: console.log('sortedHistoryData', sortedHistoryData);
	$: currentRecord = sortedHistoryData.length ? sortedHistoryData[0] : null;
	$: previousRecord =
		sortedHistoryData.length && sortedHistoryData.length > 1 ? sortedHistoryData[1] : null;

	$: sortedHistoryData = historyData
		.map((record) => {
			const date = parseISO(record.interval);
			return {
				...record,
				date,
				time: date.getTime()
			};
		})
		.sort((a, b) => b.time - a.time);

	/**
	 * Fetch a single record
	 * @param {string} recordId
	 * @param {number} page
	 */
	async function fetchRecord(recordId, page = 1) {
		if (browser) {
			const id = encodeURIComponent(recordId);
			const res = await fetch(`/api/records/${id}?page=${page}`);
			const jsonData = await res.json();

			historyData = jsonData.data;
			totalHistory = jsonData.total_records;
		}
	}
</script>

<div class="container py-12">
	<header class="grid grid-cols-10 gap-10 mb-10">
		<div class="col-span-6 flex flex-col">
			<span>{currentRecord?.fueltech_id}</span>
			<span class="text-lg">{currentRecord?.description}</span>
			<span>{currentRecord?.period}</span>
		</div>

		<div class="col-span-4 grid grid-cols-2 divide-x divide-light-warm-grey bg-white">
			<div class="p-6">
				<h6>Previous Record</h6>
				<div>
					<span class="text-3xl">{formatValue(previousRecord?.value)}</span>
					<span>{previousRecord?.value_unit}</span>
				</div>

				<div>
					<time datetime={previousRecord?.interval}>
						<span class="text-dark-grey">
							{previousRecord ? format(previousRecord?.date, 'd MMM yyyy') : ''}
						</span>
						<span class="text-xs text-mid-grey">
							{previousRecord ? format(previousRecord?.date, 'h:mma') : ''}
						</span>
					</time>
				</div>
			</div>
			<div class="p-6">
				<span>Current Record</span>

				<div>
					<span class="text-3xl">{formatValue(currentRecord?.value)}</span>
					<span>{currentRecord?.value_unit}</span>
				</div>

				<div>
					<time datetime={currentRecord?.interval}>
						<span class="text-dark-grey">
							{currentRecord ? format(currentRecord?.date, 'd MMM yyyy') : ''}
						</span>
						<span class="text-xs text-mid-grey">
							{currentRecord ? format(currentRecord?.date, 'h:mma') : ''}
						</span>
					</time>
				</div>
			</div>
		</div>
	</header>

	<main class="grid grid-cols-10 gap-10">
		<div class="col-span-6 bg-white p-16 h-[500px]">chart</div>

		<table class="col-span-4 bg-white text-sm">
			<thead>
				<tr>
					<th class="px-4 py-2 text-left">Date & Time</th>
					<th class="px-4 py-2 text-right">{currentRecord?.value_unit}</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedHistoryData as record}
					<tr class="border-b border-light-warm-grey">
						<td class="px-4 py-2">{format(record.date, 'd MMM yyyy, h:mma')}</td>
						<td class="px-4 py-2 text-right">{formatValue(record.value)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</main>
</div>
