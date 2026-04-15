<script>
	import { goto } from '$app/navigation';
	import FullscreenNavDropdown from '$lib/components/fullscreen/FullscreenNavDropdown.svelte';
	import FacilitySearchPopover from '$lib/components/facility/FacilitySearchPopover.svelte';
	import OptionsMenu from '../../../facilities/_components/OptionsMenu.svelte';
	import { PanelRightOpen, PanelRightClose } from '@lucide/svelte';

	/**
	 * @typedef {Object} FacilityListItem
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 */

	/**
	 * @type {{
	 *   facilities: FacilityListItem[],
	 *   selectedLabel: string,
	 *   isFullscreen?: boolean,
	 *   showDescription?: boolean,
	 *   onselect: (code: string) => void,
	 *   ontoggledescription?: () => void,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void
	 * }}
	 */
	let {
		facilities,
		selectedLabel,
		isFullscreen = false,
		showDescription = false,
		onselect,
		ontoggledescription,
		onfullscreenchange,
		onshowshortcuts
	} = $props();

	let searchOpen = $state(false);
</script>

<div
	class="flex items-center justify-between relative z-10 gap-4 pt-3 pb-3 px-4 {isFullscreen
		? 'md:py-3 md:px-4 md:rounded-lg md:border md:border-warm-grey md:bg-light-warm-grey/50'
		: ''}"
>
	<div class="flex items-center gap-4 min-w-0">
		{#if isFullscreen}
			<div class="flex items-center gap-1 shrink-0">
				<button
					onclick={() => onfullscreenchange?.()}
					class="flex items-center cursor-pointer px-2"
					title="Exit full screen"
				>
					<img src="/logo-mark.png" alt="Open Electricity" class="h-8 w-auto" />
				</button>
				<FullscreenNavDropdown />
			</div>
			<div class="h-8 border-l border-warm-grey"></div>
		{/if}

		<FacilitySearchPopover
			{facilities}
			label={selectedLabel}
			bind:open={searchOpen}
			{onselect}
		/>
	</div>

	<div class="flex items-center gap-1 shrink-0">
		{#if ontoggledescription}
			<button
				onclick={ontoggledescription}
				class="p-2 rounded-lg hover:bg-warm-grey text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
				title={showDescription ? 'Hide description' : 'Show description'}
				aria-label={showDescription ? 'Hide description' : 'Show description'}
			>
				{#if showDescription}
					<PanelRightClose size={18} />
				{:else}
					<PanelRightOpen size={18} />
				{/if}
			</button>
		{/if}

		<div class="border-l border-warm-grey {isFullscreen ? 'pl-2 ml-2' : 'pl-4 ml-4'}">
			<OptionsMenu
				{isFullscreen}
				onfullscreenchange={() => onfullscreenchange?.()}
				onshowshortcuts={() => onshowshortcuts?.()}
			/>
		</div>
	</div>
</div>
