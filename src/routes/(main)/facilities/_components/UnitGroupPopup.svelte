<script>
	import UnitGroup from './UnitGroup.svelte';

	/**
	 * @typedef {Object} UnitData
	 * @property {string} fueltech_id
	 * @property {string} status_id
	 * @property {boolean} [isCommissioning]
	 * @property {number} capacity_maximum
	 * @property {number} capacity_registered
	 * @property {number} [max_generation]
	 * @property {string} [max_generation_interval]
	 * @property {string} [data_first_seen]
	 * @property {string} [data_last_seen]
	 * @property {string} [bgColor]
	 */

	/**
	 * @type {{
	 *   units: UnitData[],
	 *   network_id?: string
	 * }}
	 */
	let { units, network_id = 'NEM' } = $props();

	let hasMultiple = $derived(units.length > 1);
</script>

<div class="group-hover:block hidden absolute z-30 top-0 right-0">
	<div
		class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[220px] {hasMultiple
			? 'flex flex-col divide-y divide-white/20 [&>*]:py-2 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0'
			: ''}"
	>
		{#each units as unit, i (i)}
			<UnitGroup
				fueltech_id={unit.fueltech_id}
				status_id={unit.status_id}
				isCommissioning={unit.isCommissioning ?? false}
				capacity_maximum={unit.capacity_maximum}
				capacity_registered={unit.capacity_registered}
				max_generation={unit.max_generation ?? 0}
				max_generation_interval={unit.max_generation_interval}
				data_first_seen={unit.data_first_seen}
				data_last_seen={unit.data_last_seen}
				{network_id}
				bgColor={unit.bgColor ?? '#FFFFFF'}
			/>
		{/each}
	</div>
</div>
