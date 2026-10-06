<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Meta from '$lib/components/Meta.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
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

	/** @typedef {'my' | 'shared' | 'community'} SectionKey */
	/** @typedef {import('./_utils/api.js').ChartListSection} ChartListSection */

	/** @type {readonly SectionKey[]} */
	const SECTIONS = ['my', 'shared', 'community'];

	/** URL param holding each section's page. */
	const PAGE_PARAMS = /** @type {const} */ ({
		my: 'myPage',
		shared: 'sharedPage',
		community: 'communityPage'
	});

	// The URL is the source of truth for pagination + filters
	let pages = $derived({
		my: toPositiveInt(page.url.searchParams.get('myPage'), 1),
		shared: toPositiveInt(page.url.searchParams.get('sharedPage'), 1),
		community: toPositiveInt(page.url.searchParams.get('communityPage'), 1)
	});
	let q = $derived(page.url.searchParams.get('q') ?? '');
	let statusFilter = $derived(page.url.searchParams.get('status') ?? 'all');
	let filtersActive = $derived(q.trim() !== '' || statusFilter !== 'all');

	/** @type {Record<SectionKey, ChartListSection | null>} */
	let sections = $state({ my: null, shared: null, community: null });
	/** @type {Record<SectionKey, boolean>} */
	let loading = $state({ my: true, shared: true, community: true });
	let isSuperAdmin = $state(false);
	let deletingId = $state('');
	let forkingId = $state('');

	// Confirm modal state
	let confirmOpen = $state(false);
	let confirmChartId = $state('');
	let confirmChartTitle = $state('');
	/** @type {SectionKey} */
	let confirmSection = $state('my');

	// Request counters so stale responses never overwrite newer ones
	const requestTokens = { my: 0, shared: 0, community: 0 };

	/** @param {SectionKey} key */
	function sectionOpts(key) {
		return {
			scope: key,
			[PAGE_PARAMS[key]]: pages[key],
			q: q.trim() || undefined,
			status: statusFilter === 'all' ? undefined : statusFilter
		};
	}

	// One effect per section, so paging one section leaves the others alone.
	for (const key of SECTIONS) {
		$effect(() => {
			loadSection(key, sectionOpts(key));
		});
	}

	/**
	 * @param {SectionKey} key
	 * @param {Parameters<typeof api.listCharts>[0]} opts
	 */
	async function loadSection(key, opts) {
		const token = ++requestTokens[key];
		loading[key] = true;
		try {
			const data = await api.listCharts(opts);
			if (token !== requestTokens[key]) return;
			sections[key] = data[key] ?? null;
			isSuperAdmin = data.isSuperAdmin;
			clampPage(key, data[key]);
		} catch {
			if (token !== requestTokens[key]) return;
			sections[key] = { items: [], total: 0, page: 1, totalPages: 1 };
		} finally {
			if (token === requestTokens[key]) loading[key] = false;
		}
	}

	/**
	 * If a page beyond the last (e.g. after deleting the last item on it)
	 * comes back empty, snap to the last valid page — the URL change
	 * triggers a refetch.
	 * @param {SectionKey} key
	 * @param {ChartListSection | undefined} section
	 */
	function clampPage(key, section) {
		if (section && section.items.length === 0 && section.page > section.totalPages) {
			goto(hrefWith({ [PAGE_PARAMS[key]]: section.totalPages }), {
				replaceState: true,
				noScroll: true
			});
		}
	}

	/**
	 * Build a list URL from the current params with overrides applied,
	 * omitting defaults to keep URLs clean.
	 * @param {{ myPage?: number, sharedPage?: number, communityPage?: number, q?: string, status?: string }} overrides
	 */
	function hrefWith(overrides = {}) {
		const merged = {
			myPage: pages.my,
			sharedPage: pages.shared,
			communityPage: pages.community,
			q,
			status: statusFilter,
			...overrides
		};
		const params = new URLSearchParams();
		for (const key of SECTIONS) {
			const pageNumber = merged[PAGE_PARAMS[key]];
			if (pageNumber > 1) params.set(PAGE_PARAMS[key], String(pageNumber));
		}
		if (merged.q.trim()) params.set('q', merged.q.trim());
		if (merged.status !== 'all') params.set('status', merged.status);
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	}

	/** Filters reset every section to its first page. */
	const FIRST_PAGES = { myPage: 1, sharedPage: 1, communityPage: 1 };

	// Search input is a local mirror of the URL's q, debounced before navigating
	let searchInput = $state(page.url.searchParams.get('q') ?? '');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let searchTimer;

	// Cancel a pending debounced navigation if the page unmounts first
	$effect(() => () => clearTimeout(searchTimer));

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(hrefWith({ q: searchInput, ...FIRST_PAGES }), {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}, 300);
	}

	/** @param {string} option */
	function setStatusFilter(option) {
		goto(hrefWith({ status: option, ...FIRST_PAGES }), { noScroll: true });
	}

	/** @param {import('./_utils/api.js').ChartDoc} chart */
	async function handleDuplicate(chart) {
		try {
			const full = await api.getChart(chart._id);
			if (!full) return;

			const {
				_id,
				_createdAt,
				_updatedAt,
				userId: _userId,
				userEmail: _userEmail,
				status: _status,
				publishedAt: _publishedAt,
				...rest
			} = full;
			const snapshot = {
				...rest,
				title: `${full.title || 'Untitled'} (copy)`
			};

			await api.createChart(/** @type {any} */ (snapshot));
			// The copy sorts to the top of page 1 (_updatedAt desc)
			if (pages.my !== 1) {
				goto(hrefWith({ myPage: 1 }), { noScroll: true });
			} else {
				await loadSection('my', sectionOpts('my'));
			}
		} catch {
			// Silently fail
		}
	}

	/**
	 * @param {import('./_utils/api.js').ChartDoc} chart
	 * @param {SectionKey} section
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
			await loadSection(section, sectionOpts(section));
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
		loading.community ||
			(sections.community !== null && (sections.community.total > 0 || filtersActive))
	);
	/** Shared charts only appear once someone has shared one with you. */
	let showSharedSection = $derived(
		loading.shared || (sections.shared !== null && sections.shared.total > 0)
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

<div class="flex h-dvh flex-col overflow-hidden bg-white font-sans text-sm text-dark-grey">
	<StratifyHeader />

	<!-- Toolbar -->
	<div
		class="flex flex-wrap items-center gap-3 border-b border-warm-grey bg-white px-4 py-3 sm:px-6 lg:px-8"
	>
		<StratifyButton href="/stratify/new" variant="primary">
			<CirclePlusIcon size={15} />
			New chart
		</StratifyButton>

		<div
			class="inline-flex items-center gap-1 rounded-full border border-warm-grey bg-light-warm-grey p-1"
		>
			{#each filterOptions as option (option)}
				<button
					type="button"
					onclick={() => setStatusFilter(option)}
					class="rounded-full px-3 py-1.5 font-space text-sm font-medium capitalize transition-colors {statusFilter ===
					option
						? 'bg-dark-grey text-white shadow-sm'
						: 'text-mid-grey hover:bg-white hover:text-dark-grey'}"
				>
					{option}
				</button>
			{/each}
		</div>

		<div class="relative order-last w-full sm:order-none sm:ml-auto sm:w-80">
			<SearchIcon
				size={15}
				class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mid-grey"
			/>
			<input
				type="text"
				placeholder="Search your charts"
				bind:value={searchInput}
				oninput={handleSearchInput}
				class="w-full rounded-lg border border-warm-grey bg-white py-2.5 pr-4 pl-9 text-sm transition-colors placeholder:text-mid-grey focus:border-red focus:ring-2 focus:ring-red/10 focus:outline-none"
			/>
		</div>
	</div>

	<!-- Chart list -->
	<div class="flex-1 overflow-y-auto bg-light-warm-grey/50 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
		<!-- My Charts -->
		<section class="mb-10">
			<h2 class="mb-5 flex items-center gap-3">
				<span class="font-sans text-xl font-semibold tracking-tight">My charts</span>
				{#if sections.my}
					<span
						class="rounded-full bg-warm-grey px-2 py-0.5 font-mono text-[10px] text-mid-grey tabular-nums"
					>
						{sections.my.total}
					</span>
				{/if}
			</h2>

			{#if loading.my}
				{@render skeletonGrid()}
			{:else if !sections.my || sections.my.total === 0}
				<Card.Root class="gap-0 border-dashed bg-white py-0 text-center shadow-none">
					<Card.Content class="px-6 py-14">
						<p class="mb-4 text-sm text-mid-grey">
							{filtersActive ? 'No matching charts' : 'No charts yet'}
						</p>
						{#if !filtersActive}
							<StratifyButton href="/stratify/new" variant="primary">
								Create your first chart
							</StratifyButton>
						{/if}
					</Card.Content>
				</Card.Root>
			{:else}
				<div
					class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[2560px]:grid-cols-6 gap-4"
				>
					{#each sections.my.items as chart (chart._id)}
						<ChartCard
							{chart}
							variant="my"
							deleting={deletingId === chart._id}
							onduplicate={() => handleDuplicate(chart)}
							ondelete={() => promptDelete(chart, 'my')}
						/>
					{/each}
				</div>
				{#if sections.my.totalPages > 1}
					<SectionPagination
						page={sections.my.page}
						totalPages={sections.my.totalPages}
						hrefFor={(n) => hrefWith({ myPage: n })}
						label="My charts pagination"
					/>
				{/if}
			{/if}
		</section>

		<!-- Shared with me -->
		{#if showSharedSection}
			<section class="mb-10">
				<h2 class="mb-5 flex items-center gap-3">
					<span class="font-sans text-xl font-semibold tracking-tight">Shared with me</span>
					{#if sections.shared}
						<span
							class="rounded-full bg-warm-grey px-2 py-0.5 font-mono text-[10px] text-mid-grey tabular-nums"
						>
							{sections.shared.total}
						</span>
					{/if}
				</h2>

				{#if loading.shared || !sections.shared}
					{@render skeletonGrid()}
				{:else}
					<div
						class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[2560px]:grid-cols-6 gap-4"
					>
						{#each sections.shared.items as chart (chart._id)}
							<ChartCard
								{chart}
								variant="shared"
								forking={forkingId === chart._id}
								onfork={() => handleFork(chart._id)}
							/>
						{/each}
					</div>
					{#if sections.shared.totalPages > 1}
						<SectionPagination
							page={sections.shared.page}
							totalPages={sections.shared.totalPages}
							hrefFor={(n) => hrefWith({ sharedPage: n })}
							label="Shared charts pagination"
						/>
					{/if}
				{/if}
			</section>
		{/if}

		<!-- Community Charts -->
		{#if showCommunitySection}
			<section>
				<h2 class="mb-5 flex items-center gap-3">
					<span class="font-sans text-xl font-semibold tracking-tight"> Community charts </span>
					{#if sections.community}
						<span
							class="rounded-full bg-warm-grey px-2 py-0.5 font-mono text-[10px] text-mid-grey tabular-nums"
						>
							{sections.community.total}
						</span>
					{/if}
				</h2>

				{#if loading.community}
					{@render skeletonGrid()}
				{:else if !sections.community || sections.community.total === 0}
					<Card.Root class="gap-0 border-dashed bg-white py-0 text-center shadow-none">
						<Card.Content class="px-6 py-12 text-sm text-mid-grey">
							No matching community charts
						</Card.Content>
					</Card.Root>
				{:else}
					<div
						class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[2560px]:grid-cols-6 gap-4"
					>
						{#each sections.community.items as chart (chart._id)}
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
					{#if sections.community.totalPages > 1}
						<SectionPagination
							page={sections.community.page}
							totalPages={sections.community.totalPages}
							hrefFor={(n) => hrefWith({ communityPage: n })}
							label="Community charts pagination"
						/>
					{/if}
				{/if}
			</section>
		{/if}
	</div>
</div>
