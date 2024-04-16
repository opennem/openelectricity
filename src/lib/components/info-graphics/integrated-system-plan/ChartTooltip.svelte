<script>
	import { formatFyTickX, formatValue } from './helpers.js';
	export let hoverData;
	export let hoverKey;
	export let seriesColours;
	export let seriesLabels;
	export let defaultText = '';

	$: hoverMax = hoverData ? hoverData._max || 0 : 0;
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
	$: hoverKeyValue =
		hoverData && hoverKey ? /** @type {number} */ (hoverData[hoverKey]) || null : null;
	$: hoverKeyColour = hoverKey ? seriesColours[hoverKey] : '';
	$: hoverKeyLabel = hoverKey ? seriesLabels[hoverKey] : '';
</script>

{#if hoverData}
	<div class="flex justify-end gap-1 text-xs leading-xs whitespace-nowrap -mt-8 mr-8">
		<span class="px-2 py-1 font-light">
			{formatFyTickX(hoverTime)}
		</span>

		<div class="bg-light-warm-grey px-4 py-1 flex gap-6 items-center">
			{#if hoverKeyValue !== null}
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 block" style="background-color: {hoverKeyColour}" />
						{hoverKeyLabel}
					</div>

					<strong class="font-semibold">{formatValue(hoverKeyValue)}</strong>
				</div>
			{/if}

			<span class="flex items-center gap-2">
				Total
				<strong class="font-semibold">{formatValue(hoverMax)}</strong>
			</span>
		</div>
	</div>
{:else}
	<div class="text-right text-xs text-mid-grey -mt-8 mr-8">
		{defaultText}
	</div>
{/if}
