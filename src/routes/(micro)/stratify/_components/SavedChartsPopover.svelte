<script>
	import { getStratifyContext } from '../_state/context.js';
	import * as api from '../_utils/api.js';

	const project = getStratifyContext();

	/** @type {import('../_utils/api.js').ChartSummary[]} */
	let savedCharts = $state([]);
	let open = $state(false);
	let loading = $state(false);

	/** @type {HTMLDivElement | undefined} */
	let popoverEl;

	async function refreshList() {
		loading = true;
		try {
			savedCharts = await api.listCharts();
		} catch {
			savedCharts = [];
		} finally {
			loading = false;
		}
	}

	function toggle() {
		if (!open) refreshList();
		open = !open;
	}

	/** @param {string} id */
	async function handleLoad(id) {
		try {
			const chart = await api.getChart(id);
			if (chart) {
				project.loadFromSnapshot(chart);
				project.currentChartId = chart._id;
				open = false;
			}
		} catch {
			// Silently fail
		}
	}

	/** @param {string} id */
	async function handleDelete(id) {
		try {
			await api.deleteChart(id);
			if (project.currentChartId === id) project.currentChartId = null;
			await refreshList();
		} catch {
			// Silently fail
		}
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
		Charts
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
			class="absolute top-full right-0 mt-1 w-72 rounded-lg border border-mid-warm-grey bg-white shadow-lg z-50"
		>
			{#if loading}
				<p class="px-3 py-4 text-xs text-mid-grey text-center">Loading...</p>
			{:else if savedCharts.length === 0}
				<p class="px-3 py-4 text-xs text-mid-grey text-center">No saved charts</p>
			{:else}
				<div class="max-h-64 overflow-y-auto py-1">
					{#each savedCharts as chart (chart._id)}
						<div
							class="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-light-warm-grey {project.currentChartId ===
							chart._id
								? 'bg-light-warm-grey'
								: ''}"
						>
							<button
								type="button"
								onclick={() => handleLoad(chart._id)}
								class="flex-1 text-left text-xs truncate"
							>
								<span class="font-medium">{chart.title || 'Untitled'}</span>
								<span class="text-[10px] text-mid-grey ml-1">
									{chart.status === 'published' ? '●' : '○'}
								</span>
							</button>
							<button
								type="button"
								onclick={() => handleDelete(chart._id)}
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
