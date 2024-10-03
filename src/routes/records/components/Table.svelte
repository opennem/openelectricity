<script>
	import { format } from 'date-fns';
	import { formatValue } from '$lib/utils/formatters.js';
	import FuelTechTag from '$lib/components/FuelTechTag.svelte';
	import recordDescription from '../page-data-options/record-description';

	export let dataset;

	$: console.log('dataset', dataset);
</script>

<table class="bg-white text-sm w-full">
	<thead>
		<tr class="border-b border-warm-grey sticky top-0 bg-white/80 backdrop-blur-sm z-10">
			<th />
			<th class="px-4 py-4 text-left">Date</th>
			<th class="px-4 py-4 text-left">Record</th>
			<th />
			<th />
			<th class="px-4 py-4 text-right">Region</th>
		</tr>
	</thead>

	<tbody>
		{#each dataset as record}
			<tr class="border-b border-light-warm-grey pointer hover:bg-warm-grey text-mid-grey">
				<td class="px-4 py-2">
					<div class="w-1 h-[20px] bg-{record.fueltech_id}" />
				</td>
				<td class="px-4 py-2 font-mono text-xs">
					{format(record.date, 'dd MMM yyyy')}
					{#if record.period === 'interval'}
						<time datetime={record.interval}>
							{format(record.date, 'h:mma')}
						</time>
					{/if}
				</td>

				<td class="px-4 py-2">
					<a
						href="/records/{encodeURIComponent(record.record_id)}"
						class="text-base text-dark-grey"
					>
						{#if record.fueltech_id}
							<span class="relative top-[2px] z-0">
								<FuelTechTag
									pxClass="size-12"
									showBgColour={false}
									showText={false}
									iconSize={18}
									fueltech={record.fueltech_id}
								/>
							</span>
						{/if}
						{recordDescription(record.period, record.aggregate, record.metric, record.fueltech_id)}
					</a>
				</td>

				<td class="px-4 py-2 text-right font-mono">
					{formatValue(record.value)}
				</td>

				<td class="px-4 py-2 font-mono">
					{record.value_unit}
				</td>

				<td class="px-4 py-2 font-mono text-xxs text-right">
					{record.network_region || record.network_id}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
