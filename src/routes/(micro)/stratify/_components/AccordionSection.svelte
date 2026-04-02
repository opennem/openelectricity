<script>
	import { slide } from 'svelte/transition';

	/**
	 * @type {{
	 *   label: string,
	 *   open: boolean,
	 *   ontoggle: () => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { label, open, ontoggle, children } = $props();
</script>

<div class="flex flex-col shrink-0 border-t border-warm-grey">
	<button
		type="button"
		class="flex items-center gap-2 w-full px-4 py-2 border-b border-warm-grey bg-warm-grey
			text-[11px] font-bold text-dark-grey uppercase tracking-wide
			hover:bg-mid-warm-grey/50 transition-colors shrink-0 text-left cursor-pointer"
		onclick={ontoggle}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="10"
			height="10"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="transition-transform duration-150 {open ? 'rotate-90' : ''}"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
		{label}
	</button>

	{#if open}
		<div transition:slide={{ duration: 150 }} class="p-4 bg-light-warm-grey/50">
			{@render children()}
		</div>
	{/if}
</div>
