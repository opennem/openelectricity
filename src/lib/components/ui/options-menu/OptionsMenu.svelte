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
	 *   showDocumentation?: boolean,
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
		showDocumentation = true,
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

	/** Close after an item is chosen. Focus returns to the trigger, as a menu
	 * button's does, so a dialog the item opens restores focus there on close. */
	function closeFromItem() {
		close();
		triggerRef?.focus();
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
		<!-- z-[10000]: the menu portals to <body>, exists only while open and has
		     no backdrop, so it must always beat the app's overlay band — sheets,
		     toasts and tooltips all sit at z-[9999] (e.g. the unit detail sheet,
		     which hosts one of these menus). -->
		<div
			bind:this={dropdownRef}
			use:portal
			use:dropdownPosition={{ trigger: triggerRef, align: 'right', position: 'bottom' }}
			class="fixed bg-white rounded-lg shadow-lg border border-mid-warm-grey z-[10000] min-w-[200px] py-1"
			in:fly={{ y: -5, duration: 150 }}
			role="menu"
		>
			{#if sections}
				{@render sections({ close: closeFromItem })}
			{/if}

			{#if onfullscreenchange}
				<OptionsMenuItem
					icon={isFullscreen ? Minimize2 : Maximize2}
					kbd="F"
					onclick={() => {
						onfullscreenchange?.();
						closeFromItem();
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
						closeFromItem();
					}}
				>
					Keyboard shortcuts
				</OptionsMenuItem>
			{/if}

			{#if showDocumentation}
				<!-- Section snippets end with their own trailing divider, so only the
				     built-in items above need one added here. -->
				{#if onfullscreenchange || onshowshortcuts}
					<OptionsMenuDivider />
				{/if}

				<OptionsMenuItem icon={BookOpen} href={DOCS_URL}>Documentation</OptionsMenuItem>
			{/if}
		</div>
	{/if}
</div>
