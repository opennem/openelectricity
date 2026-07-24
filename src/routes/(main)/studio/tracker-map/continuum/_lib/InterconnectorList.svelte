<script>
	/**
	 * Live interconnector list for the national dock — one row per
	 * `INTERCONNECTORS` corridor with its live MW and flow direction.
	 * Dumb: values come straight from the grid-live flows map.
	 */
	import { INTERCONNECTORS, NEAR_ZERO_MW, flowDestination } from '../../_shared/region-geo.js';
	import { displayCode } from '../../_shared/format.js';

	/** @type {{ flows?: Record<string, number> }} */
	let { flows = {} } = $props();
</script>

<section class="rounded-lg border border-mid-warm-grey/40 bg-white">
	<div class="border-b border-mid-warm-grey/40 px-4 py-2">
		<h3 class="m-0 text-xs font-semibold text-dark-grey">Interconnectors</h3>
	</div>
	<ul class="m-0 list-none divide-y divide-warm-grey/60 p-0">
		{#each INTERCONNECTORS as ic (ic.key)}
			{@const raw = flows[ic.key]}
			{@const mw = typeof raw === 'number' && Number.isFinite(raw) ? raw : null}
			{@const idle = mw !== null && Math.abs(mw) < NEAR_ZERO_MW}
			{@const direction =
				mw === null ? 'No live data' : idle ? 'Idle' : `→ ${displayCode(flowDestination(ic, mw))}`}
			<li class="flex items-center justify-between gap-3 px-4 py-2">
				<div class="min-w-0">
					<div class="truncate text-xs text-dark-grey">{ic.label}</div>
					<div class="text-[10px] text-mid-grey">{direction}</div>
				</div>
				<span class="shrink-0 font-mono text-xs {idle ? 'text-mid-grey' : 'text-dark-grey'}">
					{mw === null ? '—' : `${Math.round(Math.abs(mw))} MW`}
				</span>
			</li>
		{/each}
	</ul>
</section>
