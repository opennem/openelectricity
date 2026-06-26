<script>
	/**
	 * FacilityPanelFooter — pinned footer at the bottom of the facility detail
	 * panel. Shows the facility owner name(s) and a View facility (beta) link to
	 * the new /facility/{code} page.
	 */
	import { Building2 } from '@lucide/svelte';

	/**
	 * `buttonColour` (the facility's dominant fuel-tech colour) + `darkText` match
	 * the detail header's colour wash so the View facility button reads as part of
	 * the same surface.
	 * @type {{
	 *   owners?: Array<{ _id: string, name: string, legal_name?: string, website?: string }>,
	 *   facilityCode?: string | null,
	 *   buttonColour?: string,
	 *   darkText?: boolean,
	 *   loading?: boolean
	 * }}
	 */
	let {
		owners = [],
		facilityCode = null,
		buttonColour = 'transparent',
		darkText = false,
		loading = false
	} = $props();
</script>

<div
	class="shrink-0 border-t border-warm-grey px-5 py-2 flex items-center gap-3 text-xxs text-mid-grey bg-white"
>
	<Building2 size={14} class="shrink-0" />
	<span class="min-w-0 flex-1 truncate">
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
			href={`/facility/${facilityCode}?fullscreen=true`}
			style="background-color: {buttonColour}"
			class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-opacity hover:opacity-90 no-underline hover:no-underline {darkText
				? 'text-black'
				: 'text-white'}"
		>
			View facility <span class="text-xxs opacity-60">(beta)</span>
		</a>
	{/if}
</div>
