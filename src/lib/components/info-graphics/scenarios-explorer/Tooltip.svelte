<script>
	import { formatFyTickX, formatValue } from './helpers.js';
	/**
	 * @typedef {Object} Props
	 * @property {any} hoverData
	 * @property {any} hoverKey
	 * @property {any} seriesColours
	 * @property {any} seriesLabels
	 * @property {string} [defaultText]
	 * @property {boolean} [showTotal]
	 */

	/** @type {Props} */
	let {
		hoverData,
		hoverKey,
		seriesColours,
		seriesLabels,
		defaultText = '',
		showTotal = false
	} = $props();

	let hoverMax = $derived(hoverData ? hoverData._max || 0 : 0);
	let hoverTime = $derived(hoverData ? hoverData.time || 0 : 0);
	let hoverKeyValue =
		$derived(hoverData && hoverKey ? /** @type {number} */ (hoverData[hoverKey]) || null : null);
	let hoverKeyColour = $derived(hoverKey ? seriesColours[hoverKey] : '');
	let hoverKeyLabel = $derived(hoverKey ? seriesLabels[hoverKey] : '');
	// $: percent = hoverKeyValue ? (hoverKeyValue / hoverMax) * 100 : 0;
</script>

<div class="h-9 mr-10 lg:mr-0">
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
								<span class="w-2.5 h-2.5 block" style="background-color: {hoverKeyColour}"></span>
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
