<script>
	import { format } from 'date-fns';
	import { formatValue } from '$lib/utils/formatters.js';
	import recordDescription from '../page-data-options/record-description';

	export let dataset;

	$: console.log('dataset', dataset);
</script>

<table class="bg-white text-sm w-full">
	<thead>
		<tr>
			<th class="px-4 py-2 text-left">Date</th>
			<th class="px-4 py-2 text-left">Record</th>
			<th />
			<th />
		</tr>
	</thead>
	<tbody>
		{#each dataset as record}
			<tr class="border-b border-light-warm-grey pointer hover:bg-warm-grey">
				<td class="px-4 py-2 font-mono text-dark-grey text-xs">
					{format(record.date, 'dd MMM yyyy')}
					{#if record.period === 'interval'}
						<time datetime={record.interval}>
							{format(record.date, 'h:mma')}
						</time>
					{/if}
				</td>

				<td class="px-4 py-2">
					<a href="/records/{encodeURIComponent(record.record_id)}" class="table-row">
						{recordDescription(record.period, record.aggregate, record.metric, record.fueltech_id)}
					</a>
				</td>

				<td class="px-4 py-2 text-right font-mono text-dark-grey">
					{formatValue(record.value)}
				</td>

				<td class="px-4 py-2 font-mono text-dark-grey">
					{record.value_unit}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<h1>table</h1>
