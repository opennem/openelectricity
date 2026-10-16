<script>
	import { fade, fly } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import X from '@lucide/svelte/icons/x';

	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';
	import FilterPill from './FilterPill.svelte';
	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import { BELOW_TABLET_QUERY } from '$lib/utils/fullscreen-mode.js';

	/**
	 * Shared chrome for the filter dropdowns: pill trigger, portalled panel
	 * with outside-click/scroll close, and a footer whose Apply button commits
	 * the caller's staged changes (via `onapply`) and closes the panel;
	 * dismissing any other way discards them.
	 *
	 * The footer only renders when `onapply`/`footerLeft` is passed (the
	 * button spans it when there's no `footerLeft`) —
	 * immediate-apply consumers (e.g. the explorer's single-select
	 * RegionDropdown) skip it and instead call the `close` function handed to
	 * the `children` snippet when a pick lands.
	 *
	 * `trigger` replaces the pill with the caller's own button (e.g. a table
	 * header); it receives the open state and the toggle. Its wrapper anchors
	 * the panel and counts as inside for outside-click dismissal.
	 *
	 * Below 768px the panel opens as a bottom sheet over a backdrop instead
	 * (titled with `title`, else `label`, centred like the other phone filter
	 * sheets; drag down, tap outside or ✕ to dismiss), `sheetPeek` of the
	 * screen tall. The popover is kept inside the viewport, and its body
	 * scrolls when the content is taller than the space below the trigger.
	 * Escape closes either; closing from inside (Apply/Done, ✕, Escape) hands
	 * focus back to the trigger.
	 * @type {{
	 *   label: string,
	 *   title?: string,
	 *   shortLabel?: string,
	 *   badge?: number | string | null,
	 *   active?: boolean,
	 *   compact?: boolean,
	 *   disabled?: boolean,
	 *   panelClass?: string,
	 *   sheetPeek?: number,
	 *   dialog?: boolean,
	 *   onopenchange?: (open: boolean) => void,
	 *   onapply?: () => void,
	 *   applyLabel?: string,
	 *   footerLeft?: import('svelte').Snippet,
	 *   trigger?: import('svelte').Snippet<[{ open: boolean, toggle: () => void }]>,
	 *   children: import('svelte').Snippet<[() => void]>
	 * }}
	 */
	let {
		label,
		/** The phone sheet's heading; the pill label by default. */
		title = undefined,
		/** The pill's label below `lg` (see FilterPill). */
		shortLabel = undefined,
		badge = null,
		active = false,
		compact = false,
		disabled = false,
		/** Extra panel classes, e.g. a min width. The panel fits its content by default. */
		panelClass = '',
		/** The phone sheet's height, as a fraction of the screen. */
		sheetPeek = 0.6,
		/** Label the panel as a dialog named `title` (a panel of options rather
		 *  than a pick list). */
		dialog = false,
		onopenchange,
		onapply,
		/** The footer button's text: Apply commits staged changes; an
		 *  immediate-apply consumer can call it Done. */
		applyLabel = 'Apply',
		footerLeft,
		trigger,
		children
	} = $props();

	let showPanel = $state(false);
	const phone = new MediaQuery(BELOW_TABLET_QUERY);
	let sheetContainerHeight = $state(0);

	/** @type {HTMLElement | undefined} */
	let triggerEl = $state();
	/** @type {HTMLElement | undefined} */
	let panelEl = $state();

	function setOpen(/** @type {boolean} */ open) {
		if (showPanel === open) return;
		showPanel = open;
		onopenchange?.(open);
	}

	function handleDocumentClick(/** @type {MouseEvent} */ e) {
		// composedPath (fixed at dispatch time) rather than live contains():
		// a checkbox click can remove the exact node that was clicked (the tick
		// icon swaps out), and by the time this handler runs the detached
		// target no longer counts as "inside the panel" — which closed the
		// panel on an inside click.
		const path = e.composedPath();
		if ((triggerEl && path.includes(triggerEl)) || (panelEl && path.includes(panelEl))) return;
		setOpen(false);
	}

	function handleScroll() {
		setOpen(false);
	}

	/** Close from inside (Done, ✕ or Escape) and hand focus back to the
	 * trigger, so the keyboard picks up where the panel opened. */
	function closeToTrigger() {
		setOpen(false);
		const target = triggerEl?.matches('button') ? triggerEl : triggerEl?.querySelector('button');
		target?.focus();
	}

	/** Escape closes the panel first: caught on the way down and marked
	 * handled, so a sheet the panel sits in (the Tracker's table) stays open.
	 * @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (!showPanel || event.key !== 'Escape') return;
		event.preventDefault();
		closeToTrigger();
	}
</script>

<svelte:window onscroll={handleScroll} onkeydowncapture={handleKeydown} />
<svelte:document onclick={handleDocumentClick} />

<div class="relative">
	{#if trigger}
		<div bind:this={triggerEl}>
			{@render trigger({ open: showPanel, toggle: () => setOpen(!showPanel) })}
		</div>
	{:else}
		<FilterPill
			{label}
			{shortLabel}
			{badge}
			{active}
			open={showPanel}
			{compact}
			{disabled}
			bind:el={triggerEl}
			onclick={() => setOpen(!showPanel)}
		/>
	{/if}

	{#if phone.current}
		<!-- Kept mounted while on a phone so the sheet's exit transition plays. -->
		<div
			use:portal
			class="fixed inset-0 z-[10000] pointer-events-none"
			bind:clientHeight={sheetContainerHeight}
		>
			{#if showPanel && !disabled}
				<div
					class="pointer-events-auto absolute inset-0 bg-black/20"
					aria-hidden="true"
					transition:fade={{ duration: 150 }}
				></div>
			{/if}
			<BottomSheet
				open={showPanel && !disabled}
				onclose={() => setOpen(false)}
				containerHeight={sheetContainerHeight}
				peekFraction={sheetPeek}
				class="pointer-events-auto"
			>
				{#snippet header()}
					<div
						class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-warm-grey px-6 pt-1 pb-3"
					>
						<h3 class="col-start-2 mb-0 text-base">{title ?? label}</h3>
						<button
							type="button"
							class="cursor-pointer justify-self-end rounded-full bg-light-warm-grey p-2 transition-colors hover:bg-warm-grey"
							onclick={closeToTrigger}
							aria-label="Close {title ?? label}"
						>
							<X class="size-5 text-dark-grey" />
						</button>
					</div>
				{/snippet}
				<div
					bind:this={panelEl}
					class="flex min-h-full flex-col"
					role={dialog ? 'dialog' : undefined}
					aria-label={dialog ? (title ?? label) : undefined}
				>
					<div class="flex-1">{@render children(() => setOpen(false))}</div>
					{@render footer()}
				</div>
			</BottomSheet>
		</div>
	{:else if showPanel && !disabled}
		<div
			bind:this={panelEl}
			use:portal
			use:dropdownPosition={{ trigger: triggerEl }}
			role={dialog ? 'dialog' : undefined}
			aria-label={dialog ? (title ?? label) : undefined}
			class="fixed z-50 bg-white border border-mid-warm-grey rounded-lg shadow-md max-w-[340px] flex flex-col overflow-hidden {panelClass}"
			transition:fly={{ y: -5, duration: 150 }}
		>
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
				{@render children(() => setOpen(false))}
			</div>
			{@render footer()}
		</div>
	{/if}
</div>

{#snippet footer()}
	{#if onapply || footerLeft}
		<div
			class="sticky bottom-0 flex items-center gap-4 border-t border-warm-grey bg-white px-4 py-3"
		>
			{@render footerLeft?.()}
			<button
				type="button"
				class="{footerLeft
					? 'ml-auto'
					: 'flex-1'} bg-dark-grey text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-black transition-colors cursor-pointer"
				onclick={() => {
					onapply?.();
					closeToTrigger();
				}}
			>
				{applyLabel}
			</button>
		</div>
	{/if}
{/snippet}
