<script>
	/**
	 * SeriesLegend — a chart card's colour key, for when nothing else on
	 * screen names the colours (the side table that keys them is closed): a
	 * swatch per visible series (a short line for line and overlay series),
	 * wrapping under the card's switcher.
	 *
	 * @type {{
	 *   items: Array<{ id: string, label: string, colour: string, line?: boolean, dashed?: boolean }>,
	 *   label?: string
	 * }}
	 */
	let { items, label = 'Legend' } = $props();
</script>

{#if items.length}
	<ul
		class="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-xxs text-mid-grey"
		aria-label={label}
		data-testid="series-legend"
	>
		{#each items as item (item.id)}
			<li class="inline-flex items-center gap-1.5 whitespace-nowrap">
				{#if item.line}
					<span
						aria-hidden="true"
						class="w-3 border-t-2 {item.dashed ? 'border-dashed' : ''}"
						style:border-color={item.colour}
					></span>
				{:else}
					<span
						aria-hidden="true"
						class="size-2.5 shrink-0 rounded-[2px]"
						style:background-color={item.colour}
					></span>
				{/if}
				{item.label}
			</li>
		{/each}
	</ul>
{/if}
