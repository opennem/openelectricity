<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [href]
	 * @property {string} [target]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { href = '', target = '_self', children, ...rest } = $props();
</script>

<a
	class={`flex gap-6 justify-between items-center rounded-lg font-space border border-black border-solid bg-white p-6 transition-all text-black hover:text-white hover:bg-black hover:no-underline ${
		rest.class || ''
	}`}
	{href}
	{target}
>
	{@render children?.()}
</a>
