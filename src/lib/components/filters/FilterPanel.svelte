<script>
	import { fly } from 'svelte/transition';

	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';
	import FilterPill from './FilterPill.svelte';

	/**
	 * Shared chrome for the filter dropdowns: pill trigger, portalled panel
	 * with outside-click/scroll close, and a footer whose Apply button commits
	 * the caller's staged changes (via `onapply`) and closes the panel;
	 * dismissing any other way discards them.
	 *
	 * The footer only renders when `onapply`/`footerLeft` is passed —
	 * immediate-apply consumers (e.g. the explorer's single-select
	 * RegionDropdown) skip it and instead call the `close` function handed to
	 * the `children` snippet when a pick lands.
	 *
	 * `trigger` replaces the pill with the caller's own button (e.g. a table
	 * header); it receives the open state and the toggle. Its wrapper anchors
	 * the panel and counts as inside for outside-click dismissal.
	 * @type {{
	 *   label: string,
	 *   shortLabel?: string,
	 *   badge?: number | string | null,
	 *   active?: boolean,
	 *   compact?: boolean,
	 *   disabled?: boolean,
	 *   panelClass?: string,
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
		/** The pill's label below `lg` (see FilterPill). */
		shortLabel = undefined,
		badge = null,
		active = false,
		compact = false,
		disabled = false,
		/** Extra panel classes, e.g. a min width. The panel fits its content by default. */
		panelClass = '',
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
</script>

<svelte:window onscroll={handleScroll} />
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

	{#if showPanel && !disabled}
		<div
			bind:this={panelEl}
			use:portal
			use:dropdownPosition={{ trigger: triggerEl }}
			class="fixed z-50 bg-white border border-mid-warm-grey rounded-lg shadow-md max-w-[340px] flex flex-col overflow-hidden {panelClass}"
			transition:fly={{ y: -5, duration: 150 }}
		>
			{@render children(() => setOpen(false))}

			{#if onapply || footerLeft}
				<div class="border-t border-warm-grey px-4 py-3 flex items-center gap-4">
					{@render footerLeft?.()}
					<button
						type="button"
						class="ml-auto bg-dark-grey text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-black transition-colors cursor-pointer"
						onclick={() => {
							onapply?.();
							setOpen(false);
						}}
					>
						{applyLabel}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
