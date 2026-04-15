<script>
	/**
	 * FullscreenLayout — dumb layout shell. Does NOT own any keyboard behaviour.
	 * Consumers handle their own shortcuts (F to toggle fullscreen, ? for a
	 * shortcuts toast, etc.). Esc is deliberately not wired to exit fullscreen;
	 * callers can bind their own `<svelte:window onkeydown>` if needed.
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   onexitfullscreen?: () => void,
	 *   class?: string,
	 *   header?: import('svelte').Snippet,
	 *   filterBar?: import('svelte').Snippet,
	 *   content?: import('svelte').Snippet
	 * }}
	 */
	let {
		isFullscreen,
		onexitfullscreen,
		class: className = '',
		header,
		filterBar,
		content
	} = $props();
</script>

<div class={isFullscreen ? `h-dvh flex flex-col ${className}` : className}>
	{#if isFullscreen && header}
		{@render header()}
	{/if}
	{@render filterBar?.()}
	{@render content?.()}
</div>
