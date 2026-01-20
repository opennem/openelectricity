<script>
	/** @type {{ chart: import('$lib/components/charts/v2/ChartStore.svelte.js').default, wrapperStyles?: string }} */
	let { chart, wrapperStyles = '' } = $props();

	let useData = $derived(chart.hoverData || chart.focusData);
	let valueDate = $derived(useData ? useData.date || undefined : undefined);
</script>

{#if useData}
	<div class="h-[25px] bg-white text-xxs rounded-sm border border-warm-grey {wrapperStyles}">
		<div class="h-full items-center flex justify-center whitespace-nowrap">
			{chart.formatXWithTimeZone(valueDate)}
		</div>
	</div>
{/if}
