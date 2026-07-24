<script>
	/**
	 * "+ Add chart" — appends a panel from the tracker registry to the dock.
	 * Lists only the panels not currently active; disabled when the full set
	 * is already on the dashboard.
	 */
	import { fly } from 'svelte/transition';
	import { Plus } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';

	/**
	 * @type {{
	 *   available?: import('../../_shared/panels.js').PanelDef[],
	 *   onadd?: (id: string) => void
	 * }}
	 */
	let { available = [], onadd = undefined } = $props();

	let isOpen = $state(false);

	/** @type {HTMLElement | undefined} */
	let triggerRef = $state();
	/** @type {HTMLElement | undefined} */
	let dropdownRef = $state();

	/** @param {MouseEvent} e */
	function handleDocumentClick(e) {
		const target = /** @type {Node} */ (e.target);
		if (triggerRef?.contains(target) || dropdownRef?.contains(target)) return;
		isOpen = false;
	}
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="relative">
	<button
		bind:this={triggerRef}
		onclick={() => (isOpen = !isOpen)}
		disabled={available.length === 0}
		class="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-dashed border-mid-warm-grey text-sm text-mid-grey hover:text-dark-grey hover:border-mid-grey transition-colors disabled:opacity-50 disabled:cursor-default"
		aria-haspopup="menu"
		aria-expanded={isOpen}
	>
		<Plus class="size-4" />
		{available.length === 0 ? 'All charts added' : 'Add chart'}
	</button>

	{#if isOpen && available.length > 0}
		<div
			bind:this={dropdownRef}
			use:portal
			use:dropdownPosition={{ trigger: triggerRef, align: 'left', position: 'bottom' }}
			class="fixed bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-48 py-1 text-sm"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
			role="menu"
		>
			{#each available as panel (panel.id)}
				<button
					class="w-full text-left px-3 py-1.5 mx-0 hover:bg-warm-grey text-dark-grey flex items-baseline justify-between gap-6"
					onclick={() => {
						onadd?.(panel.id);
						isOpen = false;
					}}
				>
					<span>{panel.title}</span>
					{#if panel.unitLabel}
						<span class="text-xs text-mid-grey">{panel.unitLabel}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
