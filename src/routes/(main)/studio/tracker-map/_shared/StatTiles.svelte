<script>
	/**
	 * A responsive row of compact stat tiles — dumb and generic. Values arrive
	 * preformatted; the optional accent renders as a small coloured dot.
	 */

	/**
	 * @typedef {Object} StatTile
	 * @property {string} id - Stable key
	 * @property {string} label - Small uppercase label
	 * @property {string} value - Preformatted value string
	 * @property {string} [unit] - Unit suffix rendered after the value
	 * @property {string} [sub] - Secondary line under the value
	 * @property {string} [accent] - CSS colour for the accent dot
	 * @property {string} [title] - Hover tooltip
	 */

	/** @type {{ tiles?: StatTile[] }} */
	let { tiles = [] } = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#each tiles as tile (tile.id)}
		<div
			class="flex min-w-32 flex-1 items-start gap-2 rounded-lg border border-warm-grey bg-white px-3 py-2"
			title={tile.title}
		>
			{#if tile.accent}
				<span class="mt-0.5 size-2 shrink-0 rounded-full" style:background-color={tile.accent}
				></span>
			{/if}
			<div class="min-w-0">
				<div class="text-[10px] tracking-wide text-mid-grey uppercase">{tile.label}</div>
				<div class="font-mono text-base leading-tight text-dark-grey">
					{tile.value}{#if tile.unit}<span class="ml-0.5 text-xs text-mid-grey">{tile.unit}</span
						>{/if}
				</div>
				{#if tile.sub}
					<div class="text-[10px] text-mid-grey">{tile.sub}</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
