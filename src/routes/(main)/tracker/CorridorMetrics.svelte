<script>
	/**
	 * CorridorMetrics — the live corridor status treatment shared by the panel
	 * list rows and the detail stat block: sign-aware direction text, MW figure
	 * and a capacity-fraction bar. `large` bumps the type scale for the detail
	 * block.
	 */

	import { corridorLiveStatus, directionLabel } from '$lib/flows/region-geo.js';
	import { CORRIDOR_COLOUR } from '$lib/flows/format.js';

	/**
	 * @type {{
	 *   interconnector: import('$lib/flows/region-geo.js').InterconnectorDef,
	 *   flows?: Record<string, number>,
	 *   large?: boolean
	 * }}
	 */
	let { interconnector, flows = {}, large = false } = $props();

	let status = $derived(corridorLiveStatus(flows, interconnector));
</script>

<div class="space-y-1.5">
	<div class="flex items-baseline justify-between gap-2">
		<div
			class="font-mono {large ? 'text-xs' : 'text-[10px]'} {status.idle
				? 'text-mid-warm-grey'
				: 'text-mid-grey'}"
		>
			{#if status.value === undefined}
				awaiting dispatch
			{:else if status.idle}
				idle
			{:else}
				{directionLabel(interconnector, status.value)}
			{/if}
		</div>
		<div class="shrink-0 text-right">
			<span
				class="font-mono {large ? 'text-lg' : 'text-sm'} {status.idle
					? 'text-mid-warm-grey'
					: 'text-dark-grey'}"
			>
				{status.mw !== undefined ? Math.round(status.mw) : '—'}
			</span>
			<span class="ml-0.5 {large ? 'text-xs' : 'text-[10px]'} text-mid-grey">MW</span>
		</div>
	</div>

	<div
		class="h-1 w-full overflow-hidden rounded-full bg-light-warm-grey"
		title="{status.mw !== undefined ? Math.round(status.mw) : 0} of {interconnector.capacityMW} MW"
	>
		<div
			class="h-full rounded-full transition-[width] duration-500 {status.idle
				? 'bg-mid-warm-grey'
				: ''}"
			style:background-color={status.idle ? undefined : CORRIDOR_COLOUR}
			style:width="{status.fraction * 100}%"
		></div>
	</div>
</div>
