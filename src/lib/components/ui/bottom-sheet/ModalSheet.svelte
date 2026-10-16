<script>
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import BottomSheet from './BottomSheet.svelte';

	/**
	 * ModalSheet — a phone sheet over a dimmed page, in the chrome of the
	 * Facilities filter sheet: a centred title, a round ✕ and a full-width Done
	 * in the footer. It opens at `fraction` of the viewport with no middle snap:
	 * a drag down either settles back or, past the dismiss line, closes. Done,
	 * ✕, Escape, a tap on the page or a drag down closes it. `class` goes on the
	 * fixed container (`tablet:hidden` keeps a sheet to phones).
	 *
	 * @type {{
	 *   open: boolean,
	 *   onclose: () => void,
	 *   title: string,
	 *   fraction?: number,
	 *   class?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { open, onclose, title, fraction = 0.94, class: className = '', children } = $props();

	let containerHeight = $state(0);

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (open && event.key === 'Escape' && !event.defaultPrevented) onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Kept mounted (pointer-events-none) so the sheet's fly in and out can play. -->
<div class="pointer-events-none fixed inset-0 z-50 {className}" bind:clientHeight={containerHeight}>
	{#if open}
		<!-- A tap on the dimmed page closes the sheet; ✕, Done and Escape are
		     the accessible ways out. -->
		<div
			class="pointer-events-auto absolute inset-0 bg-black/20"
			aria-hidden="true"
			transition:fade={{ duration: 150 }}
			onclick={onclose}
		></div>
	{/if}
	<BottomSheet
		{open}
		{onclose}
		{containerHeight}
		peekFraction={fraction}
		fullFraction={fraction}
		class="pointer-events-auto"
	>
		{#snippet header()}
			<div
				class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-warm-grey px-6 pb-4 pt-2"
			>
				<h2 class="col-start-2 mb-0 text-base">{title}</h2>
				<button
					type="button"
					class="cursor-pointer justify-self-end rounded-full bg-light-warm-grey p-2 transition-colors hover:bg-warm-grey"
					onclick={onclose}
					aria-label="Close {title.toLowerCase()}"
				>
					<X class="size-5 text-dark-grey" />
				</button>
			</div>
		{/snippet}

		{@render children?.()}

		{#snippet footer()}
			<footer class="shrink-0 border-t border-warm-grey bg-white p-4">
				<button
					type="button"
					class="w-full cursor-pointer rounded-lg bg-dark-grey py-4 text-sm font-medium text-white transition-colors hover:bg-black"
					onclick={onclose}
				>
					Done
				</button>
			</footer>
		{/snippet}
	</BottomSheet>
</div>
