<script>
	import { FileText, Building2 } from '@lucide/svelte';
	import ExpandableDescription from '$lib/components/ExpandableDescription.svelte';
	import { hasPortableTextContent } from '$lib/utils/portable-text.js';

	/**
	 * @type {{
	 *   sanityFacility: any | null
	 * }}
	 */
	let { sanityFacility } = $props();

	let description = $derived(sanityFacility?.description ?? []);
	let hasDescription = $derived(hasPortableTextContent(description));

	/** @type {Array<{ _id: string, name: string, legal_name?: string, website?: string }>} */
	let owners = $derived(sanityFacility?.owners ?? []);
</script>

<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
	<div class="px-6 py-3 border-b border-mid-warm-grey/40">
		<h3 class="text-sm font-semibold text-dark-grey m-0">About</h3>
	</div>
	{#if hasDescription}
		<div class="p-5">
			{#key sanityFacility?.code}
				<ExpandableDescription value={description} />
			{/key}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
			<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
				<FileText size={24} strokeWidth={1.5} />
			</div>
			<p class="text-sm font-medium text-dark-grey m-0">No description available</p>
		</div>
	{/if}

	{#if owners.length}
		<div class="space-y-1.5 border-t border-mid-warm-grey/40 p-5">
			<h4 class="m-0 text-xxs font-semibold uppercase tracking-wider text-mid-grey">
				{owners.length > 1 ? 'Owners' : 'Owner'}
			</h4>
			<div class="flex flex-col gap-1">
				{#each owners as owner, i (owner._id ?? i)}
					{@const label = owner.name || owner.legal_name}
					<div class="flex items-center gap-2 text-sm">
						<Building2 size={14} class="shrink-0 text-mid-grey" />
						{#if owner.website}
							<a
								href={owner.website}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-dark-grey hover:text-black"
							>
								{label}
							</a>
						{:else}
							<span class="font-medium text-dark-grey">{label}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
