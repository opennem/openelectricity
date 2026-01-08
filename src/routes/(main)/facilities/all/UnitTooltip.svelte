<script>
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import UnitGroup from './UnitGroup.svelte';

	let { network_id = 'NEM', unit, isCommissioning = false, fill = '#000000' } = $props();

	// Get bgColor from fill prop or look up from fueltech
	let bgColor = $derived(fill || fuelTechColourMap[unit.fueltech_id] || '#6A6A6A');
</script>

<div class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[220px]">
	<UnitGroup
		fueltech_id={unit.fueltech_id}
		status_id={unit.status_id}
		{isCommissioning}
		capacity_maximum={unit.capacity_maximum}
		capacity_registered={unit.capacity_registered}
		max_generation={unit.max_generation}
		max_generation_interval={unit.max_generation_interval}
		data_first_seen={unit.data_first_seen}
		data_last_seen={unit.data_last_seen}
		{network_id}
		{bgColor}
	/>
</div>
