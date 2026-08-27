<script>
	import { EDGE_MAX_AGE_MS } from '$lib/network-cache/freshness.js';
	import { showToast } from '$lib/stores/toast.js';
	import { getCacheEntry, refreshCacheEntry } from '../_lib/api.js';
	import {
		formatBytes,
		formatDeadline,
		formatDuration,
		formatTimestamp,
		jsonFilename,
		needsRefreshConfirm,
		presentRefreshFailure,
		presentRefreshResult,
		refreshConfirmMessage
	} from '../_lib/cache-dashboard.js';
	import JsonViewer from './JsonViewer.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {any} entry - Presented registry row, or null when the selected
	 *   key is not in the current page of results
	 * @property {string} cacheKey - Full synthetic cache key
	 * @property {() => void} [onRefreshed] - Called after a successful refresh
	 */

	/** @type {Props} */
	let { entry = null, cacheKey, onRefreshed } = $props();

	const STATUS_STYLES = {
		fresh: 'bg-success-green/15 text-success-green',
		stale: 'bg-amber-100 text-amber-700',
		expired: 'bg-mid-warm-grey/30 text-mid-grey'
	};

	/** @type {any} */
	let local = $state(null);
	let localLoading = $state(false);
	let localError = $state('');
	let requestToken = 0;

	let confirming = $state(false);
	let refreshing = $state(false);
	let refreshStartedAt = $state(0);
	let elapsedS = $state(0);
	/** @type {{ tone: string, message: string, preserved?: string } | null} */
	let refreshOutcome = $state(null);

	let canonicalQuery = $derived(entry?.canonicalQuery ?? cacheKey.split('?').slice(1).join('?'));
	// When the registry row is unknown, assume historical: the confirm step is
	// the safe default for a potentially tens-of-seconds refresh.
	let requiresConfirm = $derived(entry ? needsRefreshConfirm(entry) : true);

	$effect(() => {
		loadLocal(cacheKey);
	});

	$effect(() => {
		if (!refreshing) return;
		const id = setInterval(() => {
			elapsedS = Math.round((Date.now() - refreshStartedAt) / 1000);
		}, 1000);
		return () => clearInterval(id);
	});

	/** @param {string} key */
	async function loadLocal(key) {
		const token = ++requestToken;
		local = null;
		localError = '';
		confirming = false;
		refreshOutcome = null;
		localLoading = true;
		try {
			const data = await getCacheEntry(key);
			if (token !== requestToken) return;
			local = data;
		} catch (err) {
			if (token !== requestToken) return;
			localError = /** @type {any} */ (err)?.message ?? 'Failed to inspect the local cache.';
		} finally {
			if (token === requestToken) localLoading = false;
		}
	}

	function requestRefresh() {
		if (requiresConfirm && !confirming) {
			confirming = true;
			return;
		}
		runRefresh();
	}

	async function runRefresh() {
		const key = cacheKey;
		confirming = false;
		refreshing = true;
		refreshStartedAt = Date.now();
		elapsedS = 0;
		refreshOutcome = null;
		try {
			const result = await refreshCacheEntry(key);
			if (key !== cacheKey) return;
			refreshOutcome = presentRefreshResult(result);
			if (result.stored) {
				// Read-your-own-write: the endpoint resolves only after the edge
				// write, so patch the local view from its response.
				local = {
					found: true,
					key,
					value: result.value,
					storedAt: result.storedAt,
					sizeBytes: result.sizeBytes,
					status: 'fresh',
					ageMs: 0,
					freshUntil: entry ? result.storedAt + entry.freshMs : null,
					expiresAt: result.storedAt + EDGE_MAX_AGE_MS
				};
			}
			showToast('Cache entry refreshed.');
			onRefreshed?.();
		} catch (err) {
			if (key !== cacheKey) return;
			refreshOutcome = presentRefreshFailure(/** @type {any} */ (err));
		} finally {
			if (key === cacheKey) refreshing = false;
		}
	}
</script>

<div class="flex flex-col gap-4 rounded-lg border border-mid-warm-grey/40 bg-white p-4">
	<div>
		<h2 class="m-0 text-sm font-semibold text-dark-grey">Cache entry</h2>
		<p class="m-0 mt-1 break-all font-mono text-xs text-mid-grey">{canonicalQuery}</p>
	</div>

	<p class="m-0 rounded-md bg-light-warm-grey px-3 py-2 text-xs text-mid-grey">
		Cache API entries are local to each Cloudflare data centre — this page inspects and refreshes
		only the data centre serving your request. Other locations keep their entries until their own
		stale-while-revalidate schedule replaces them.
	</p>

	{#if entry}
		<section>
			<h3 class="m-0 text-xs font-medium uppercase tracking-wider text-mid-grey font-space">
				Projected (registry)
			</h3>
			<dl class="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
				<dt class="text-mid-grey">Status</dt>
				<dd class="m-0">
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {STATUS_STYLES[
							/** @type {'fresh' | 'stale' | 'expired'} */ (entry.status)
						]}"
					>
						{entry.status}
					</span>
					<span class="ml-1 text-mid-grey">{entry.isHistorical ? 'historical' : 'live'}</span>
				</dd>
				<dt class="text-mid-grey">Last stored</dt>
				<dd class="m-0 font-mono tabular-nums text-dark-grey">
					{formatTimestamp(entry.storedAt)} ({formatDuration(entry.ageMs)} ago)
				</dd>
				<dt class="text-mid-grey">Fresh until</dt>
				<dd class="m-0 font-mono tabular-nums text-dark-grey">
					{formatTimestamp(entry.freshUntil)} ({formatDeadline(entry.freshUntil)})
				</dd>
				<dt class="text-mid-grey">Size</dt>
				<dd class="m-0 font-mono tabular-nums text-dark-grey">{formatBytes(entry.sizeBytes)}</dd>
				<dt class="text-mid-grey">Last refresh</dt>
				<dd class="m-0 text-dark-grey">
					took {formatDuration(entry.refreshDurationMs)}
					{#if entry.lastError}
						<span class="mt-0.5 block break-words text-error-red">
							{entry.lastError} ({formatTimestamp(entry.lastErrorAt)})
						</span>
					{/if}
				</dd>
			</dl>
		</section>
	{:else}
		<p class="m-0 text-xs text-mid-grey">
			This entry is not in the current page of registry results — showing the local data centre
			state only.
		</p>
	{/if}

	<section>
		<h3 class="m-0 text-xs font-medium uppercase tracking-wider text-mid-grey font-space">
			Local (this data centre)
		</h3>
		{#if localLoading}
			<p class="m-0 mt-2 text-xs text-mid-grey">Reading the local cache…</p>
		{:else if localError}
			<p class="m-0 mt-2 text-xs text-error-red">{localError}</p>
		{:else if local && !local.found}
			<p class="m-0 mt-2 text-xs text-mid-grey">
				Not present in this data centre. The registry entry was written by another location, or the
				entry has been evicted here.
			</p>
		{:else if local}
			<dl class="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
				<dt class="text-mid-grey">Status</dt>
				<dd class="m-0">
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {STATUS_STYLES[
							/** @type {'fresh' | 'stale' | 'expired'} */ (local.status)
						]}"
					>
						{local.status}
					</span>
				</dd>
				<dt class="text-mid-grey">Stored</dt>
				<dd class="m-0 font-mono tabular-nums text-dark-grey">
					{formatTimestamp(local.storedAt)}
				</dd>
				<dt class="text-mid-grey">Fresh until</dt>
				<dd class="m-0 font-mono tabular-nums text-dark-grey">
					{#if local.freshUntil}
						{formatTimestamp(local.freshUntil)} ({formatDeadline(local.freshUntil)})
					{:else}
						–
					{/if}
				</dd>
				<dt class="text-mid-grey">Size</dt>
				<dd class="m-0 font-mono tabular-nums text-dark-grey">{formatBytes(local.sizeBytes)}</dd>
			</dl>
			<div class="mt-3">
				<JsonViewer value={local.value} filename={jsonFilename(canonicalQuery)} />
			</div>
		{/if}
	</section>

	<section class="border-t border-light-warm-grey pt-3">
		{#if confirming}
			<p class="m-0 mb-2 text-xs text-dark-grey">{refreshConfirmMessage({ canonicalQuery })}</p>
			<div class="flex gap-2">
				<button
					type="button"
					class="rounded-md bg-dark-grey px-3 py-1.5 text-xs text-white transition-colors hover:bg-black"
					onclick={runRefresh}
				>
					Refresh now
				</button>
				<button
					type="button"
					class="rounded-md border border-mid-warm-grey/50 bg-white px-3 py-1.5 text-xs text-dark-grey transition-colors hover:bg-light-warm-grey"
					onclick={() => (confirming = false)}
				>
					Cancel
				</button>
			</div>
		{:else}
			<button
				type="button"
				class="rounded-md bg-dark-grey px-3 py-1.5 text-xs text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
				disabled={refreshing}
				onclick={requestRefresh}
			>
				{#if refreshing}
					Refreshing… {elapsedS}s
				{:else}
					Refresh this data centre
				{/if}
			</button>
		{/if}

		{#if refreshOutcome}
			<div
				class="mt-3 rounded-md px-3 py-2 text-xs {refreshOutcome.tone === 'success'
					? 'bg-success-green/10 text-success-green'
					: refreshOutcome.tone === 'warning'
						? 'bg-amber-50 text-amber-700'
						: 'bg-error-red/10 text-error-red'}"
			>
				<p class="m-0">{refreshOutcome.message}</p>
				{#if refreshOutcome.preserved}
					<p class="m-0 mt-1 text-dark-grey">{refreshOutcome.preserved}</p>
				{/if}
			</div>
		{/if}
	</section>
</div>
