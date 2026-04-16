<script>
	import OptionsMenu from '../../../facilities/_components/OptionsMenu.svelte';
	import { ChevronRight } from '@lucide/svelte';

	/**
	 * @type {{
	 *   selectedLabel: string,
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
		regionValue = null,
		regionLabel = '',
		isFullscreen = false,
		onfullscreenchange,
		onshowshortcuts,
		onsearchfacilities,
		searchShortcutKeys
	} = $props();

	let crumbTextClass = $derived(isFullscreen ? 'text-xs lg:text-sm' : 'text-sm lg:text-base');
	let crumbPadClass = $derived(isFullscreen ? 'px-2 py-1' : 'px-3 py-2');
	let separatorSize = $derived(isFullscreen ? 14 : 16);
</script>

<div
	class="flex items-center justify-between relative z-10 gap-4 pt-3 pb-3 px-4 {isFullscreen
		? 'md:py-3 md:px-4 md:rounded-lg md:border md:border-warm-grey md:bg-light-warm-grey/50'
		: ''}"
>
	<div class="flex items-center gap-4 min-w-0">
		{#if isFullscreen}
			<button
				onclick={() => onfullscreenchange?.()}
				class="flex items-center cursor-pointer px-2 shrink-0"
				title="Exit full screen"
			>
				<img src="/logo-mark.png" alt="Open Electricity" class="h-8 w-auto" />
			</button>
		{/if}

		<nav class="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
			<a
				href="/facilities?fullscreen=true"
				class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
			>
				Facilities
			</a>

			{#if regionValue && regionLabel}
				<ChevronRight size={separatorSize} class="text-mid-grey shrink-0" />
				<a
					href={`/facilities?regions=${regionValue}&fullscreen=true`}
					class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
				>
					{regionLabel}
				</a>
			{/if}

			<ChevronRight size={separatorSize} class="text-mid-grey shrink-0" />

			<span class="font-semibold text-dark-grey capitalize {crumbTextClass} {crumbPadClass}">
				{selectedLabel}
			</span>
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
