<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { listCacheEntries } from '../_lib/api.js';
	import {
		FRESHNESS_OPTIONS,
		INTERVAL_OPTIONS,
		METRIC_OPTIONS,
		REGION_OPTIONS,
		WINDOW_OPTIONS,
		hrefFor,
		listQueryString,
		parseFilters
	} from '../_lib/cache-dashboard.js';
	import CacheEntryDetail from './CacheEntryDetail.svelte';
	import CacheTable from './CacheTable.svelte';

	let filters = $derived(parseFilters(page.url.searchParams));
	let selectedKey = $derived(page.url.searchParams.get('key') ?? '');
	let queryString = $derived(listQueryString(filters));

	/** @type {any} */
	let listing = $state(null);
	let listLoading = $state(false);
	let listError = $state('');
	let registryUnavailable = $state(false);
	let requestToken = 0;

	let selectedEntry = $derived(
		listing?.items?.find((/** @type {any} */ item) => item.cacheKey === selectedKey) ?? null
	);

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let searchDebounce;
	onDestroy(() => clearTimeout(searchDebounce));

	$effect(() => {
		loadList(queryString);
	});

	/** @param {string} qs */
	async function loadList(qs) {
		const token = ++requestToken;
		listLoading = true;
		listError = '';
		try {
			const data = await listCacheEntries(qs);
			if (token !== requestToken) return;
			listing = data;
			registryUnavailable = false;
		} catch (err) {
			if (token !== requestToken) return;
			if (/** @type {any} */ (err)?.status === 503) {
				registryUnavailable = true;
				listing = null;
			} else {
				listError = /** @type {any} */ (err)?.message ?? 'Failed to load the registry.';
			}
		} finally {
			if (token === requestToken) listLoading = false;
		}
	}

	/**
	 * @param {string} name
	 * @param {string} value
	 */
	function applyFilter(name, value) {
		const next = { ...filters, [name]: value, page: 1 };
		goto(hrefFor(next, selectedKey), { replaceState: true, keepFocus: true, noScroll: true });
	}

	/** @param {Event} event */
	function onSearchInput(event) {
		const value = /** @type {HTMLInputElement} */ (event.currentTarget).value;
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => applyFilter('q', value), 300);
	}

	/** @param {any} item */
	function hrefForRow(item) {
		return hrefFor(filters, item.cacheKey);
	}

	let prevHref = $derived(
		filters.page > 1 ? hrefFor({ ...filters, page: filters.page - 1 }, selectedKey) : null
	);
	let nextHref = $derived(
		listing && filters.page < listing.totalPages
			? hrefFor({ ...filters, page: filters.page + 1 }, selectedKey)
			: null
	);

	const SELECT_FILTERS = /** @type {const} */ ([
		['region', 'Region', REGION_OPTIONS],
		['metric', 'Metric', METRIC_OPTIONS],
		['interval', 'Interval', INTERVAL_OPTIONS]
	]);
</script>

<div class="min-h-screen bg-light-warm-grey">
	<header
		class="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-mid-warm-grey/40 bg-white px-6 py-4"
	>
		<h1 class="m-0 text-lg font-semibold text-dark-grey">Network Cache</h1>
		{#if listing}
			<span class="text-sm text-mid-grey"
				>{listing.total} registered entr{listing.total === 1 ? 'y' : 'ies'}</span
			>
		{/if}

		<div class="ml-auto flex flex-wrap items-center gap-3">
			{#each SELECT_FILTERS as [name, label, options] (name)}
				<label class="flex items-center gap-1.5 text-xs text-mid-grey">
					{label}
					<select
						value={filters[name]}
						onchange={(event) => applyFilter(name, event.currentTarget.value)}
						class="rounded-md border border-mid-warm-grey/50 bg-white px-2 py-1.5 text-xs text-dark-grey focus:border-dark-grey focus:outline-none"
					>
						<option value="">All</option>
						{#each options as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>
			{/each}

			<div class="flex overflow-hidden rounded-full border border-mid-warm-grey/50 text-xs">
				{#each ['', ...WINDOW_OPTIONS] as value (value)}
					<button
						type="button"
						class="px-3 py-1.5 transition-colors {filters.window === value
							? 'bg-dark-grey text-white'
							: 'bg-white text-dark-grey hover:bg-light-warm-grey'}"
						onclick={() => applyFilter('window', value)}
					>
						{value || 'All'}
					</button>
				{/each}
			</div>

			<div class="flex overflow-hidden rounded-full border border-mid-warm-grey/50 text-xs">
				{#each ['', ...FRESHNESS_OPTIONS] as value (value)}
					<button
						type="button"
						class="px-3 py-1.5 transition-colors {filters.freshness === value
							? 'bg-dark-grey text-white'
							: 'bg-white text-dark-grey hover:bg-light-warm-grey'}"
						onclick={() => applyFilter('freshness', value)}
					>
						{value || 'All'}
					</button>
				{/each}
			</div>

			<input
				type="search"
				value={filters.q}
				oninput={onSearchInput}
				placeholder="Filter canonical query…"
				class="w-56 rounded-md border border-mid-warm-grey/50 px-3 py-1.5 text-sm focus:border-dark-grey focus:outline-none"
			/>
		</div>
	</header>

	{#if registryUnavailable}
		<div class="p-6">
			<div class="rounded-lg border border-mid-warm-grey/40 bg-white p-6 text-sm text-mid-grey">
				<h2 class="m-0 mb-2 text-base font-semibold text-dark-grey">Registry unavailable</h2>
				<p class="m-0">
					The CACHE_REGISTRY D1 binding is not configured in this environment. Local development
					bypasses the edge cache, so there is nothing to inspect here — deploy with the binding
					configured to use this dashboard.
				</p>
			</div>
		</div>
	{:else}
		<div class="grid items-start gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_460px]">
			<section>
				{#if listError}
					<p class="mb-3 rounded-md bg-error-red/10 px-3 py-2 text-xs text-error-red">
						{listError}
					</p>
				{/if}
				{#if listLoading && !listing}
					<p class="text-sm text-mid-grey">Loading registry entries…</p>
				{:else if listing}
					<p class="m-0 mb-2 text-xs text-mid-grey">
						Freshness shown here is projected from registry metadata; select an entry to inspect
						what this data centre actually holds.
					</p>
					<CacheTable
						items={listing.items}
						{selectedKey}
						{hrefForRow}
						page={listing.page}
						totalPages={listing.totalPages}
						{prevHref}
						{nextHref}
					/>
				{/if}
			</section>

			<aside>
				{#if selectedKey}
					{#key selectedKey}
						<CacheEntryDetail
							entry={selectedEntry}
							cacheKey={selectedKey}
							onRefreshed={() => loadList(queryString)}
						/>
					{/key}
				{:else}
					<div
						class="rounded-lg border border-dashed border-mid-warm-grey/60 p-6 text-center text-sm text-mid-grey"
					>
						Select an entry to inspect its cached payload and refresh it.
					</div>
				{/if}
			</aside>
		</div>
	{/if}
</div>
