<script>
	import { X } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { Backdrop } from '$lib/components/ui/backdrop';
	import StratifyButton from './StratifyButton.svelte';

	/**
	 * @type {{
	 *   open: boolean,
	 *   title: string,
	 *   description: string,
	 *   onclose: () => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { open, title, description, onclose, children } = $props();

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (open && event.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Backdrop {open} onclick={onclose} />

{#if open}
	<div
		use:portal
		class="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
	>
		<div
			class="pointer-events-auto flex h-full max-h-[900px] w-full max-w-[1400px] flex-col overflow-hidden rounded-lg bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<header
				class="flex shrink-0 items-center justify-between border-b border-warm-grey px-5 py-4 md:px-7"
			>
				<div>
					<h2 class="mb-0 text-lg font-semibold text-dark-grey">{title}</h2>
					<p class="mb-0 mt-1 text-xs text-mid-grey">{description}</p>
				</div>
				<button
					type="button"
					class="rounded-md p-2 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey focus:outline-none focus:ring-2 focus:ring-red"
					onclick={onclose}
					aria-label="Close {title.toLowerCase()}"
				>
					<X size={20} />
				</button>
			</header>

			<div class="flex min-h-0 flex-1 flex-col p-5 md:p-7">
				{@render children()}
			</div>

			<footer class="flex shrink-0 justify-end border-t border-warm-grey px-5 py-4 md:px-7">
				<StratifyButton variant="primary" onclick={onclose}>Done</StratifyButton>
			</footer>
		</div>
	</div>
{/if}
