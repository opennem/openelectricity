<script>
	import { ChevronRight, Plus, Trash2 } from '@lucide/svelte';
	import { recipeById } from './explore-model.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';

	/** @type {{charts:any[],sharedMode?:boolean,onadd?:()=>void,onedit?:(chart:any)=>void,onremove?:(id:string)=>void}} */
	let { charts, sharedMode = false, onadd, onedit, onremove } = $props();

	/** @param {any} chart */
	function summary(chart) {
		if (sharedMode) {
			return `${chart.config.presentation === 'metric' ? 'Metric' : 'Chart'} · View controls`;
		}
		const range =
			chart.config.range?.days === -1 ? 'All data' : `${chart.config.range?.days ?? 7}D`;
		const interval =
			getIntervalSpec(chart.config.range?.intervalId)?.label ?? chart.config.range?.intervalId;
		return `${chart.config.presentation === 'metric' ? 'Metric' : 'Chart'} · ${range} · ${interval}`;
	}
</script>

<div class="flex min-h-full flex-col">
	<div class="flex-1 space-y-5 overflow-y-auto p-5">
		<div>
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">Cards</p>
			<h2 class="m-0 mt-1 text-lg font-semibold text-dark-grey">Build the view</h2>
			<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
				Add charts and metrics, then open any card to refine its data.
			</p>
		</div>

		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-mid-warm-grey bg-light-warm-grey/40 px-4 py-4 text-sm font-semibold text-dark-grey transition hover:border-dark-grey hover:bg-white"
			onclick={onadd}
		>
			<Plus class="size-4" /> Add
		</button>

		<div class="space-y-2">
			<div class="flex items-center justify-between gap-3">
				<p class="m-0 text-xs font-medium text-dark-grey">In this view</p>
				<span class="font-mono text-xxs text-mid-grey">{charts.length}/12</span>
			</div>
			{#each charts as chart (chart.instanceId)}
				{@const recipe = recipeById(chart.recipeId)}
				<div class="group flex items-center gap-2 rounded-xl border border-warm-grey bg-white p-2">
					<button
						type="button"
						class="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left hover:bg-light-warm-grey"
						onclick={() => onedit?.(chart)}
					>
						<span class="block truncate text-sm font-semibold text-dark-grey">{recipe?.label}</span>
						<span class="mt-0.5 block truncate font-mono text-[10px] text-mid-grey">
							{summary(chart)}
						</span>
					</button>
					<button
						type="button"
						class="rounded-lg p-2 text-mid-grey hover:bg-red/10 hover:text-red"
						onclick={() => onremove?.(chart.instanceId)}
						aria-label="Remove {recipe?.label}"
					>
						<Trash2 class="size-4" />
					</button>
					<button
						type="button"
						class="rounded-lg p-2 text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
						onclick={() => onedit?.(chart)}
						aria-label="Configure {recipe?.label}"
					>
						<ChevronRight class="size-4" />
					</button>
				</div>
			{:else}
				<div class="rounded-xl border border-dashed border-mid-warm-grey p-5 text-center">
					<p class="m-0 text-sm font-semibold text-dark-grey">This view is empty</p>
					<p class="m-0 mt-1 text-xs text-mid-grey">Add data to create the first card.</p>
				</div>
			{/each}
		</div>
	</div>
</div>
