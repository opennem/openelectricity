<script>
	/**
	 * FacilityPanelFooter — pinned footer at the bottom of the facility detail
	 * panel. Shows the facility owner name(s) and a View facility detail link to
	 * the /facility/{code} page.
	 */
	import { ArrowRight, Building2 } from '@lucide/svelte';
	import { windowedHref } from '$lib/utils/fullscreen-mode.js';

	/**
	 * `buttonColour` (the facility's dominant fuel-tech colour) + `darkText` match
	 * the detail header's colour wash so the View facility button reads as part of
	 * the same surface.
	 * @type {{
	 *   owners?: Array<{ _id: string, name: string, legal_name?: string, website?: string }>,
	 *   facilityCode?: string | null,
	 *   buttonColour?: string,
	 *   darkText?: boolean,
	 *   loading?: boolean,
	 *   isFullscreen?: boolean
	 * }}
	 */
	let {
		owners = [],
		facilityCode = null,
		buttonColour = 'transparent',
		darkText = false,
		loading = false,
		isFullscreen = true
	} = $props();
</script>

<!-- Owners are desktop-only — on mobile the footer is just the full-width
     View facility button, with roomier padding around it. -->
<div
	class="shrink-0 border-t border-warm-grey px-5 py-4 md:py-2 flex items-center gap-3 text-xxs text-mid-grey bg-white"
>
	<Building2 size={14} class="shrink-0 hidden md:block" />
	<span class="min-w-0 flex-1 truncate hidden md:block">
		{#if owners.length}
			{#each owners as owner, i (owner._id ?? i)}
				{#if i > 0}<span class="mx-2 text-mid-grey/50">·</span>{/if}
				{#if owner.website}
					<a
						href={owner.website}
						target="_blank"
						rel="noopener noreferrer"
						class="text-dark-grey font-medium underline hover:text-black"
					>
						{owner.name || owner.legal_name}
					</a>
				{:else}
					<span class="text-dark-grey font-medium">{owner.name || owner.legal_name}</span>
				{/if}
			{/each}
		{:else if !loading}
			Owner unknown
		{/if}
	</span>

	{#if facilityCode}
		<a
			href={windowedHref(`/facility/${facilityCode}`, !isFullscreen)}
			style="background-color: {buttonColour}"
			class="group shrink-0 inline-flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all hover:opacity-90 hover:shadow no-underline hover:no-underline {darkText
				? 'text-black'
				: 'text-white'}"
		>
			View facility detail
			<ArrowRight size={15} class="transition-transform group-hover:translate-x-0.5" />
		</a>
	{/if}
</div>
