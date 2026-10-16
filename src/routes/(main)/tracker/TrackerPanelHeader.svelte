<script>
	import X from '@lucide/svelte/icons/x';
	import PanelToggle from './PanelToggle.svelte';
	import { getTrackerSheet } from './tracker-sheet.js';

	/**
	 * TrackerPanelHeader — the 48px header every docked tracker panel shares:
	 * the collapse control on the panel's outer edge, the title, and any
	 * panel-specific actions. Left-docked panels put the control last and
	 * right-align the title; right-docked panels put it first.
	 *
	 * In the phone sheet (`getTrackerSheet`) it is the sheet's header, laid
	 * out like the filter sheet's: the panel's actions on the left, the title
	 * centred and a round ✕ (named by `label`) that closes the sheet. The
	 * whole header drags the sheet.
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

	const sheet = getTrackerSheet();
	let inSheet = $derived(sheet?.active ?? false);
</script>

{#if inSheet && sheet}
	<div
		{id}
		class="grid shrink-0 touch-none select-none grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-warm-grey bg-white px-[15px] pb-3 pt-0.5 {className}"
		data-sheet-handle
	>
		<div class="flex min-w-0 items-center gap-2 justify-self-start">{@render children?.()}</div>
		<h3 class="m-0 truncate text-base font-semibold">{title}</h3>
		<button
			bind:this={closeButton}
			type="button"
			onclick={sheet.close}
			aria-label={label}
			aria-controls={controls}
			class="cursor-pointer justify-self-end rounded-full bg-light-warm-grey p-2 transition-colors hover:bg-warm-grey"
		>
			<X class="size-5 text-dark-grey" aria-hidden="true" />
		</button>
	</div>
{:else}
	<div
		{id}
		class="flex h-[48px] shrink-0 items-center gap-[10px] border-b border-warm-grey bg-white px-[4px] {className}"
	>
		{#if side === 'right'}
			<PanelToggle {side} open {label} {controls} onclick={onclose} bind:el={closeButton} />
		{/if}
		<h3
			class="m-0 min-w-0 flex-1 truncate text-sm font-semibold {side === 'left'
				? 'text-right'
				: ''}"
		>
			{title}
		</h3>
		{@render children?.()}
		{#if side === 'left'}
			<PanelToggle {side} open {label} {controls} onclick={onclose} bind:el={closeButton} />
		{/if}
	</div>
{/if}
