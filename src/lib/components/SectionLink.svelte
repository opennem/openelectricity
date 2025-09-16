<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [href]
	 * @property {string} [title]
	 * @property {string} [classes]
	 * @property {string} [target]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { href = '', title = '', classes = '', target = '_self', children } = $props();
	let hover = $state(false);

	function toggleHover() {
		hover = !hover;
	}
</script>

<a
	class={`flex items-center gap-3 font-bold font-space transition-all text-dark-grey hover:text-red ${classes} hover:no-underline`}
	{href}
	{target}
	onmouseenter={toggleHover}
	onmouseleave={toggleHover}
>
	{title}

	{#if children}{@render children()}{:else}
		<svg
			class="transition-all"
			class:translate-x-1={hover}
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="10"
				cy="10"
				r="9.5"
				fill="white"
				class={`transition-all ${hover ? 'stroke-red' : 'stroke-black'}`}
			/>
			<path
				d="M7.99854 14L12.3319 9.66671L7.99854 5.33337"
				stroke-width="1.5"
				class={`transition-all ${hover ? 'stroke-red' : 'stroke-black'}`}
			/>
		</svg>
	{/if}
</a>
