<script>
	import { getContext } from 'svelte';
	import formatDateBasedOnInterval from '$lib/utils/formatters-data-interval';

	const { selectedInterval } = getContext('filters');

	export let hoverData;
	export let hoverKey;
	export let seriesColours;
	export let seriesLabels;
	export let defaultText = '';
	export let showTotal = false;
	export let yearOnly = false;

	/** @type {Function} */
	export let convertAndFormatValue = (/** @type {number} */ value) => value;

	$: hoverMax = hoverData ? hoverData._max || 0 : 0;

	$: convertedMax = hoverMax || hoverMax === 0 ? convertAndFormatValue(hoverMax) : NaN;

	$: hoverDate = hoverData ? hoverData.date || undefined : undefined;

	$: hoverKeyValue =
		hoverData && hoverKey ? /** @type {number} */ (hoverData[hoverKey]) || null : null;

	$: convertedValue =
		hoverKeyValue || hoverKeyValue === 0 ? convertAndFormatValue(hoverKeyValue) : NaN;

	$: hoverKeyColour = hoverKey ? seriesColours[hoverKey] : '';

	$: hoverKeyLabel = hoverKey ? seriesLabels[hoverKey] : '';
</script>

<div class="h-[21px]">
	{#if hoverData}
		<div class="h-full items-center flex justify-end text-xs leading-xs whitespace-nowrap">
			<span class="px-3 py-1 font-light bg-white/40">
				{#if yearOnly}
					{formatDateBasedOnInterval(hoverDate)}
				{:else}
					{formatDateBasedOnInterval(hoverDate, $selectedInterval)}
				{/if}
			</span>

			{#if hoverKeyValue !== null || showTotal}
				<div class="bg-light-warm-grey px-4 py-1 flex gap-6 items-center">
					{#if hoverKeyValue !== null}
						<div class="flex items-center gap-2">
							<div class="flex items-center gap-2">
								<span class="w-2.5 h-2.5 block" style="background-color: {hoverKeyColour}" />
								{hoverKeyLabel}
							</div>

							<strong class="font-semibold">{convertedValue}</strong>
						</div>
					{/if}

					{#if showTotal}
						<span class="flex items-center gap-2">
							Total
							<strong class="font-semibold">{convertedMax}</strong>
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
