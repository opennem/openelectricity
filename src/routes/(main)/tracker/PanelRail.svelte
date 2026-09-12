<script>
	import PanelToggle from './PanelToggle.svelte';

	/**
	 * PanelRail — the 48px column left behind by a collapsed docked panel,
	 * holding the reopen control at the panel edge and any controls that must
	 * stay reachable while the panel is closed.
	 *
	 * @type {{
	 *   side: 'left' | 'right',
	 *   label: string,
	 *   controls: string,
	 *   onopen: () => void,
	 *   opener?: HTMLButtonElement,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { side, label, controls, onopen, opener = $bindable(), children } = $props();
</script>

<div
	class="z-20 flex w-[48px] shrink-0 flex-col items-center bg-white pt-[4px] {side === 'left'
		? 'border-r border-warm-grey'
		: 'border-l border-warm-grey'}"
>
	<PanelToggle {side} open={false} {label} {controls} onclick={onopen} bind:el={opener} />
	{@render children?.()}
</div>
