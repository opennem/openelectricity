<script>
	import OptionsMenu from '../../../facilities/_components/OptionsMenu.svelte';
	import { ChevronRight } from '@lucide/svelte';
	import { FullscreenFilterBar, FullscreenNavDropdown } from '$lib/components/fullscreen';

	/**
	 * @type {{
	 *   selectedLabel: string,
	 *   selectedCode?: string,
	 *   regionValue?: string | null,
	 *   regionLabel?: string,
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
		isFullscreen = false,
		onfullscreenchange,
		onshowshortcuts,
		onsearchfacilities,
		searchShortcutKeys
	} = $props();

	let crumbTextClass = $derived(isFullscreen ? 'text-sm lg:text-base' : 'text-base lg:text-lg');
	let crumbPadClass = $derived(isFullscreen ? 'px-2 py-1' : 'px-3 py-2');
	let separatorSize = $derived(isFullscreen ? 16 : 18);
</script>

<FullscreenFilterBar {isFullscreen} routeKey="detail">
	{#snippet stable()}
		{#if isFullscreen}
			<FullscreenNavDropdown />
		{/if}
		<a
			href="/facilities?view=list&fullscreen=true"
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
					href={`/facilities?regions=${regionValue}&view=list&fullscreen=true`}
					class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
				>
					{regionLabel}
				</a>
			{/if}

			<ChevronRight size={separatorSize} class="text-mid-grey shrink-0" />

			{#if selectedCode}
				<a
					href={`/facilities?facility=${selectedCode}&view=list&fullscreen=true`}
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
