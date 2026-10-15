<script>
	/**
	 * SeriesLegend — a chart card's colour key, for when nothing else on
	 * screen names the colours (the side table that keys them is closed): a
	 * swatch per visible series (a short line for line and overlay series),
	 * wrapping under the card's switcher. On a narrow card (the card header is
	 * a size container) it shows two rows, with a toggle for the rest when
	 * some are hidden, so a long key doesn't push the chart down a phone.
	 *
	 * @type {{
	 *   items: Array<{ id: string, label: string, colour: string, line?: boolean, dashed?: boolean }>,
	 *   label?: string
	 * }}
	 */
	let { items, label = 'Legend' } = $props();

	let expanded = $state(false);
	/** Some items sit below the two-row cap (narrow cards only). */
	let clipped = $state(false);

	/** @type {import('svelte/attachments').Attachment<HTMLElement>} */
	function measureClip(list) {
		const observer = new ResizeObserver(() => {
			clipped = list.scrollHeight > list.clientHeight + 1;
		});
		observer.observe(list);
		return () => observer.disconnect();
	}
</script>

{#if items.length}
	<ul
		class="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-xxs text-mid-grey {expanded
			? ''
			: '@max-[440px]:max-h-[31px] @max-[440px]:overflow-hidden'}"
		aria-label={label}
		data-testid="series-legend"
		{@attach measureClip}
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
	{#if clipped || expanded}
		<button
			type="button"
			class="touch-hit mt-1 text-xxs text-mid-grey underline decoration-dotted underline-offset-2 hover:text-dark-grey"
			aria-expanded={expanded}
			onclick={() => (expanded = !expanded)}
		>
			{expanded ? 'Show less' : `Show all ${items.length}`}
		</button>
	{/if}
{/if}
