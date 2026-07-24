<script>
	/**
	 * "Facilities in view" — the largest facilities inside the current map
	 * bounds, capacity-sorted. Camera-first: picking a row asks the parent to
	 * fly the camera there; selection state follows the camera.
	 */

	/**
	 * @type {{
	 *   rows?: { facility: any, capacity: number }[],
	 *   total?: number,
	 *   selectedCode?: string,
	 *   onpick?: (facility: any) => void
	 * }}
	 */
	let { rows = [], total = 0, selectedCode = undefined, onpick = undefined } = $props();
</script>

<section class="rounded-lg border border-mid-warm-grey/40 bg-white">
	<div class="flex items-center justify-between gap-2 border-b border-mid-warm-grey/40 px-4 py-2">
		<h3 class="m-0 text-xs font-semibold text-dark-grey">Facilities in view</h3>
		<span class="text-[10px] text-mid-grey">
			{total > rows.length ? `largest ${rows.length} of ${total}` : `${rows.length}`}
		</span>
	</div>
	{#if rows.length === 0}
		<p class="m-0 px-4 py-3 text-xs text-mid-grey">No facilities in the current view.</p>
	{:else}
		<ul class="m-0 list-none divide-y divide-warm-grey/60 p-0">
			{#each rows as row (row.facility.code)}
				<li>
					<button
						type="button"
						class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-light-warm-grey {row
							.facility.code === selectedCode
							? 'bg-light-warm-grey'
							: ''}"
						onclick={() => onpick?.(row.facility)}
					>
						<span class="min-w-0 truncate text-xs text-dark-grey">{row.facility.name}</span>
						<span class="shrink-0 font-mono text-[11px] text-mid-grey">
							{Math.round(row.capacity)} MW
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
