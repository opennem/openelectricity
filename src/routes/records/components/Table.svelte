<script>
	import { formatRecordValue } from '../page-data-options/formatters';
	import FuelTechIcon from './FuelTechIcon.svelte';
	import recordDescription from '../page-data-options/record-description';
	import { xTickValueFormatters } from '../[id]/RecordHistory/helpers/config';
	import { regions } from '../page-data-options/filters';

	let { dataset } = $props();

	/**
	 * Get the region label
	 * @param {string} networkId
	 * @param {string | undefined} networkRegion
	 * @returns {string}
	 */
	function getRegionLabel(networkId, networkRegion) {
		if (networkRegion) {
			return (
				regions.find(({ value }) => value === networkRegion.toLowerCase())?.label || networkRegion
			);
		}
		return regions.find(({ value }) => value === networkId.toLowerCase())?.label || networkId;
	}
</script>

<table class="bg-white text-sm w-full">
	<thead>
		<tr class="border-b border-warm-grey sticky top-0 bg-white/80 backdrop-blur-sm z-10">
			<th></th>
			<th class="px-4 py-4 text-right">Region</th>
			<th></th>
			<th></th>
			<th class="px-4 py-4 text-left">Date/Time</th>
		</tr>
	</thead>

	<tbody>
		{#each dataset as record}
			{@const formattedDate = xTickValueFormatters[record.period].format(
				record.time,
				record.timeZone
			)}
			{@const path = `/records/${encodeURIComponent(record.record_id)}?focusDateTime=${encodeURIComponent(record.interval)}`}
			<tr class="border-b border-warm-grey pointer hover:bg-warm-grey text-mid-grey">
				<td class="px-2 py-2">
					<a href={path} class="text-dark-grey flex items-center gap-2">
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

				<td class="px-2 py-2 font-mono text-xs text-right">
					{getRegionLabel(record.network_id, record.network_region)}
				</td>

				<td class="px-2 py-2 text-right font-mono text-xs">
					{formatRecordValue(record.value, record.fueltech_id)}
				</td>

				<td class="px-2 py-2 font-mono text-xxs">
					{record.value_unit}
				</td>

				<td class="px-2 py-2 font-mono text-xxs">
					<time datetime={record.interval}>
						{formattedDate}
					</time>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
