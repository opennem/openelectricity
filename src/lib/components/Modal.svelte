<script>
	import { fade } from 'svelte/transition';

	/**
	 * @typedef {Object} Props
	 * @property {string} [maxWidthClass]
	 * @property {import('svelte').Snippet} [children]
	 * @property {import('svelte').Snippet} [buttons]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { maxWidthClass = 'max-w-screen-md', children, buttons, ...rest } = $props();

	let classProps = $derived(rest.class);
</script>

<div
	transition:fade={{ duration: 200 }}
	class={`grid grid-cols-1 content-between relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 shadow-xl transition-all w-full sm:my-8 sm:p-6 ${maxWidthClass} ${classProps}`}
>
	<div class="overflow-y-auto">
		{@render children?.()}
	</div>
	<div class="mt-0 border-t border-warm-grey px-10 py-6">
		{@render buttons?.()}
	</div>
</div>
