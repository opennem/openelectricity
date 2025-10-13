<script>
	let { unit, fill = '#000000' } = $props();

	// convert to number
	let capMax = $derived(Number(unit.capacity_maximum));
	let capReg = $derived(Number(unit.capacity_registered));
	let genMax = $derived(Number(unit.max_generation));
	let statusId = $derived(unit.status_id);
	let fuelTechId = $derived(unit.fueltech_id);

	let hasGenMax = $derived(genMax > 0);
	let hasCapMax = $derived(capMax > 0);
	let hasCapReg = $derived(capReg > 0);

	let widthPercent = $derived((genMax / (capMax || capReg)) * 100);
</script>

{#if hasCapMax || hasGenMax}
	<div class="h-[4px] w-full overflow-hidden relative" style="background-color: {fill}33">
		<div
			class="h-full relative"
			style="width: {widthPercent || 0}%; background-color: {fill}"
		></div>
	</div>
{/if}
