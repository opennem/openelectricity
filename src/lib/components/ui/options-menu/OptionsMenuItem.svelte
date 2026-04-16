<script>
	/**
	 * @type {{
	 *   icon?: any,
	 *   onclick?: () => void,
	 *   kbd?: string | string[],
	 *   href?: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { icon, onclick, kbd, href, children } = $props();

	const Icon = $derived(icon);
	const kbdKeys = $derived(kbd ? (Array.isArray(kbd) ? kbd : [kbd]) : null);

	const rowClass =
		'w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left text-dark-grey no-underline hover:no-underline';
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
	<button {onclick} class={rowClass}>
		{@render inner()}
	</button>
{/if}
