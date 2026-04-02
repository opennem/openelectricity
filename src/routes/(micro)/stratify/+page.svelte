<script>
	import Meta from '$lib/components/Meta.svelte';
	import StratifyHeader from './_components/StratifyHeader.svelte';
	import StratifyButton from './_components/StratifyButton.svelte';
	import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
	import * as api from './_utils/api.js';

	/** @type {import('./_utils/api.js').ChartSummary[]} */
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

	import { onMount } from 'svelte';

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

	/** @param {import('./_utils/api.js').ChartSummary} chart */
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
			await refreshList();
		} catch {
			// Silently fail
		} finally {
			deletingId = '';
		}
	}

	/**
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

<Meta title="Stratify" description="Create and embed data charts" />

<div class="flex flex-col h-dvh overflow-hidden font-mono">
	<StratifyHeader />

	<!-- Sub-header -->
	<div class="flex items-center gap-2 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
		<StratifyButton href="/stratify/new">
			<CirclePlusIcon size={12} />
			New Chart
		</StratifyButton>
		<input
			type="text"
			placeholder="Search charts..."
			bind:value={search}
			class="ml-auto w-80 bg-warm-grey/50 border border-warm-grey rounded px-2 py-1 text-[11px] focus:outline-none focus:border-dark-grey"
		/>
	</div>

	<!-- Chart list -->
	<div class="flex-1 overflow-y-auto px-6 py-4">
		{#if loading}
			<p class="text-[11px] text-mid-grey text-center py-12">Loading...</p>
		{:else if filteredCharts.length === 0}
			<div class="text-center py-12">
				<p class="text-[11px] text-mid-grey mb-3">
					{search.trim() ? 'No matching charts' : 'No charts yet'}
				</p>
				{#if !search.trim()}
					<a
						href="/stratify/new"
						class="inline-block rounded border border-warm-grey px-4 py-2 text-[11px] text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors"
					>
						Create your first chart
					</a>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each filteredCharts as chart (chart._id)}
					<div
						class="border border-warm-grey rounded-lg overflow-hidden hover:border-mid-warm-grey transition-colors"
					>
						<div class="px-3 py-3">
							<div class="flex items-center gap-2 mb-0.5">
								<a
									href="/stratify/{chart._id}"
									class="text-[11px] font-medium text-dark-grey truncate hover:underline flex-1 min-w-0"
								>
									{chart.title || 'Untitled'}
								</a>
								<span
									class="text-[9px] px-1 py-0.5 rounded shrink-0 {chart.status === 'published'
										? 'bg-green-100 text-green-700'
										: 'bg-warm-grey text-mid-grey'}"
								>
									{chart.status === 'published' ? 'Published' : 'Draft'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-[10px] text-mid-grey">{timeAgo(chart._updatedAt)}</span>
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => handleDuplicate(chart)}
										class="text-[10px] text-mid-grey hover:text-dark-grey"
									>
										Duplicate
									</button>
									<button
										type="button"
										onclick={() => handleDelete(chart._id)}
										disabled={deletingId === chart._id}
										class="text-[10px] text-mid-grey hover:text-dark-red disabled:opacity-40"
									>
										{deletingId === chart._id ? '...' : 'Delete'}
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<p class="text-[10px] text-mid-grey mt-3">
				{filteredCharts.length} chart{filteredCharts.length === 1 ? '' : 's'}
			</p>
		{/if}
	</div>
</div>
