<script>
	/**
	 * InterconnectorList — the panel's default view: one clickable row per NEM
	 * corridor with its latest dispatch metrics from the page's grid-live poll
	 * store. Selecting a row opens that corridor's charts and zooms the map to
	 * it.
	 */

	import { ChevronRight } from '@lucide/svelte';
	import { INTERCONNECTORS } from '$lib/flows/region-geo.js';
	import { formatDispatchLabel } from '$lib/flows/format.js';
	import CorridorMetrics from './CorridorMetrics.svelte';

	/**
	 * @type {{
	 *   flows?: Record<string, number>,
	 *   dispatchDateTimeString?: string,
	 *   onselect?: (key: string) => void
	 * }}
	 */
	let { flows = {}, dispatchDateTimeString = '', onselect } = $props();

	let dispatchLabel = $derived(formatDispatchLabel(dispatchDateTimeString));
</script>

<div class="flex h-full flex-col p-4 pt-2">
	<ul class="m-0 list-none divide-y divide-warm-grey p-0">
		{#each INTERCONNECTORS as ic (ic.key)}
			<li>
				<button
					type="button"
					onclick={() => onselect?.(ic.key)}
					class="group flex w-full cursor-pointer flex-col gap-1.5 rounded-lg px-2 py-3 text-left transition-colors hover:bg-light-warm-grey"
				>
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0 truncate text-sm font-medium text-dark-grey">{ic.label}</div>
						<ChevronRight
							size={16}
							class="shrink-0 text-mid-warm-grey transition-colors group-hover:text-mid-grey"
						/>
					</div>
					<div class="w-full">
						<CorridorMetrics interconnector={ic} {flows} />
					</div>
				</button>
			</li>
		{/each}
	</ul>

	{#if dispatchLabel}
		<div class="mt-auto pt-3 text-right text-[10px] text-mid-grey">as at {dispatchLabel}</div>
	{/if}
</div>
