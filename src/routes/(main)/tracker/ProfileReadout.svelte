<script>
	import { OE_RED } from './tracker-overlays.js';

	/**
	 * ProfileReadout — the Profile's linear charts' tooltip strip: the
	 * inspected slot's time on the left, then each value (a swatch, a label and
	 * the value in bold), today's in OE red. Each chart formats the values in
	 * its own units. Idle (`time` null) the strip stays reserved but blank, one
	 * text line tall either way, so the plot below never moves on hover; only
	 * a narrow card's wrapped values grow it.
	 *
	 * @type {{
	 *   time: string | null,
	 *   items?: Array<{label: string, value: string | null, colour: string, today?: boolean}>
	 * }}
	 */
	let { time, items = [] } = $props();
</script>

<div
	data-testid="chart-tooltip-strip"
	class="flex min-h-[23px] items-center justify-end gap-2 text-xs"
>
	{#if time !== null}
		<span class="bg-white/40 px-3 py-1 font-light">{time}</span>
		<span class="flex flex-wrap items-center justify-end gap-x-3 bg-light-warm-grey px-2 py-1">
			{#each items as item (item.label)}
				{@const colour = item.today ? OE_RED : undefined}
				<span class="flex items-center gap-1.5 whitespace-nowrap">
					<span class="size-2.5 rounded-sm" style:background-color={colour ?? item.colour}></span>
					<span class={colour ? '' : 'text-mid-grey'} style:color={colour}>{item.label}</span>
					<strong class="font-semibold" style:color={colour}>{item.value ?? '—'}</strong>
				</span>
			{/each}
		</span>
	{/if}
</div>
