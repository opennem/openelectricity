<script>
	import OptionsMenu from '../../../facilities/_components/OptionsMenu.svelte';
	import { ArrowLeft, ChevronRight } from '@lucide/svelte';
	import { FullscreenFilterBar, FullscreenNavDropdown } from '$lib/components/fullscreen';
	import { backToFacilities } from '../../_utils/back-navigation.js';
	import { windowedHref } from '$lib/utils/fullscreen-mode.js';

	/**
	 * @type {{
	 *   selectedLabel: string,
	 *   selectedCode?: string,
	 *   regionValue?: string | null,
	 *   regionLabel?: string,
	 *   regionShortLabel?: string,
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   onsearchfacilities?: () => void,
	 *   searchShortcutKeys?: string[]
	 * }}
	 */
	let {
		selectedLabel,
		selectedCode = '',
		regionValue = null,
		regionLabel = '',
		regionShortLabel = '',
		isFullscreen = true,
		onfullscreenchange,
		onshowshortcuts,
		onsearchfacilities,
		searchShortcutKeys
	} = $props();

	let crumbTextClass = $derived(isFullscreen ? 'text-sm lg:text-base' : 'text-base lg:text-lg');
	let crumbPadClass = $derived(isFullscreen ? 'px-2 py-1' : 'px-3 py-2');
	let separatorSize = $derived(isFullscreen ? 16 : 18);
	// The back arrow sits a step above the crumb separators so it reads as a
	// control (and is easier to hit) rather than punctuation.
	let backIconSize = $derived(isFullscreen ? 20 : 22);
</script>

<FullscreenFilterBar {isFullscreen} routeKey="detail">
	{#snippet back()}
		<!-- History back when there is any; otherwise reopen /facilities with
		     this facility's pane selected. -->
		<button
			type="button"
			class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-dark-grey hover:bg-warm-grey"
			aria-label="Back"
			title="Back"
			onclick={() => backToFacilities(selectedCode, !isFullscreen)}
		>
			<ArrowLeft size={backIconSize} class="shrink-0" />
		</button>
	{/snippet}

	{#snippet stable()}
		{#if isFullscreen}
			<FullscreenNavDropdown />
		{/if}
		<a
			href={windowedHref('/facilities?view=list', !isFullscreen)}
			class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
		>
			Facilities
		</a>
	{/snippet}

	{#snippet rest()}
		<nav class="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
			{#if regionValue && regionLabel}
				<ChevronRight size={separatorSize} class="text-mid-grey shrink-0" />
				<a
					href={windowedHref(`/facilities?regions=${regionValue}&view=list`, !isFullscreen)}
					class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
				>
					<span class="tablet:hidden">{regionShortLabel || regionLabel}</span>
					<span class="hidden tablet:inline">{regionLabel}</span>
				</a>
			{/if}

			<ChevronRight size={separatorSize} class="text-mid-grey shrink-0" />

			{#if selectedCode}
				<a
					href={windowedHref(`/facilities?facility=${selectedCode}&view=list`, !isFullscreen)}
					class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey capitalize no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
				>
					{selectedLabel}
				</a>
			{:else}
				<span class="font-semibold text-dark-grey capitalize {crumbTextClass} {crumbPadClass}">
					{selectedLabel}
				</span>
			{/if}
		</nav>
	{/snippet}

	{#snippet options()}
		<OptionsMenu
			{isFullscreen}
			{onfullscreenchange}
			{onshowshortcuts}
			{onsearchfacilities}
			{searchShortcutKeys}
		/>
	{/snippet}
</FullscreenFilterBar>
