<script>
	/**
	 * Interconnector rows — live MW, sign-aware direction arrow and a capacity
	 * fraction bar per corridor. At the NEM level the direction reads as
	 * "exporter → importer"; with `relativeTo` set (region level) each row also
	 * tags whether the focus region is importing or exporting on that corridor.
	 */

	import { NEAR_ZERO_MW, directionLabel, flowDestination } from '../../_shared/region-geo.js';
	import { numberOrUndefined } from '../../_shared/format.js';

	/**
	 * @type {{
	 *   interconnectors: import('../../_shared/region-geo.js').InterconnectorDef[],
	 *   flows?: Record<string, number>,
	 *   relativeTo?: string
	 * }}
	 */
	let { interconnectors, flows = {}, relativeTo = undefined } = $props();

	/**
	 * Import/export tag for the focus region: the region imports when it sits
	 * at the receiving end of the corridor.
	 * @param {import('../../_shared/region-geo.js').InterconnectorDef} ic
	 * @param {number} value
	 * @returns {'Importing' | 'Exporting'}
	 */
	function relativeTag(ic, value) {
		return flowDestination(ic, value) === relativeTo ? 'Importing' : 'Exporting';
	}
</script>

<ul class="divide-y divide-warm-grey">
	{#each interconnectors as ic (ic.key)}
		{@const value = numberOrUndefined(flows?.[ic.key])}
		{@const mw = value !== undefined ? Math.abs(value) : undefined}
		{@const idle = mw === undefined || mw < NEAR_ZERO_MW}
		{@const fraction = mw !== undefined ? Math.min(1, mw / ic.capacityMW) : 0}
		<li class="flex flex-col gap-1 py-2">
			<div class="flex items-baseline justify-between gap-2">
				<div class="min-w-0">
					<div class="truncate text-xs font-medium text-dark-grey">{ic.label}</div>
					<div class="font-mono text-[10px] {idle ? 'text-mid-warm-grey' : 'text-mid-grey'}">
						{#if value === undefined}
							awaiting dispatch
						{:else if idle}
							idle
						{:else}
							{directionLabel(ic, value)}
						{/if}
					</div>
				</div>
				<div class="shrink-0 text-right">
					<span class="font-mono text-sm {idle ? 'text-mid-warm-grey' : 'text-dark-grey'}">
						{mw !== undefined ? Math.round(mw) : '—'}
					</span>
					<span class="ml-0.5 text-[10px] text-mid-grey">MW</span>
					{#if relativeTo && value !== undefined && !idle}
						<div
							class="text-[10px] font-medium {relativeTag(ic, value) === 'Importing'
								? 'text-[#1A6E87]'
								: 'text-[#C74523]'}"
						>
							{relativeTag(ic, value)}
						</div>
					{/if}
				</div>
			</div>
			<div
				class="h-1 w-full overflow-hidden rounded-full bg-light-warm-grey"
				title="{mw !== undefined ? Math.round(mw) : 0} of {ic.capacityMW} MW"
			>
				<div
					class="h-full rounded-full transition-[width] duration-500 {idle
						? 'bg-mid-warm-grey'
						: 'bg-[#5f7690]'}"
					style:width="{fraction * 100}%"
				></div>
			</div>
		</li>
	{/each}
</ul>
