<script>
	import { RotateCcw } from '@lucide/svelte';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import GenerationBreakdown from '../dashboard/GenerationBreakdown.svelte';

	/** @type {{ dataset?:any, hiddenSeries?:string[], group:string, metric:string, ontoggle?:(series:string)=>void, ongroupchange?:(group:string)=>void, onshowall?:()=>void }} */
	let {
		dataset = null,
		hiddenSeries = [],
		group,
		metric,
		ontoggle,
		ongroupchange,
		onshowall
	} = $props();
</script>

<div class="flex min-h-full flex-col">
	<div class="space-y-4 border-b border-warm-grey p-5">
		<div>
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">
				Technologies
			</p>
			<h3 class="m-0 mt-1 text-lg font-semibold text-dark-grey">Generation sources</h3>
			<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
				Choose which fuel technologies contribute to applicable charts and metrics in this view.
			</p>
		</div>

		<label class="block">
			<span class="mb-1.5 block text-xs font-medium text-dark-grey">Grouping</span>
			<select
				class="w-full rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm"
				value={group}
				onchange={(event) => ongroupchange?.(event.currentTarget.value)}
			>
				{#each GROUP_OPTIONS as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>

		<div class="flex items-center justify-between gap-3">
			<span class="text-xs text-mid-grey">
				{dataset?.seriesNames?.length
					? `${dataset.seriesNames.length - hiddenSeries.length} of ${dataset.seriesNames.length} visible`
					: 'Loading technology values…'}
			</span>
			{#if hiddenSeries.length}
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-dark-grey hover:bg-warm-grey"
					onclick={onshowall}
				>
					<RotateCcw class="size-3.5" /> Show all
				</button>
			{/if}
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-auto">
		<GenerationBreakdown {dataset} {hiddenSeries} {metric} {ontoggle} standalone />
	</div>
</div>
