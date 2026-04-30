<script>
	import OptionsMenu from '../../../facilities/_components/OptionsMenu.svelte';
	import { ChevronRight } from '@lucide/svelte';
	import { FullscreenNavDropdown } from '$lib/components/fullscreen';

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

<div
	class="flex items-center justify-between relative z-10 gap-4 pt-3 pb-3 px-4 {isFullscreen
		? 'md:py-3 md:px-4 md:rounded-lg md:border md:border-warm-grey md:bg-light-warm-grey/75'
		: ''}"
>
	<div class="flex items-center gap-4 min-w-0">
		{#if isFullscreen}
			<FullscreenNavDropdown />
		{/if}

		<nav class="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
			<a
				href="/facilities?view=list&fullscreen=true"
				class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
			>
				Facilities
			</a>

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
	</div>

	<OptionsMenu
		{isFullscreen}
		{onfullscreenchange}
		{onshowshortcuts}
		{onsearchfacilities}
		{searchShortcutKeys}
	/>
</div>
