<script>
	/**
	 * CorridorMetrics — the live corridor status treatment shared by the panel
	 * list rows and the detail stat block: sign-aware direction text and MW
	 * figure. `large` bumps the type scale for the detail block. (A nominal
	 * utilisation bar was removed — real interconnector limits are recomputed
	 * every dispatch interval, so a fixed denominator overstated precision;
	 * the AEMO nominal figures remain in region-geo's `capacityMW`.)
	 */

	import { corridorLiveStatus, directionLabel } from '$lib/flows/region-geo.js';

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
