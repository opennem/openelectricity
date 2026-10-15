<script>
	import { hasTouchControls } from '$lib/components/ui/touch-controls.js';

	/**
	 * A group label in an OptionsMenu. In a touch-controls subtree its icon
	 * gutter matches the rows' on phones, so labels stay aligned.
	 * @type {{
	 *   icon?: any,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { icon, children } = $props();

	const Icon = $derived(icon);
	const touch = hasTouchControls();
	const gutter = touch ? 'max-tablet:size-[18px]' : '';
</script>

<div
	class="px-3 py-2 text-[10px] font-space text-mid-grey uppercase tracking-wider flex items-center gap-3 {touch
		? 'max-tablet:px-4 max-tablet:text-xxs'
		: ''}"
>
	{#if Icon}
		<Icon class="size-4 shrink-0 text-mid-grey {gutter}" />
	{:else}
		<span class="size-4 shrink-0 {gutter}" aria-hidden="true"></span>
	{/if}
	{@render children()}
</div>
