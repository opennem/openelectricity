<script>
	import { getStratifyContext } from '../_state/context.js';
	import { listCharts, loadChart, deleteChart } from '../_utils/storage.js';

	const project = getStratifyContext();

	/** @type {import('../_utils/storage.js').SavedChartMeta[]} */
	let savedCharts = $state([]);
	let open = $state(false);

	/** @type {HTMLDivElement | undefined} */
	let popoverEl;

	function refreshList() {
		savedCharts = listCharts();
	}

	$effect(() => {
		refreshList();
	});

	function toggle() {
		if (!open) refreshList();
		open = !open;
	}

	/** @param {string} id */
	function handleLoad(id) {
		try {
			const chart = loadChart(id);
			if (chart) {
				project.csvText = chart.csvText ?? '';
				project.title = chart.title ?? '';
				project.description = chart.description ?? '';
				project.dataSource = chart.dataSource ?? '';
				project.notes = chart.notes ?? '';
				project.chartType = /** @type {import('$lib/components/charts/v2/types.js').ChartType} */ (
					chart.chartType ?? 'stacked-area'
				);
				project.hiddenSeries = chart.hiddenSeries ?? [];
				project.userSeriesColours = chart.userSeriesColours ?? {};
				project.userSeriesLabels = chart.userSeriesLabels ?? {};
				project.currentChartId = id;
				open = false;
			}
		} catch {
			// Silently fail — chart may have been removed
		}
	}

	/** @param {string} id */
	function handleDelete(id) {
		deleteChart(id);
		if (project.currentChartId === id) project.currentChartId = null;
		refreshList();
	}

	/** @param {MouseEvent} e */
	function handleClickOutside(e) {
		if (open && popoverEl && !popoverEl.contains(/** @type {Node} */ (e.target))) {
			open = false;
		}
	}
</script>

<svelte:document onclick={handleClickOutside} />

<div class="relative" bind:this={popoverEl}>
	<button
		type="button"
		onclick={toggle}
		class="flex items-center gap-1.5 rounded border border-transparent px-2 py-1 text-[11px] text-mid-grey transition-colors hover:text-dark-grey hover:border-mid-warm-grey"
	>
		Saved Charts
		{#if savedCharts.length > 0}
			<span
				class="rounded-full bg-mid-warm-grey px-1.5 text-[10px] text-dark-grey leading-4"
			>
				{savedCharts.length}
			</span>
		{/if}
	</button>

	{#if open}
		<div
			class="absolute top-full right-0 mt-1 w-64 rounded-lg border border-mid-warm-grey bg-white shadow-lg z-50"
		>
			{#if savedCharts.length === 0}
				<p class="px-3 py-4 text-xs text-mid-grey text-center">No saved charts</p>
			{:else}
				<div class="max-h-64 overflow-y-auto py-1">
					{#each savedCharts as chart (chart.id)}
						<div
							class="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-light-warm-grey {project.currentChartId ===
							chart.id
								? 'bg-light-warm-grey'
								: ''}"
						>
							<button
								type="button"
								onclick={() => handleLoad(chart.id)}
								class="flex-1 text-left text-xs truncate"
							>
								<span class="font-medium">{chart.title || 'Untitled'}</span>
							</button>
							<button
								type="button"
								onclick={() => handleDelete(chart.id)}
								class="text-xs text-mid-warm-grey hover:text-dark-red shrink-0"
								title="Delete"
							>
								&times;
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
