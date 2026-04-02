<script>
	import { onMount } from 'svelte';
	import { getStratifyContext } from '../_state/context.js';
	import * as api from '../_utils/api.js';

	const project = getStratifyContext();

	/**
	 * @type {{
	 *   onclose: () => void
	 * }}
	 */
	let { onclose } = $props();

	/** @type {import('../_utils/api.js').ChartSummary[]} */
	let charts = $state([]);
	let loading = $state(true);
	let search = $state('');
	let deletingId = $state('');

	let filteredCharts = $derived(
		search.trim()
			? charts.filter((c) =>
					(c.title || 'Untitled').toLowerCase().includes(search.trim().toLowerCase())
				)
			: charts
	);

	onMount(() => {
		refreshList();
	});

	async function refreshList() {
		loading = true;
		try {
			charts = await api.listCharts();
		} catch {
			charts = [];
		} finally {
			loading = false;
		}
	}

	/** @param {string} id */
	async function handleLoad(id) {
		try {
			const chart = await api.getChart(id);
			if (chart) {
				project.loadFromSnapshot(chart);
				project.currentChartId = chart._id;
				onclose();
			}
		} catch {
			// Silently fail
		}
	}

	/** @param {import('../_utils/api.js').ChartSummary} chart */
	async function handleDuplicate(chart) {
		try {
			const full = await api.getChart(chart._id);
			if (!full) return;

			const { _id, _createdAt, _updatedAt, userId, status, publishedAt, ...rest } = full;
			const snapshot = {
				...rest,
				title: `${full.title || 'Untitled'} (copy)`
			};

			await api.createChart(/** @type {any} */ (snapshot));
			await refreshList();
		} catch {
			// Silently fail
		}
	}

	/** @param {string} id */
	async function handleDelete(id) {
		deletingId = id;
		try {
			await api.deleteChart(id);
			if (project.currentChartId === id) {
				project.currentChartId = null;
			}
			await refreshList();
		} catch {
			// Silently fail
		} finally {
			deletingId = '';
		}
	}

	/**
	 * Format relative time from ISO string.
	 * @param {string} dateStr
	 * @returns {string}
	 */
	function timeAgo(dateStr) {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diff = now - then;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
	}
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<div
		class="flex items-center gap-2 px-4 py-2 border-b border-warm-grey bg-mid-warm-grey/50 shrink-0"
	>
		<span class="text-[11px] font-medium text-dark-grey uppercase tracking-wide flex-1"
			>Charts</span
		>
		<a href="/stratify" class="text-[10px] text-mid-grey hover:text-dark-grey underline">
			Full view
		</a>
		<button
			type="button"
			onclick={onclose}
			class="text-[11px] text-mid-grey hover:text-dark-grey"
			title="Back to builder"
		>
			&times;
		</button>
	</div>

	<!-- Search -->
	<div class="px-3 py-2 border-b border-warm-grey shrink-0">
		<input
			type="text"
			placeholder="Search charts..."
			bind:value={search}
			class="w-full bg-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] focus:outline-none focus:border-dark-grey"
		/>
	</div>

	<!-- Chart list -->
	<div class="flex-1 overflow-y-auto">
		{#if loading}
			<p class="px-3 py-6 text-[11px] text-mid-grey text-center">Loading...</p>
		{:else if filteredCharts.length === 0}
			<p class="px-3 py-6 text-[11px] text-mid-grey text-center">
				{search.trim() ? 'No matching charts' : 'No charts yet'}
			</p>
		{:else}
			{#each filteredCharts as chart (chart._id)}
				{@const isCurrent = project.currentChartId === chart._id}
				<div
					class="px-3 py-2 border-b border-warm-grey/50 hover:bg-light-warm-grey/50 {isCurrent
						? 'bg-light-warm-grey'
						: ''}"
				>
					<!-- Title + status -->
					<div class="flex items-center gap-1.5 mb-0.5">
						<button
							type="button"
							onclick={() => handleLoad(chart._id)}
							class="flex-1 text-left text-[11px] font-medium text-dark-grey truncate"
						>
							{chart.title || 'Untitled'}
						</button>
						<span
							class="text-[9px] px-1 py-0.5 rounded {chart.status === 'published'
								? 'bg-green-100 text-green-700'
								: 'bg-warm-grey text-mid-grey'} shrink-0"
						>
							{chart.status === 'published' ? 'Published' : 'Draft'}
						</span>
					</div>

					<!-- Meta + actions -->
					<div class="flex items-center gap-2 text-[10px] text-mid-grey">
						<span>{chart.chartType}</span>
						<span>&middot;</span>
						<span>{timeAgo(chart._updatedAt)}</span>
						<span class="ml-auto flex gap-2">
							<button
								type="button"
								onclick={() => handleDuplicate(chart)}
								class="hover:text-dark-grey"
								title="Duplicate"
							>
								Dup
							</button>
							<button
								type="button"
								onclick={() => handleDelete(chart._id)}
								disabled={deletingId === chart._id}
								class="hover:text-dark-red disabled:opacity-40"
								title="Delete"
							>
								{deletingId === chart._id ? '...' : 'Del'}
							</button>
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footer -->
	<div class="px-3 py-2 border-t border-warm-grey shrink-0">
		<button
			type="button"
			onclick={() => {
				project.reset();
				onclose();
			}}
			class="w-full rounded border border-warm-grey px-2 py-1.5 text-[11px] text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors"
		>
			New Chart
		</button>
	</div>
</div>
