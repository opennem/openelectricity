<script>
	/**
	 * PriceChipRow — live regional spot-price chips (price-scale tint +
	 * contrast text + /MWh suffix) with the "as at" dispatch label, shared by
	 * the generation panel's metrics card and the corridor detail's stat block
	 * so the treatment can't drift. Renders nothing when there are no chips
	 * and no dispatch label yet.
	 */

	import {
		contrastText,
		displayCode,
		formatDispatchLabel,
		formatPrice,
		numberOrUndefined
	} from '$lib/flows/format.js';
	import { priceColour } from '$lib/price-scale.js';

	/**
	 * @type {{
	 *   codes?: string[],
	 *   prices?: Record<string, number | null | undefined>,
	 *   dispatchDateTimeString?: string,
	 *   class?: string
	 * }}
	 */
	let { codes = [], prices = {}, dispatchDateTimeString = '', class: className = '' } = $props();

	let chips = $derived(
		codes.flatMap((code) => {
			const price = numberOrUndefined(prices?.[code]);
			if (price === undefined) return [];
			const background = priceColour(price);
			return [{ code, background, colour: contrastText(background), price }];
		})
	);

	let dispatchLabel = $derived(formatDispatchLabel(dispatchDateTimeString));
</script>

{#if chips.length || dispatchLabel}
	<div class="flex items-center justify-between gap-2 {className}">
		<div class="flex flex-wrap items-center gap-1.5">
			{#each chips as chip (chip.code)}
				<span
					class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold leading-4"
					style="background-color: {chip.background}; color: {chip.colour};"
				>
					{displayCode(chip.code)}
					{formatPrice(chip.price)}<span class="font-normal opacity-70">/MWh</span>
				</span>
			{/each}
		</div>
		{#if dispatchLabel}
			<span class="shrink-0 text-[10px] text-mid-grey">as at {dispatchLabel}</span>
		{/if}
	</div>
{/if}
