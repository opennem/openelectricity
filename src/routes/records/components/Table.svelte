<script>
	import {
		getFormattedDate,
		getFormattedMonth,
		getFormattedDateTime
	} from '$lib/utils/formatters.js';
	import { formatRecordValue } from '../page-data-options/formatters';
	import FuelTechIcon from './FuelTechIcon.svelte';
	import recordDescription from '../page-data-options/record-description';

	export let dataset;

	$: console.log('dataset', dataset);
</script>

<table class="bg-white text-sm w-full">
	<thead>
		<tr class="border-b border-warm-grey sticky top-0 bg-white/80 backdrop-blur-sm z-10">
			<th class="px-4 py-4 text-left">Date</th>
			<th class="px-4 py-4 text-left">Record</th>
			<th />
			<th />
			<th class="px-4 py-4 text-right">Region</th>
		</tr>
	</thead>

	<tbody>
		{#each dataset as record}
			{@const isWem = record.network_id === 'wem'}
			{@const timeZone = isWem ? 'Australia/Perth' : undefined}
			<tr class="border-b border-light-warm-grey pointer hover:bg-warm-grey text-mid-grey">
				<!-- <td class="px-4 py-2">
					<div class="w-1 h-[20px] bg-{record.fueltech_id}" />
				</td> -->
				<td class="px-4 py-2 font-mono text-xs">
					{#if record.period === 'interval'}
						<time datetime={record.interval}>
							{getFormattedDateTime(record.date, 'medium', 'short', timeZone)}
						</time>
					{:else if record.period === 'day'}
						<time datetime={record.interval}>
							{getFormattedDate(record.date, undefined, 'numeric', 'short', 'numeric', timeZone)}
						</time>
					{:else}
						<time datetime={record.interval}>
							{getFormattedMonth(record.date, 'short', timeZone)}
						</time>
					{/if}
				</td>

				<td class="px-4 py-2">
					<a
						href="/records/{encodeURIComponent(record.record_id)}"
						class="text-base text-dark-grey flex items-center gap-4"
					>
						{#if record.fueltech_id}
							<span
								class="bg-{record.fueltech_id} rounded-full p-2 place-self-start"
								class:text-black={record.fueltech_id === 'solar'}
								class:text-white={record.fueltech_id !== 'solar'}
							>
								<FuelTechIcon fuelTech={record.fueltech_id} sizeClass={5} />
							</span>
							<!-- <span class="relative top-[2px] z-0">
								<FuelTechTag
									pxClass="size-12"
									showBgColour={false}
									showText={false}
									iconSize={18}
									fueltech={record.fueltech_id}
								/>
							</span> -->
						{/if}
						{recordDescription(record.period, record.aggregate, record.metric, record.fueltech_id)}
					</a>
				</td>

				<td class="px-4 py-2 text-right font-mono">
					{formatRecordValue(record.value, record.fueltech_id)}
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
