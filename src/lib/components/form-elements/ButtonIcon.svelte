<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	/**
	 * @typedef {Object} Props
	 * @property {boolean} [disabled]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { disabled = false, children, ...rest } = $props();
</script>

<button
	onclick={bubble('click')}
	class="button rounded-lg border-solid border border-black p-3 font-space appearance-none text-sm font-medium bg-white hover:bg-dark-grey text-dark-grey hover:text-white {rest.class}"
	{disabled}
>
	{@render children?.()}
</button>
