<script>
	import {
		formatBytes,
		formatDeadline,
		formatDuration,
		formatTimestamp
	} from '../_lib/cache-dashboard.js';

	/**
	 * @typedef {Object} Props
	 * @property {any[]} items - Presented registry rows
	 * @property {string} selectedKey - Full cache key of the selected entry
	 * @property {(item: any) => string} hrefForRow - Deep link selecting a row
	 * @property {number} page
	 * @property {number} totalPages
	 * @property {string | null} prevHref
	 * @property {string | null} nextHref
	 */

	/** @type {Props} */
	let { items, selectedKey, hrefForRow, page, totalPages, prevHref, nextHref } = $props();

	const STATUS_STYLES = {
		fresh: 'bg-success-green/15 text-success-green',
		stale: 'bg-amber-100 text-amber-700',
		expired: 'bg-mid-warm-grey/30 text-mid-grey'
	};
</script>

<div class="overflow-auto rounded-md border border-warm-grey bg-white">
	<table class="w-full border-collapse text-xs">
		<thead class="sticky top-0 z-10 bg-white">
			<tr class="border-b border-mid-warm-grey">
				{#each ['Canonical query', 'Status', 'Last stored', 'Age', 'Fresh deadline', 'Size', 'Last refresh'] as heading (heading)}
					<th
						class="whitespace-nowrap px-2 py-1.5 text-left font-space font-medium uppercase text-mid-grey"
					>
						{heading}
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each items as item (item.cacheKey)}
				<tr
					class="border-b border-light-warm-grey transition-colors hover:bg-light-warm-grey/40 {selectedKey ===
					item.cacheKey
						? 'bg-light-warm-grey/60'
						: ''}"
				>
					<td class="max-w-md px-2 py-1">
						<a
							href={hrefForRow(item)}
							data-sveltekit-replacestate
							data-sveltekit-noscroll
							class="block truncate font-mono text-dark-grey hover:underline"
							title={item.canonicalQuery}
						>
							{item.canonicalQuery}
						</a>
					</td>
					<td class="whitespace-nowrap px-2 py-1">
						<span
							class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {STATUS_STYLES[
								/** @type {'fresh' | 'stale' | 'expired'} */ (item.status)
							]}"
						>
							{item.status}
						</span>
						<span class="ml-1 text-mid-grey">{item.isHistorical ? 'hist' : 'live'}</span>
					</td>
					<td class="whitespace-nowrap px-2 py-1 font-mono tabular-nums text-dark-grey">
						{formatTimestamp(item.storedAt)}
					</td>
					<td class="whitespace-nowrap px-2 py-1 font-mono tabular-nums text-dark-grey">
						{formatDuration(item.ageMs)}
					</td>
					<td class="whitespace-nowrap px-2 py-1 font-mono tabular-nums text-dark-grey">
						{formatDeadline(item.freshUntil)}
					</td>
					<td class="whitespace-nowrap px-2 py-1 text-right font-mono tabular-nums text-dark-grey">
						{formatBytes(item.sizeBytes)}
					</td>
					<td class="whitespace-nowrap px-2 py-1">
						{#if item.lastError}
							<span class="text-error-red" title={item.lastError}>failed</span>
						{:else}
							<span class="text-success-green">ok</span>
							<span class="text-mid-grey">({formatDuration(item.refreshDurationMs)})</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if !items.length}
		<div class="flex items-center justify-center py-8 text-xs text-mid-grey">
			No cache entries match the current filters.
		</div>
	{/if}
</div>

{#if totalPages > 1}
	<nav class="mt-3 flex items-center justify-between text-xs text-mid-grey" aria-label="Pagination">
		{#if prevHref}
			<a href={prevHref} rel="prev" data-sveltekit-noscroll class="text-dark-grey hover:underline">
				← Previous
			</a>
		{:else}
			<span class="opacity-40">← Previous</span>
		{/if}
		<span>Page {page} of {totalPages}</span>
		{#if nextHref}
			<a href={nextHref} rel="next" data-sveltekit-noscroll class="text-dark-grey hover:underline">
				Next →
			</a>
		{:else}
			<span class="opacity-40">Next →</span>
		{/if}
	</nav>
{/if}
