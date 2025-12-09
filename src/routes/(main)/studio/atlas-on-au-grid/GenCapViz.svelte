<script>
	let { unit, fill = '#000000' } = $props();

	// convert to number
	let capMax = $derived(Number(unit.capacity_maximum));
	let capReg = $derived(Number(unit.capacity_registered));
	let genMax = $derived(Number(unit.max_generation));

	let hasGenMax = $derived(genMax > 0);
	let hasCapMax = $derived(capMax > 0);

	let widthPercent = $derived((genMax / (capMax || capReg)) * 100);
</script>

{#if hasCapMax || hasGenMax}
	<div class="ml-10 mt-2">
		<div class="h-[4px] flex relative rounded-full bg-warm-grey">
			<div
				class="h-full relative rounded-full"
				style="width: {widthPercent || 0}%; background-color: {fill}"
			></div>
		</div>
	</div>
{/if}
