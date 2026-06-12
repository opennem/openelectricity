<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Meta from '$lib/components/Meta.svelte';
	import StratifyHeader from './_components/StratifyHeader.svelte';
	import StratifyButton from './_components/StratifyButton.svelte';
	import ConfirmModal from './_components/ConfirmModal.svelte';
	import ChartCard from './_components/ChartCard.svelte';
	import SectionPagination from './_components/SectionPagination.svelte';
	import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import * as api from './_utils/api.js';

	/**
	 * @param {string | null} value
	 * @param {number} fallback
	 */
	function toPositiveInt(value, fallback) {
		const n = Number.parseInt(value ?? '', 10);
		return Number.isFinite(n) && n > 0 ? n : fallback;
	}

	// The URL is the source of truth for pagination + filters
	let myPage = $derived(toPositiveInt(page.url.searchParams.get('myPage'), 1));
	let communityPage = $derived(toPositiveInt(page.url.searchParams.get('communityPage'), 1));
	let q = $derived(page.url.searchParams.get('q') ?? '');
	let statusFilter = $derived(page.url.searchParams.get('status') ?? 'all');
	let filtersActive = $derived(q.trim() !== '' || statusFilter !== 'all');

	let mySection = $state(/** @type {import('./_utils/api.js').ChartListSection | null} */ (null));
	let communitySection = $state(
		/** @type {import('./_utils/api.js').ChartListSection | null} */ (null)
	);
	let myLoading = $state(true);
	let communityLoading = $state(true);
	let isSuperAdmin = $state(false);
	let deletingId = $state('');
	let forkingId = $state('');

	// Confirm modal state
	let confirmOpen = $state(false);
	let confirmChartId = $state('');
	let confirmChartTitle = $state('');
	/** @type {'my' | 'community'} */
	let confirmSection = $state('my');

	// Request counters so stale responses never overwrite newer ones
	let myRequestToken = 0;
	let communityRequestToken = 0;

	function myOpts() {
		return /** @type {const} */ ({
			scope: /** @type {'my'} */ ('my'),
			myPage,
			q: q.trim() || undefined,
			status: statusFilter === 'all' ? undefined : statusFilter
		});
	}

	function communityOpts() {
		return {
			scope: /** @type {'community'} */ ('community'),
			communityPage,
			q: q.trim() || undefined,
			status: statusFilter === 'all' ? undefined : statusFilter
		};
	}

	$effect(() => {
		loadMySection(myOpts());
	});

	$effect(() => {
		loadCommunitySection(communityOpts());
	});

	/** @param {Parameters<typeof api.listCharts>[0]} opts */
	async function loadMySection(opts) {
		const token = ++myRequestToken;
		myLoading = true;
		try {
			const data = await api.listCharts(opts);
			if (token !== myRequestToken) return;
			mySection = data.my ?? null;
			isSuperAdmin = data.isSuperAdmin;
			clampPage('myPage', data.my);
		} catch {
			if (token !== myRequestToken) return;
			mySection = { items: [], total: 0, page: 1, totalPages: 1 };
		} finally {
			if (token === myRequestToken) myLoading = false;
		}
	}

	/** @param {Parameters<typeof api.listCharts>[0]} opts */
	async function loadCommunitySection(opts) {
		const token = ++communityRequestToken;
		communityLoading = true;
		try {
			const data = await api.listCharts(opts);
			if (token !== communityRequestToken) return;
			communitySection = data.community ?? null;
			isSuperAdmin = data.isSuperAdmin;
			clampPage('communityPage', data.community);
		} catch {
			if (token !== communityRequestToken) return;
			communitySection = { items: [], total: 0, page: 1, totalPages: 1 };
		} finally {
			if (token === communityRequestToken) communityLoading = false;
		}
	}

	/**
	 * If a page beyond the last (e.g. after deleting the last item on it)
	 * comes back empty, snap to the last valid page — the URL change
	 * triggers a refetch.
	 * @param {'myPage' | 'communityPage'} key
	 * @param {import('./_utils/api.js').ChartListSection | undefined} section
	 */
	function clampPage(key, section) {
		if (section && section.items.length === 0 && section.page > section.totalPages) {
			goto(hrefWith({ [key]: section.totalPages }), { replaceState: true, noScroll: true });
		}
	}

	/**
	 * Build a list URL from the current params with overrides applied,
	 * omitting defaults to keep URLs clean.
	 * @param {{ myPage?: number, communityPage?: number, q?: string, status?: string }} overrides
	 */
	function hrefWith(overrides = {}) {
		const merged = { myPage, communityPage, q, status: statusFilter, ...overrides };
		const params = new URLSearchParams();
		if (merged.myPage > 1) params.set('myPage', String(merged.myPage));
		if (merged.communityPage > 1) params.set('communityPage', String(merged.communityPage));
		if (merged.q.trim()) params.set('q', merged.q.trim());
		if (merged.status !== 'all') params.set('status', merged.status);
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	}

	// Search input is a local mirror of the URL's q, debounced before navigating
	let searchInput = $state(page.url.searchParams.get('q') ?? '');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let searchTimer;

	// Cancel a pending debounced navigation if the page unmounts first
	$effect(() => () => clearTimeout(searchTimer));

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(hrefWith({ q: searchInput, myPage: 1, communityPage: 1 }), {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}, 300);
	}

	/** @param {string} option */
	function setStatusFilter(option) {
		goto(hrefWith({ status: option, myPage: 1, communityPage: 1 }), { noScroll: true });
	}

	/** @param {import('./_utils/api.js').ChartDoc} chart */
	async function handleDuplicate(chart) {
		try {
			const full = await api.getChart(chart._id);
			if (!full) return;

			const { _id, _createdAt, _updatedAt, userId, userEmail, status, publishedAt, ...rest } = full;
			const snapshot = {
				...rest,
				title: `${full.title || 'Untitled'} (copy)`
			};

			await api.createChart(/** @type {any} */ (snapshot));
			// The copy sorts to the top of page 1 (_updatedAt desc)
			if (myPage !== 1) {
				goto(hrefWith({ myPage: 1 }), { noScroll: true });
			} else {
				await loadMySection(myOpts());
			}
		} catch {
			// Silently fail
		}
	}

	/**
	 * @param {import('./_utils/api.js').ChartDoc} chart
	 * @param {'my' | 'community'} section
	 */
	function promptDelete(chart, section) {
		confirmChartId = chart._id;
		confirmChartTitle = chart.title || 'Untitled';
		confirmSection = section;
		confirmOpen = true;
	}

	async function confirmDelete() {
		const id = confirmChartId;
		const section = confirmSection;
		confirmOpen = false;
		confirmChartId = '';
		confirmChartTitle = '';

		deletingId = id;
		try {
			await api.deleteChart(id);
			if (section === 'my') {
				await loadMySection(myOpts());
			} else {
				await loadCommunitySection(communityOpts());
			}
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

	let showCommunitySection = $derived(
		communityLoading || (communitySection !== null && (communitySection.total > 0 || filtersActive))
	);
</script>

<Meta title="Stratify" description="Create and embed data charts" />

<ConfirmModal
	open={confirmOpen}
	title="Delete chart"
	message={`Are you sure you want to delete "${confirmChartTitle}"? This cannot be undone.`}
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>

{#snippet skeletonGrid()}
	<div
		class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[2560px]:grid-cols-6 gap-4"
	>
		{#each { length: 3 }, i (i)}
			<div class="border border-warm-grey rounded-xl overflow-hidden animate-pulse bg-white">
				<div class="aspect-[5/4] bg-warm-grey/60"></div>
				<div class="px-3 py-3 border-t border-warm-grey">
					<div class="h-3 bg-warm-grey/60 rounded w-2/3 mb-2"></div>
					<div class="h-2.5 bg-warm-grey/60 rounded w-1/3"></div>
				</div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="flex flex-col h-dvh overflow-hidden font-mono">
	<StratifyHeader />

	<!-- Toolbar -->
	<div class="flex items-center gap-3 px-4 py-2.5 border-b border-warm-grey bg-white">
		<StratifyButton href="/stratify/new" variant="accent">
			<CirclePlusIcon size={12} />
			New Chart
		</StratifyButton>

		<div
			class="inline-flex items-center rounded-md border border-warm-grey divide-x divide-warm-grey overflow-hidden ml-1"
		>
			{#each filterOptions as option (option)}
				<button
					type="button"
					onclick={() => setStatusFilter(option)}
					class="px-2.5 py-1 text-[10px] capitalize transition-colors {statusFilter === option
						? 'bg-dark-grey text-white'
						: 'text-mid-grey hover:text-dark-grey hover:bg-light-warm-grey'}"
				>
					{option}
				</button>
			{/each}
		</div>

		<div class="relative ml-auto w-80">
			<SearchIcon
				size={12}
				class="absolute left-2.5 top-1/2 -translate-y-1/2 text-mid-grey pointer-events-none"
			/>
			<input
				type="text"
				placeholder="Search charts..."
				bind:value={searchInput}
				oninput={handleSearchInput}
				class="w-full bg-light-warm-grey border border-warm-grey rounded-md pl-7 pr-2 py-1.5 text-[11px] focus:outline-none focus:border-dark-grey focus:bg-white transition-colors"
			/>
		</div>
	</div>

	<!-- Chart list -->
	<div class="flex-1 overflow-y-auto px-8 py-6 bg-light-warm-grey/50">
		<!-- My Charts -->
		<section class="mb-10">
			<h2 class="flex items-center gap-3 mb-4">
				<span class="text-[10px] font-bold text-dark-grey uppercase tracking-wide">My Charts</span>
				{#if mySection}
					<span
						class="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-grey text-mid-grey tabular-nums"
					>
						{mySection.total}
					</span>
				{/if}
				<span class="flex-1 border-t border-warm-grey"></span>
			</h2>

			{#if myLoading}
				{@render skeletonGrid()}
			{:else if !mySection || mySection.total === 0}
				<div class="text-center py-8">
					<p class="text-[11px] text-mid-grey mb-3">
						{filtersActive ? 'No matching charts' : 'No charts yet'}
					</p>
					{#if !filtersActive}
						<a
							href="/stratify/new"
							class="inline-block rounded border border-warm-grey px-4 py-2 text-[11px] text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors"
						>
							Create your first chart
						</a>
					{/if}
				</div>
			{:else}
				<div
					class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[2560px]:grid-cols-6 gap-4"
				>
					{#each mySection.items as chart (chart._id)}
						<ChartCard
							{chart}
							variant="my"
							deleting={deletingId === chart._id}
							onduplicate={() => handleDuplicate(chart)}
							ondelete={() => promptDelete(chart, 'my')}
						/>
					{/each}
				</div>
				{#if mySection.totalPages > 1}
					<SectionPagination
						page={mySection.page}
						totalPages={mySection.totalPages}
						hrefFor={(n) => hrefWith({ myPage: n })}
						label="My charts pagination"
					/>
				{/if}
			{/if}
		</section>

		<!-- Community Charts -->
		{#if showCommunitySection}
			<section>
				<h2 class="flex items-center gap-3 mb-4">
					<span class="text-[10px] font-bold text-dark-grey uppercase tracking-wide">
						Community Charts
					</span>
					{#if communitySection}
						<span
							class="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-grey text-mid-grey tabular-nums"
						>
							{communitySection.total}
						</span>
					{/if}
					<span class="flex-1 border-t border-warm-grey"></span>
				</h2>

				{#if communityLoading}
					{@render skeletonGrid()}
				{:else if !communitySection || communitySection.total === 0}
					<p class="text-[11px] text-mid-grey text-center py-8">No matching community charts</p>
				{:else}
					<div
						class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[2560px]:grid-cols-6 gap-4"
					>
						{#each communitySection.items as chart (chart._id)}
							<ChartCard
								{chart}
								variant="community"
								{isSuperAdmin}
								deleting={deletingId === chart._id}
								forking={forkingId === chart._id}
								onfork={() => handleFork(chart._id)}
								ondelete={() => promptDelete(chart, 'community')}
							/>
						{/each}
					</div>
					{#if communitySection.totalPages > 1}
						<SectionPagination
							page={communitySection.page}
							totalPages={communitySection.totalPages}
							hrefFor={(n) => hrefWith({ communityPage: n })}
							label="Community charts pagination"
						/>
					{/if}
				{/if}
			</section>
		{/if}
	</div>
</div>
