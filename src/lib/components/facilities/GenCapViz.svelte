<script>
	/**
	 * @type {{
	 *   capacity: number,
	 *   maxGeneration: number,
	 *   fill?: string
	 * }}
	 */
	let { capacity, maxGeneration, fill = '#000000' } = $props();

	let widthPercent = $derived((maxGeneration / capacity) * 100);
</script>

{#if capacity > 0}
	<div class="h-[4px] flex relative rounded-full bg-warm-grey">
		<div
			class="h-full relative rounded-full"
			style="width: {widthPercent || 0}%; background-color: {fill}"
		></div>
	</div>
{/if}
