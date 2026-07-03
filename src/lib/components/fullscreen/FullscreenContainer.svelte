<script>
	/**
	 * FullscreenContainer — the card that wraps the body of a fullscreen page.
	 * Renders an optional `footer` snippet inside the card so the border wraps
	 * it cleanly.
	 *
	 * The card itself is `flex flex-col`. The consumer's `children` content is
	 * the first child and should grow with `flex-1` (and pick its own flex
	 * direction if it needs side-by-side panels).
	 *
	 * @type {{
	 *   class?: string,
	 *   children?: import('svelte').Snippet,
	 *   footer?: import('svelte').Snippet
	 * }}
	 */
	let { class: className = '', children, footer } = $props();
</script>

<section class="relative flex flex-col flex-1 min-h-0 {className}">
	<div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
		{@render children?.()}
		{@render footer?.()}
	</div>
</section>
