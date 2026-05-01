<script>
	/**
	 * FullscreenContainer — the rounded white card that wraps the body inside a
	 * fullscreen page (and shrinks to the in-page height when the page is not
	 * fullscreen). Renders an optional `footer` snippet inside the card so the
	 * border wraps it cleanly.
	 *
	 * The card itself is `flex flex-col`. The consumer's `children` content is
	 * the first child and should grow with `flex-1` (and pick its own flex
	 * direction if it needs side-by-side panels).
	 *
	 * @type {{
	 *   isFullscreen: boolean,
	 *   class?: string,
	 *   children?: import('svelte').Snippet,
	 *   footer?: import('svelte').Snippet
	 * }}
	 */
	let { isFullscreen, class: className = '', children, footer } = $props();
</script>

<section
	class="relative flex flex-col {isFullscreen
		? 'flex-1 min-h-0'
		: 'px-4 pb-4 md:px-6 md:pb-6 pt-3 md:pt-4 h-[calc(100dvh-214px)] md:h-[calc(100dvh-300px)] md:min-h-[700px]'} {className}"
>
	<div
		class="flex-1 flex flex-col min-h-0 overflow-hidden bg-white {isFullscreen
			? ''
			: 'rounded-lg border border-warm-grey'}"
	>
		{@render children?.()}
		{@render footer?.()}
	</div>
</section>
