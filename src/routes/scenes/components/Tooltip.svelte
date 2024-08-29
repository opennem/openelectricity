<script>
	import { formatFyTickX, formatValue } from '$lib/utils/formatters';
	export let hoverData;
	export let hoverKey;
	export let seriesColours;
	export let seriesLabels;
	export let defaultText = '';
	export let showTotal = false;

	$: hoverMax = hoverData ? hoverData._max || 0 : 0;
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
	$: hoverKeyValue =
		hoverData && hoverKey ? /** @type {number} */ (hoverData[hoverKey]) || null : null;
	$: hoverKeyColour = hoverKey ? seriesColours[hoverKey] : '';
	$: hoverKeyLabel = hoverKey ? seriesLabels[hoverKey] : '';
	// $: percent = hoverKeyValue ? (hoverKeyValue / hoverMax) * 100 : 0;
</script>

<div class="h-6">
	{#if hoverData}
		<div class="h-full items-center flex justify-end gap-1 text-xs leading-xs whitespace-nowrap">
			<span class="px-2 py-1 font-light">
				{formatFyTickX(hoverTime)}
			</span>

			{#if hoverKeyValue !== null || showTotal}
				<div class="bg-light-warm-grey px-4 py-1 flex gap-6 items-center">
					{#if hoverKeyValue !== null}
						<div class="flex items-center gap-2">
							<div class="flex items-center gap-2">
								<span class="w-2.5 h-2.5 block" style="background-color: {hoverKeyColour}" />
								{hoverKeyLabel}
							</div>

							<strong class="font-semibold">{formatValue(hoverKeyValue)}</strong>
							<!-- <small>— {formatValue(percent)}%</small> -->
						</div>
					{/if}

					{#if showTotal}
						<span class="flex items-center gap-2">
							Total
							<strong class="font-semibold">{formatValue(hoverMax)}</strong>
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="h-full text-right text-xs text-mid-grey py-1">
			{defaultText}
		</div>
	{/if}
</div>
