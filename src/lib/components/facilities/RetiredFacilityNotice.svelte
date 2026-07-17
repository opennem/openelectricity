<script>
	import { isFullyRetired, retiredAnchorMs } from '$lib/components/charts/facility/data-end.js';
	import { formatDateTime } from '$lib/utils/formatters';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';

	/**
	 * RetiredFacilityNotice — archival strip for fully-retired facilities (or a
	 * single retired unit, via `subject="unit"` in the unit detail sheet),
	 * shown above the charts on /facility/[code] and the /facilities detail
	 * pane. Built from the retired vocabulary used elsewhere (grey status dot,
	 * dashed rule, faded wash) so the surface reads as a historical record and
	 * the years-old chart window is explained. The date reuses retiredAnchorMs
	 * — the same anchor the chart windows scroll back to — so the notice and
	 * the charts can't disagree. Renders nothing when the units aren't all
	 * retired.
	 * @type {{ units: any[], subject?: 'facility' | 'unit', class?: string }}
	 */
	let { units = [], subject = 'facility', class: className = '' } = $props();

	let retired = $derived(isFullyRetired(units));
	let retiredDateLabel = $derived.by(() => {
		const anchor = retiredAnchorMs(units);
		if (anchor === null) return null;
		return (
			formatDateTime({ date: new Date(anchor), day: 'numeric', month: 'short', year: 'numeric' }) ||
			null
		);
	});
</script>

{#if retired}
	<div
		class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed border-mid-warm-grey/60 bg-light-warm-grey/50 px-4 py-3 text-sm text-mid-grey {className}"
	>
		<FacilityStatusIcon status="retired" />
		<span class="font-medium text-dark-grey">Retired {subject}</span>
		<span>
			·
			{#if retiredDateLabel}Operated until {retiredDateLabel} — the{:else}The{/if}
			charts below show its final days of generation.
		</span>
	</div>
{/if}
