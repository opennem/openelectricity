<script>
	let { cell, x, y } = $props();
</script>

{#if cell}
	<div
		class="pointer-events-none absolute z-50 rounded bg-dark-grey px-3 py-2 text-xs text-white shadow-lg"
		style="left: {x + 12}px; top: {y - 60}px;"
	>
		<div class="font-semibold">{cell.dateFormatted}</div>
		<div class="text-mid-warm-grey">{cell.timeSlot} AEST</div>
		<div class="mt-1 font-semibold">
			{cell.value > 0 ? cell.value.toFixed(1) + '%' : 'No solar'}
		</div>
	</div>
{/if}
