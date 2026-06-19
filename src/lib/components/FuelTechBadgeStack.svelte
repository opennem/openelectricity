<script>
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';

	/**
	 * Overlapping row of fuel-tech badges — shared by the facility detail-panel
	 * header and the facilities list rows so the order, overlap and stacking stay
	 * identical everywhere. The leftmost badge sits on top.
	 *
	 * Pass already-ordered, de-duplicated groups (e.g. from
	 * `getOrderedFuelTechGroups`) so callers control the ordering in one place.
	 *
	 * @type {{
	 *   groups?: Array<{ fueltech_id: string, status_id?: string, isCommissioning?: boolean }>,
	 *   size?: 'sm' | 'md' | 'lg',
	 *   darkMode?: boolean
	 * }}
	 */
	let { groups = [], size = 'lg', darkMode = false } = $props();

	// `lg` mirrors the detail-panel header: badges are spaced on mobile and
	// overlap on desktop. Smaller badges (e.g. list cluster popups) overlap at
	// every width.
	let layout = $derived(
		size === 'lg'
			? { gap: 'gap-1 md:gap-0', overlap: 'md:-ml-2.5' }
			: size === 'md'
				? { gap: 'gap-0', overlap: '-ml-2' }
				: { gap: 'gap-0', overlap: '-ml-1.5' }
	);
</script>

{#if groups.length}
	<div class="flex items-center shrink-0 {layout.gap}">
		{#each groups as group, i (group.fueltech_id)}
			<span
				class="rounded-full ring-2 ring-white block {i > 0 ? layout.overlap : ''}"
				style="z-index: {groups.length - i};"
			>
				<FuelTechBadge
					fuelTech={group.fueltech_id}
					status={group.status_id}
					isCommissioning={group.isCommissioning}
					{size}
					{darkMode}
				/>
			</span>
		{/each}
	</div>
{/if}
