<script>
	/**
	 * NEM-level region price chips — one per NEM region, tinted by the
	 * system-snapshot price scale. Clicking a chip pushes that region onto the
	 * focus stack (these ARE the region rows of the NEM dock).
	 */
	import { priceColour } from '$lib/components/info-graphics/system-snapshot/helpers.js';
	import {
		contrastText,
		displayCode,
		formatPrice,
		numberOrUndefined
	} from '../../_shared/format.js';
	import { FOCUS_REGIONS } from '../focus-state.js';

	/**
	 * @type {{
	 *   prices?: Record<string, number>,
	 *   onselect?: (regionCode: string) => void
	 * }}
	 */
	let { prices = {}, onselect = undefined } = $props();
</script>

<div class="grid grid-cols-5 gap-1.5">
	{#each FOCUS_REGIONS as code (code)}
		{@const price = numberOrUndefined(prices?.[code])}
		{@const bg = price !== undefined ? priceColour(price) : '#EFEFEF'}
		<button
			type="button"
			class="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-black/10 px-1 py-1.5 transition-transform hover:-translate-y-px hover:shadow-sm"
			style:background-color={bg}
			style:color={contrastText(bg)}
			title="Focus {code}"
			onclick={() => onselect?.(code)}
		>
			<span class="text-[10px] leading-none font-semibold tracking-wide opacity-80">
				{displayCode(code)}
			</span>
			<span class="font-mono text-xs leading-none">
				{price !== undefined ? formatPrice(price) : '—'}
			</span>
		</button>
	{/each}
</div>
