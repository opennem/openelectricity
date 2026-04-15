<script>
	/**
	 * FacilityPanelFooter — pinned footer at the bottom of the facility detail
	 * panel. Shows the facility owner name(s) and an Open (beta) link to the
	 * new /facility/{code} page.
	 */
	import { Building2 } from '@lucide/svelte';

	/**
	 * @type {{
	 *   owners?: Array<{ _id: string, name: string, legal_name?: string, website?: string }>,
	 *   facilityCode?: string | null
	 * }}
	 */
	let { owners = [], facilityCode = null } = $props();

	let label = $derived(owners.map((o) => o.name).join(', '));
</script>

<div
	class="shrink-0 border-t border-warm-grey px-5 py-2 flex items-center gap-3 text-xxs text-mid-grey bg-white"
>
	<Building2 size={14} class="shrink-0" />
	<span class="min-w-0 flex-1 truncate">
		{#if owners.length}
			Owner: <span class="text-dark-grey font-medium">{label}</span>
		{:else}
			Owner unknown
		{/if}
	</span>

	{#if facilityCode}
		<a
			href={`/facility/${facilityCode}`}
			class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dark-grey bg-transparent border border-warm-grey hover:bg-warm-grey hover:border-dark-grey rounded-md transition-colors no-underline hover:no-underline"
		>
			Open <span class="text-xxs opacity-60">(beta)</span>
		</a>
	{/if}
</div>
