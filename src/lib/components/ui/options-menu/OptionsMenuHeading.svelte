<script>
	/**
	 * @type {{
	 *   icon?: any,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { icon, children } = $props();

	const Icon = $derived(icon);
</script>

<div
	class="px-3 py-2 text-[10px] font-space text-mid-grey uppercase tracking-wider flex items-center gap-3"
>
	{#if Icon}
		<Icon class="size-4 text-mid-grey" />
	{:else}
		<span class="size-4 shrink-0" aria-hidden="true"></span>
	{/if}
	<span>{@render children()}</span>
</div>
