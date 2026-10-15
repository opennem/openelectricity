<script>
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import PanelToggle from './PanelToggle.svelte';
	import { getTrackerSheet } from './tracker-sheet.js';

	/**
	 * TrackerPanelHeader — the 48px header every docked tracker panel shares:
	 * the collapse control on the panel's outer edge, the title, and any
	 * panel-specific actions. Left-docked panels put the control last and
	 * right-align the title; right-docked panels put it first.
	 *
	 * In the phone bottom sheet (`getTrackerSheet`) the header is the sheet's
	 * drag handle, and its toggle expands the minimised sheet or minimises it.
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

<div
	{id}
	class="flex h-[48px] shrink-0 items-center gap-[10px] border-b border-warm-grey bg-white px-[4px] {inSheet
		? 'touch-none select-none'
		: ''} {className}"
	data-sheet-handle={inSheet || undefined}
>
	{#if inSheet && sheet}
		{@const label = `${sheet.minimised ? 'Show' : 'Minimise'} ${title.toLowerCase()}`}
		<button
			bind:this={closeButton}
			type="button"
			onclick={sheet.toggle}
			aria-label={label}
			aria-expanded={!sheet.minimised}
			aria-controls={controls}
			class="flex size-[40px] shrink-0 items-center justify-center rounded-md text-mid-grey transition-colors hover:bg-warm-grey active:bg-mid-warm-grey"
		>
			{#if sheet.minimised}
				<ChevronUp class="size-[20px]" strokeWidth={1.5} aria-hidden="true" />
			{:else}
				<ChevronDown class="size-[20px]" strokeWidth={1.5} aria-hidden="true" />
			{/if}
		</button>
	{:else if side === 'right'}
		<PanelToggle {side} open {label} {controls} onclick={onclose} bind:el={closeButton} />
	{/if}
	<h3
		class="m-0 min-w-0 flex-1 truncate text-sm font-semibold {side === 'left' ? 'text-right' : ''}"
	>
		{title}
	</h3>
	{@render children?.()}
	{#if side === 'left' && !inSheet}
		<PanelToggle {side} open {label} {controls} onclick={onclose} bind:el={closeButton} />
	{/if}
</div>
