<script>
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	/**
	 * Prev/next pagination for one chart-list section. `hrefFor(page)` builds
	 * the link so the caller can preserve the other section's page and any
	 * active filters in the query string.
	 * @type {{
	 *   page: number,
	 *   totalPages: number,
	 *   hrefFor: (page: number) => string,
	 *   label?: string
	 * }}
	 */
	let { page, totalPages, hrefFor, label = 'Pagination' } = $props();

	let hasPrev = $derived(page > 1);
	let hasNext = $derived(page < totalPages);
</script>

<nav class="flex items-center justify-center gap-4 mt-4" aria-label={label}>
	{#if hasPrev}
		<a
			href={hrefFor(page - 1)}
			class="inline-flex items-center gap-1 text-[10px] text-dark-grey hover:text-mid-grey"
			rel="prev"
		>
			<ChevronLeftIcon size={12} />
			Previous
		</a>
	{:else}
		<span class="inline-flex items-center gap-1 text-[10px] text-mid-grey/50 cursor-not-allowed">
			<ChevronLeftIcon size={12} />
			Previous
		</span>
	{/if}

	<span class="text-[10px] text-mid-grey tabular-nums">
		Page {page} of {totalPages}
	</span>

	{#if hasNext}
		<a
			href={hrefFor(page + 1)}
			class="inline-flex items-center gap-1 text-[10px] text-dark-grey hover:text-mid-grey"
			rel="next"
		>
			Next
			<ChevronRightIcon size={12} />
		</a>
	{:else}
		<span class="inline-flex items-center gap-1 text-[10px] text-mid-grey/50 cursor-not-allowed">
			Next
			<ChevronRightIcon size={12} />
		</span>
	{/if}
</nav>
