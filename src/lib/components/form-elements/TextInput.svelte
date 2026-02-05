<script>
	import { preventDefault } from 'svelte/legacy';

	/**
	 * @typedef {Object} Props
	 * @property {((event: Event, ...args: unknown[]) => void) | null} [changeHandler]
	 * @property {string} [placeholder]
	 * @property {string} [value]
	 * @property {string} [type]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { changeHandler = null, placeholder = '', value = '', type = 'text', ...rest } = $props();
</script>

<input
	{type}
	class={`rounded-md border-solid placeholder:font-light border-[0.05rem] border-mid-warm-grey p-4 font-sans text-sm placeholder:text-mid-warm-grey focus:ring-0 focus:border-dark-grey ${rest.class}`}
	{placeholder}
	{value}
	oninput={preventDefault(/** @type {(event: Event, ...args: unknown[]) => void} */ (changeHandler))}
/>
