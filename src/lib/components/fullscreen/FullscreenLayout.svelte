<script>
	/**
	 * @type {{
	 *   isFullscreen: boolean,
	 *   onexitfullscreen?: () => void,
	 *   onescape?: (ev: KeyboardEvent) => void,
	 *   class?: string,
	 *   header?: import('svelte').Snippet,
	 *   filterBar?: import('svelte').Snippet,
	 *   content?: import('svelte').Snippet
	 * }}
	 */
	let {
		isFullscreen,
		onexitfullscreen,
		onescape,
		class: className = '',
		header,
		filterBar,
		content
	} = $props();

	/** @param {KeyboardEvent} ev */
	function handleKeydown(ev) {
		if (!isFullscreen || ev.key !== 'Escape') return;
		if (onescape) onescape(ev);
		else onexitfullscreen?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class={isFullscreen ? `h-dvh flex flex-col ${className}` : className}>
	{#if isFullscreen && header}
		{@render header()}
	{/if}
	{@render filterBar?.()}
	{@render content?.()}
</div>
