<script>
	import PanelToggle from './PanelToggle.svelte';

	/**
	 * TrackerPanelHeader — the 48px header every docked tracker panel shares:
	 * the collapse control on the panel's outer edge, the title, and any
	 * panel-specific actions. Left-docked panels put the control last and
	 * right-align the title; right-docked panels put it first.
	 *
	 * @type {{
	 *   side: 'left' | 'right',
	 *   title: string,
	 *   label: string,
	 *   controls: string,
	 *   onclose: () => void,
	 *   closeButton?: HTMLButtonElement,
	 *   id?: string,
	 *   class?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let {
		side,
		title,
		label,
		controls,
		onclose,
		closeButton = $bindable(),
		id = undefined,
		class: className = '',
		children
	} = $props();
</script>

<div
	{id}
	class="flex h-[48px] shrink-0 items-center gap-[10px] border-b border-warm-grey bg-white px-[4px] {className}"
>
	{#if side === 'right'}
		<PanelToggle {side} open {label} {controls} onclick={onclose} bind:el={closeButton} />
	{/if}
	<h3
		class="m-0 min-w-0 flex-1 truncate text-sm font-semibold {side === 'left' ? 'text-right' : ''}"
	>
		{title}
	</h3>
	{@render children?.()}
	{#if side === 'left'}
		<PanelToggle {side} open {label} {controls} onclick={onclose} bind:el={closeButton} />
	{/if}
</div>
