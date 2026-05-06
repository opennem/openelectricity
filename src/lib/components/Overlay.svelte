<script>
	import { fade } from 'svelte/transition';
	import { portal } from '$lib/actions/portal.js';
	import { Backdrop } from '$lib/components/ui/backdrop';

	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 * @property {() => void} [onclose]
	 */

	/** @type {Props} */
	let { children, onclose } = $props();
</script>

<Backdrop open onclick={() => onclose?.()} duration={25} />

<div
	use:portal
	class="fixed inset-0 z-[9999] overflow-y-auto"
	role="dialog"
	aria-modal="true"
	transition:fade={{ duration: 25 }}
>
	<div class="flex min-h-full items-center justify-center p-4 sm:p-0">
		{@render children?.()}
	</div>
</div>
