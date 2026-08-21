<script>
	import { ArrowDown, ArrowUp, RotateCcw } from '@lucide/svelte';
	import { recipeById } from './explore-model.js';
	import { defaultTrackerItemLayout } from './tracker-view-model.js';

	/** @type {{columns:1|2|3,charts:any[],oncolumnschange?:(columns:1|2|3)=>void,onlayoutchange?:(id:string,patch:{columnSpan?:number,heightPx?:number})=>void,onmove?:(id:string,direction:-1|1)=>void}} */
	let { columns, charts, oncolumnschange, onlayoutchange, onmove } = $props();
</script>

<div class="flex min-h-full flex-col">
	<div class="flex-1 space-y-6 overflow-y-auto p-5">
		<div>
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-mid-grey">
				Layout
			</p>
			<h2 class="m-0 mt-1 text-lg font-semibold text-dark-grey">Arrange the view</h2>
			<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
				Drag cards on desktop or use the move controls. Mobile always follows this order in one
				column.
			</p>
		</div>

		<div>
			<p class="m-0 mb-2 text-xs font-medium text-dark-grey">Desktop columns</p>
			<div class="grid grid-cols-3 gap-2">
				{#each [1, 2, 3] as count (count)}
					<button
						type="button"
						class="rounded-lg border px-3 py-3 text-sm font-semibold {columns === count
							? 'border-dark-grey bg-dark-grey text-white'
							: 'border-mid-warm-grey bg-white text-dark-grey hover:bg-light-warm-grey'}"
						onclick={() => oncolumnschange?.(/** @type {1|2|3} */ (count))}
					>
						{count}
					</button>
				{/each}
			</div>
			<p class="m-0 mt-2 text-[10px] leading-relaxed text-mid-grey">
				Tablet uses at most two columns. Mobile uses one.
			</p>
		</div>

		<div class="space-y-3">
			<div class="flex items-center justify-between gap-3">
				<p class="m-0 text-xs font-medium text-dark-grey">Cards</p>
				<span class="font-mono text-xxs text-mid-grey">{charts.length}/12</span>
			</div>
			{#each charts as chart, index (chart.instanceId)}
				{@const recipe = recipeById(chart.recipeId)}
				{@const layout =
					chart.layout ?? defaultTrackerItemLayout(chart.recipeId, chart.config.presentation)}
				<div class="rounded-xl border border-warm-grey bg-white p-3">
					<div class="flex items-center gap-2">
						<div class="min-w-0 flex-1">
							<p class="m-0 truncate text-xs font-semibold text-dark-grey">{recipe?.label}</p>
							<p class="m-0 mt-0.5 text-[10px] capitalize text-mid-grey">
								{chart.config.presentation}
							</p>
						</div>
						<button
							type="button"
							disabled={index === 0}
							onclick={() => onmove?.(chart.instanceId, -1)}
							class="rounded-md p-1.5 text-mid-grey hover:bg-warm-grey hover:text-dark-grey disabled:opacity-25"
							aria-label="Move {recipe?.label} earlier"><ArrowUp class="size-4" /></button
						>
						<button
							type="button"
							disabled={index === charts.length - 1}
							onclick={() => onmove?.(chart.instanceId, 1)}
							class="rounded-md p-1.5 text-mid-grey hover:bg-warm-grey hover:text-dark-grey disabled:opacity-25"
							aria-label="Move {recipe?.label} later"><ArrowDown class="size-4" /></button
						>
					</div>
					<div class="mt-3 grid grid-cols-2 gap-2">
						<label class="block">
							<span class="mb-1 block text-[10px] font-medium text-mid-grey">Column span</span>
							<select
								class="w-full rounded-md border border-mid-warm-grey bg-white px-2 py-1.5 text-xs"
								value={layout.columnSpan}
								onchange={(event) =>
									onlayoutchange?.(chart.instanceId, {
										columnSpan: Number(event.currentTarget.value)
									})}
							>
								<option value="1">1 column</option>
								<option value="2">2 columns</option>
								<option value="3">3 columns</option>
							</select>
						</label>
						<label class="block">
							<span class="mb-1 block text-[10px] font-medium text-mid-grey">Height</span>
							<div class="flex items-center gap-1">
								<input
									type="number"
									min="240"
									max="720"
									step="10"
									class="min-w-0 flex-1 rounded-md border border-mid-warm-grey px-2 py-1.5 text-xs"
									value={layout.heightPx}
									onchange={(event) =>
										onlayoutchange?.(chart.instanceId, {
											heightPx: Number(event.currentTarget.value)
										})}
								/>
								<button
									type="button"
									class="rounded-md p-1.5 text-mid-grey hover:bg-warm-grey"
									onclick={() =>
										onlayoutchange?.(
											chart.instanceId,
											defaultTrackerItemLayout(chart.recipeId, chart.config.presentation)
										)}
									aria-label="Reset height"><RotateCcw class="size-3.5" /></button
								>
							</div>
						</label>
					</div>
				</div>
			{:else}
				<div
					class="rounded-xl border border-dashed border-mid-warm-grey p-5 text-center text-xs text-mid-grey"
				>
					Add a card before arranging the view.
				</div>
			{/each}
		</div>
	</div>
</div>
