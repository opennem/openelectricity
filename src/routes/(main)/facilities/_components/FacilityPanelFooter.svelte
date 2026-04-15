<script>
	/**
	 * FacilityPanelFooter — pinned footer at the bottom of the facility detail
	 * panel. Shows the facility owner name(s).
	 */
	import { Building2 } from '@lucide/svelte';

	/**
	 * @type {{
	 *   owners?: Array<{ _id: string, name: string, legal_name?: string, website?: string }>
	 * }}
	 */
	let { owners = [] } = $props();

	let label = $derived(owners.map((o) => o.name).join(', '));
</script>

<div
	class="shrink-0 border-t border-warm-grey px-5 py-3 flex items-center gap-2 text-xxs text-mid-grey bg-white"
>
	<Building2 size={14} class="shrink-0" />
	<span class="min-w-0 truncate">
		{#if owners.length}
			Owner: <span class="text-dark-grey font-medium">{label}</span>
		{:else}
			Owner unknown
		{/if}
	</span>
</div>
