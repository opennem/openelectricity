<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import StratifyHeader from './_components/StratifyHeader.svelte';
	import StratifyButton from './_components/StratifyButton.svelte';
	import ConfirmModal from './_components/ConfirmModal.svelte';
	import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
	import * as api from './_utils/api.js';
	import { timeAgo } from './_utils/format.js';

	/** @type {import('./_utils/api.js').ChartSummary[]} */
	let myCharts = $state([]);
	/** @type {import('./_utils/api.js').ChartSummary[]} */
	let communityCharts = $state([]);
	let isSuperAdmin = $state(false);
	let loading = $state(true);
	let search = $state('');
	/** @type {'all' | 'draft' | 'published'} */
	let statusFilter = $state('all');
	let deletingId = $state('');
	let forkingId = $state('');

	// Confirm modal state
	let confirmOpen = $state(false);
	let confirmChartId = $state('');
	let confirmChartTitle = $state('');

	let filteredMyCharts = $derived.by(() => {
		let list = myCharts;
		if (statusFilter !== 'all') {
			list = list.filter((c) => c.status === statusFilter);
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter((c) => (c.title || 'Untitled').toLowerCase().includes(q));
		}
		return list;
	});

	let filteredCommunityCharts = $derived.by(() => {
		let list = communityCharts;
		if (isSuperAdmin && statusFilter !== 'all') {
			list = list.filter((c) => c.status === statusFilter);
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter((c) => (c.title || 'Untitled').toLowerCase().includes(q));
		}
		return list;
	});

	onMount(() => {
		refreshList();
	});

	async function refreshList() {
		loading = true;
		try {
			const data = await api.listCharts();
			myCharts = data.myCharts;
			communityCharts = data.communityCharts;
			isSuperAdmin = data.isSuperAdmin;
		} catch {
			myCharts = [];
			communityCharts = [];
		} finally {
			loading = false;
		}
	}

	/** @param {import('./_utils/api.js').ChartSummary} chart */
	async function handleDuplicate(chart) {
		try {
			const full = await api.getChart(chart._id);
			if (!full) return;

			const { _id, _createdAt, _updatedAt, userId, userEmail, status, publishedAt, ...rest } =
				full;
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

	/** @param {import('./_utils/api.js').ChartSummary} chart */
	function promptDelete(chart) {
		confirmChartId = chart._id;
		confirmChartTitle = chart.title || 'Untitled';
		confirmOpen = true;
	}

	async function confirmDelete() {
		const id = confirmChartId;
		confirmOpen = false;
		confirmChartId = '';
		confirmChartTitle = '';

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

	function cancelDelete() {
		confirmOpen = false;
		confirmChartId = '';
		confirmChartTitle = '';
	}

	/** @param {string} id */
	async function handleFork(id) {
		forkingId = id;
		try {
			const result = await api.forkChart(id);
			goto(`/stratify/${result._id}`);
		} catch {
			// Silently fail
		} finally {
			forkingId = '';
		}
	}

	const filterOptions = /** @type {const} */ (['all', 'draft', 'published']);
</script>

<Meta title="Stratify" description="Create and embed data charts" />

<ConfirmModal
	open={confirmOpen}
	title="Delete chart"
	message={`Are you sure you want to delete "${confirmChartTitle}"? This cannot be undone.`}
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>

<div class="flex flex-col h-dvh overflow-hidden font-mono">
	<StratifyHeader />

	<!-- Sub-header -->
	<div class="flex items-center gap-2 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
		<StratifyButton href="/stratify/new">
			<CirclePlusIcon size={12} />
			New Chart
		</StratifyButton>

		<div class="flex items-center gap-1 ml-2">
			{#each filterOptions as option (option)}
				<button
					type="button"
					onclick={() => (statusFilter = option)}
					class="rounded px-2 py-0.5 text-[10px] capitalize transition-colors {statusFilter ===
					option
						? 'bg-dark-grey text-white'
						: 'text-mid-grey hover:text-dark-grey'}"
				>
					{option}
				</button>
			{/each}
		</div>

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
		{:else}
			<!-- My Charts -->
			<section class="mb-8">
				<h2 class="text-[10px] font-bold text-dark-grey uppercase tracking-wide mb-3">
					My Charts ({filteredMyCharts.length})
				</h2>

				{#if filteredMyCharts.length === 0}
					<div class="text-center py-8">
						<p class="text-[11px] text-mid-grey mb-3">
							{search.trim() || statusFilter !== 'all'
								? 'No matching charts'
								: 'No charts yet'}
						</p>
						{#if !search.trim() && statusFilter === 'all'}
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
						{#each filteredMyCharts as chart (chart._id)}
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
												onclick={() => promptDelete(chart)}
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
				{/if}
			</section>

			<!-- Community Charts -->
			{#if filteredCommunityCharts.length > 0}
				<section>
					<h2 class="text-[10px] font-bold text-dark-grey uppercase tracking-wide mb-3">
						Community Charts ({filteredCommunityCharts.length})
					</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each filteredCommunityCharts as chart (chart._id)}
							<div
								class="border border-warm-grey rounded-lg overflow-hidden hover:border-mid-warm-grey transition-colors"
							>
								<div class="px-3 py-3">
									<div class="flex items-center gap-2 mb-0.5">
										<a
											href="/strata/{chart._id}"
											target="_blank"
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
										<span class="text-[10px] text-mid-grey">
											{chart.userEmail || 'Unknown'}
											&middot;
											{timeAgo(chart._updatedAt)}
										</span>
										<div class="flex items-center gap-2">
											<button
												type="button"
												onclick={() => handleFork(chart._id)}
												disabled={forkingId === chart._id}
												class="text-[10px] text-mid-grey hover:text-dark-grey disabled:opacity-40"
											>
												{forkingId === chart._id ? 'Forking...' : 'Fork'}
											</button>
											{#if isSuperAdmin}
												<a
													href="/stratify/{chart._id}"
													class="text-[10px] text-mid-grey hover:text-dark-grey"
												>
													Edit
												</a>
												<button
													type="button"
													onclick={() => promptDelete(chart)}
													disabled={deletingId === chart._id}
													class="text-[10px] text-mid-grey hover:text-dark-red disabled:opacity-40"
												>
													{deletingId === chart._id ? '...' : 'Delete'}
												</button>
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			{#if filteredMyCharts.length === 0 && filteredCommunityCharts.length === 0}
				<p class="text-[11px] text-mid-grey text-center py-8">No charts found</p>
			{/if}
		{/if}
	</div>
</div>
