<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { EllipsisVertical, Maximize2, Minimize2, CircleHelp, BookOpen } from '@lucide/svelte';
	import OptionsMenuItem from './OptionsMenuItem.svelte';
	import OptionsMenuDivider from './OptionsMenuDivider.svelte';

	const DOCS_URL = 'https://docs.openelectricity.org.au/introduction';

	/**
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   sections?: import('svelte').Snippet<[{ close: () => void }]>
	 * }}
	 */
	let { isFullscreen = false, onfullscreenchange, onshowshortcuts, sections } = $props();

	let isOpen = $state(false);

	function close() {
		isOpen = false;
	}
</script>

<div class="relative" use:clickoutside onclickoutside={close}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer"
		title="Options"
	>
		<EllipsisVertical class="size-6 text-mid-grey" />
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[200px] py-1"
			in:fly={{ y: -5, duration: 150 }}
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
