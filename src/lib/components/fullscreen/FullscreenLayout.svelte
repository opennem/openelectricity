<script>
	/**
	 * FullscreenLayout — dumb layout shell. Does NOT own any keyboard behaviour.
	 * Consumers handle their own shortcuts (F to toggle fullscreen, ? for a
	 * shortcuts toast, etc.). Esc is deliberately not wired to exit fullscreen;
	 * callers can bind their own `<svelte:window onkeydown>` if needed.
	 *
	 * In fullscreen mode the wrapper gets the dotted `gridline-bg` background by
	 * default. Pass `gridline={false}` to opt out.
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   onexitfullscreen?: () => void,
	 *   gridline?: boolean,
	 *   class?: string,
	 *   header?: import('svelte').Snippet,
	 *   filterBar?: import('svelte').Snippet,
	 *   content?: import('svelte').Snippet
	 * }}
	 */
	let {
		isFullscreen,
		onexitfullscreen,
		gridline = true,
		class: className = '',
		header,
		filterBar,
		content
	} = $props();

	let wrapperClass = $derived(
		isFullscreen
			? `h-dvh flex flex-col ${gridline ? 'gridline-bg' : ''} ${className}`.trim()
			: className
	);
</script>

<div class={wrapperClass}>
	{#if isFullscreen && header}
		{@render header()}
	{/if}
	{@render filterBar?.()}
	{@render content?.()}
</div>

<style>
	:global(.gridline-bg) {
		background-image: radial-gradient(circle, #d5d4d1 1px, transparent 1px);
		background-size: 20px 20px;
	}
</style>
