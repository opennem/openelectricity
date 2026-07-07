<script>
	import { fly } from 'svelte/transition';
	import { EllipsisVertical, Maximize2, Minimize2, CircleHelp, BookOpen } from '@lucide/svelte';
	import { portal } from '$lib/actions/portal.js';
	import { dropdownPosition } from '$lib/actions/dropdown-position.js';
	import OptionsMenuItem from './OptionsMenuItem.svelte';
	import OptionsMenuDivider from './OptionsMenuDivider.svelte';

	const DOCS_URL = 'https://docs.openelectricity.org.au/introduction';

	/**
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   triggerClass?: string,
	 *   iconClass?: string,
	 *   sections?: import('svelte').Snippet<[{ close: () => void }]>
	 * }}
	 */
	let {
		isFullscreen = false,
		onfullscreenchange,
		onshowshortcuts,
		// Trigger styling overrides — the defaults are the neutral bar kebab;
		// the mobile facility header passes a dark floating circle instead.
		triggerClass = 'p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer',
		iconClass = 'size-6 text-mid-grey',
		sections
	} = $props();

	let isOpen = $state(false);

	/** @type {HTMLElement | undefined} */
	let triggerRef = $state();
	/** @type {HTMLElement | undefined} */
	let dropdownRef = $state();

	function close() {
		isOpen = false;
	}

	/** @param {MouseEvent} e */
	function handleDocumentClick(e) {
		const target = /** @type {Node} */ (e.target);
		if (triggerRef?.contains(target) || dropdownRef?.contains(target)) return;
		close();
	}
</script>

<svelte:document onclick={handleDocumentClick} />

<div class="relative">
	<button
		bind:this={triggerRef}
		onclick={() => (isOpen = !isOpen)}
		class={triggerClass}
		title="Options"
		aria-haspopup="menu"
		aria-expanded={isOpen}
	>
		<EllipsisVertical class={iconClass} />
	</button>

	{#if isOpen}
		<div
			bind:this={dropdownRef}
			use:portal
			use:dropdownPosition={{ trigger: triggerRef, align: 'right', position: 'bottom' }}
			class="fixed bg-white rounded-lg shadow-lg border border-mid-warm-grey z-[60] min-w-[200px] py-1"
			in:fly={{ y: -5, duration: 150 }}
			role="menu"
		>
			{#if sections}
				{@render sections({ close })}
			{/if}

			{#if onfullscreenchange}
				<OptionsMenuItem
					icon={isFullscreen ? Minimize2 : Maximize2}
					kbd="F"
					onclick={() => {
						onfullscreenchange?.();
						close();
					}}
				>
					{isFullscreen ? 'Exit full screen' : 'Enter full screen'}
				</OptionsMenuItem>
			{/if}

			{#if onshowshortcuts}
				<OptionsMenuItem
					icon={CircleHelp}
					kbd="?"
					onclick={() => {
						onshowshortcuts?.();
						close();
					}}
				>
					Keyboard shortcuts
				</OptionsMenuItem>
			{/if}

			{#if sections || onfullscreenchange || onshowshortcuts}
				<OptionsMenuDivider />
			{/if}

			<OptionsMenuItem icon={BookOpen} href={DOCS_URL}>Documentation</OptionsMenuItem>
		</div>
	{/if}
</div>
