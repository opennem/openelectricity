<script>
	import { Tooltip } from 'bits-ui';
	import { getNumberFormat } from '$lib/utils/formatters';
	const numberFormatter = getNumberFormat(0);

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
	<!-- <div
		class="h-[4px] w-full overflow-hidden relative rounded-full"
		style="background-color: {fill}33"
	>
		<div
			class="h-full relative"
			style="width: {widthPercent || 0}%; background-color: {fill}"
		></div>
	</div> -->
	<Tooltip.Provider>
		<Tooltip.Root delayDuration={50}>
			<Tooltip.Trigger>
				<div class="h-[4px] mt-2 flex relative rounded-full" style="background-color: {fill}33">
					<div
						class="h-full relative rounded-full"
						style="width: {widthPercent || 0}%; background-color: {fill}"
					></div>
				</div>
			</Tooltip.Trigger>

			<Tooltip.Content sideOffset={4} side="top" strategy="absolute">
				<div
					class="bg-white rounded-lg py-2 px-4 shadow text-dark-grey font-mono text-xs flex items-baseline gap-1"
				>
					{numberFormatter.format(genMax)}
					<small>MW</small>
					({numberFormatter.format(widthPercent)}%)
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
