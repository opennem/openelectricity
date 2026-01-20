<script>
	/**
	 * @typedef {Object} Props
	 * @property {boolean} [disabled]
	 * @property {() => void} [onclick]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { disabled = false, onclick, children, ...rest } = $props();
</script>

<button
	{onclick}
	class="button rounded-lg border-solid border border-black p-3 font-space appearance-none font-medium bg-white hover:bg-dark-grey text-dark-grey hover:text-white {rest.class}"
	{disabled}
>
	{@render children?.()}
</button>
