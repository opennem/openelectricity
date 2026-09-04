<script>
	/**
	 * One row of an OptionsMenu. Pass `selected` to render the row as a radio
	 * choice within its heading's group: the selected row is bold on a tinted
	 * background and carries `aria-checked`; the icon gutter stays blank on
	 * every row so labels align with the icon rows around them.
	 *
	 * @type {{
	 *   icon?: any,
	 *   onclick?: () => void,
	 *   kbd?: string | string[],
	 *   href?: string,
	 *   selected?: boolean,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { icon, onclick, kbd, href, selected = undefined, children } = $props();

	const Icon = $derived(icon);
	const kbdKeys = $derived(kbd ? (Array.isArray(kbd) ? kbd : [kbd]) : null);
	const isRadio = $derived(selected !== undefined);

	const baseRowClass =
		'w-full px-3 py-2 text-xs flex items-center gap-3 transition-colors text-left no-underline hover:no-underline';
	const rowClass = $derived(
		selected
			? `${baseRowClass} bg-warm-grey font-semibold text-black hover:bg-mid-warm-grey`
			: `${baseRowClass} font-medium text-dark-grey hover:bg-light-warm-grey`
	);
</script>

{#snippet inner()}
	{#if Icon}
		<Icon class="size-4 text-mid-grey" />
	{:else}
		<span class="size-4 shrink-0" aria-hidden="true"></span>
	{/if}
	<span class="flex-1">{@render children()}</span>
	{#if kbdKeys}
		<span class="flex items-center gap-0.5 shrink-0">
			{#each kbdKeys as key, i (key)}
				{#if i > 0}
					<span class="text-[10px] text-mid-grey">+</span>
				{/if}
				<kbd
					class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
					>{key}</kbd
				>
			{/each}
		</span>
	{/if}
{/snippet}

{#if href}
	<a {href} target="_blank" rel="noopener noreferrer" class={rowClass}>
		{@render inner()}
	</a>
{:else}
	<button
		{onclick}
		class={rowClass}
		role={isRadio ? 'menuitemradio' : undefined}
		aria-checked={isRadio ? selected : undefined}
	>
		{@render inner()}
	</button>
{/if}
