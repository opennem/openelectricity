<script>
	import getContext from '$lib/utils/get-context.js';

	/** @type {{ cxtKey: symbol, defaultText?: string, wrapperStyles?: string }} */
	let { cxtKey, wrapperStyles = '' } = $props();
	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);
	let useData = $derived(cxt.hoverData || cxt.focusData);
	let valueDate = $derived(useData ? useData.date || undefined : undefined);
</script>

{#if useData}
	<div class="h-[25px] bg-white text-xxs rounded-sm border border-warm-grey {wrapperStyles}">
		<div class="h-full items-center flex justify-center whitespace-nowrap">
			{cxt.formatXWithTimeZone(valueDate)}
		</div>
	</div>
{/if}
