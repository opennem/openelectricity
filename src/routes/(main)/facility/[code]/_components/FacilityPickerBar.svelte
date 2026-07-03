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
	 *   regionShortLabel?: string,
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
		onshowshortcuts,
		onsearchfacilities,
		searchShortcutKeys
	} = $props();

	const crumbTextClass = 'text-sm lg:text-base';
	const crumbPadClass = 'px-2 py-1';
	const separatorSize = 16;
</script>

<FullscreenFilterBar routeKey="detail">
	{#snippet stable()}
		<FullscreenNavDropdown />
		<a
			href="/facilities?view=list"
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
					href={`/facilities?regions=${regionValue}&view=list`}
					class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline {crumbTextClass} {crumbPadClass}"
				>
					<span class="md:hidden">{regionShortLabel || regionLabel}</span>
					<span class="hidden md:inline">{regionLabel}</span>
				</a>
			{/if}

			<ChevronRight size={separatorSize} class="text-mid-grey shrink-0" />

			{#if selectedCode}
				<a
					href={`/facilities?facility=${selectedCode}&view=list`}
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
		<OptionsMenu {onshowshortcuts} {onsearchfacilities} {searchShortcutKeys} />
	{/snippet}
</FullscreenFilterBar>
