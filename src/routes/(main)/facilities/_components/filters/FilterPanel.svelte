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
	 * @type {{
	 *   label: string,
	 *   badge?: number | string | null,
	 *   active?: boolean,
	 *   compact?: boolean,
	 *   onopenchange?: (open: boolean) => void,
	 *   onapply?: () => void,
	 *   footerLeft?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let {
		label,
		badge = null,
		active = false,
		compact = false,
		onopenchange,
		onapply,
		footerLeft,
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
	<FilterPill
		{label}
		{badge}
		{active}
		open={showPanel}
		{compact}
		bind:el={triggerEl}
		onclick={() => setOpen(!showPanel)}
	/>

	{#if showPanel}
		<div
			bind:this={panelEl}
			use:portal
			use:dropdownPosition={{ trigger: triggerEl }}
			class="fixed z-50 bg-white border border-mid-warm-grey rounded-lg shadow-md min-w-[280px] max-w-[340px] flex flex-col overflow-hidden"
			transition:fly={{ y: -5, duration: 150 }}
		>
			{@render children()}

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
					Apply
				</button>
			</div>
		</div>
	{/if}
</div>
