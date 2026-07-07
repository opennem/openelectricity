<script>
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';

	/**
	 * Technology filter row body: coloured icon badge + label + optional count.
	 * Shared by the desktop Technology dropdown and the mobile filter sheet so
	 * the row stays identical across breakpoints. `count` renders nothing while
	 * nullish — per-option facility counts can be wired in later without any
	 * component API change.
	 * @type {{
	 *   option: import('../../_utils/filter-options.js').FilterOption,
	 *   count?: number | null
	 * }}
	 */
	let { option, count = null } = $props();
</script>

<FuelTechBadge fuelTech={option.value} size="sm" showStatus={false} />
<span class="capitalize flex-1 text-left truncate">{option.label}</span>
{#if count !== null && count !== undefined}
	<span class="text-xs text-mid-grey tabular-nums shrink-0">{count}</span>
{/if}
