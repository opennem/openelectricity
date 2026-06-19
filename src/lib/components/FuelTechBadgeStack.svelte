<script>
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';

	/**
	 * Row of fuel-tech badges — shared by the facility detail-panel header and the
	 * facilities list rows so the order and stacking stay identical everywhere.
	 * Overlapping by default (leftmost badge on top); pass `overlap={false}` to
	 * spread the badges out with a plain gap instead.
	 *
	 * Pass already-ordered, de-duplicated groups (e.g. from
	 * `getOrderedFuelTechGroups`) so callers control the ordering in one place.
	 *
	 * @type {{
	 *   groups?: Array<{ fueltech_id: string, status_id?: string, isCommissioning?: boolean }>,
	 *   size?: 'sm' | 'md' | 'lg',
	 *   darkMode?: boolean,
	 *   overlap?: boolean
	 * }}
	 */
	let { groups = [], size = 'lg', darkMode = false, overlap = true } = $props();

	// Overlapping (the default): badges tuck under each other with a white ring
	// for separation — `lg` mirrors the detail-panel header (spaced on mobile,
	// overlapped on desktop); smaller badges overlap at every width. When
	// `overlap` is false the badges spread out with a plain gap and no ring.
	let layout = $derived.by(() => {
		if (!overlap) return { gap: 'gap-1.5', margin: '', ring: '' };
		if (size === 'lg')
			return { gap: 'gap-1 md:gap-0', margin: 'md:-ml-2.5', ring: 'ring-2 ring-white' };
		if (size === 'md') return { gap: 'gap-0', margin: '-ml-2', ring: 'ring-2 ring-white' };
		return { gap: 'gap-0', margin: '-ml-1.5', ring: 'ring-2 ring-white' };
	});
</script>

{#if groups.length}
	<div class="flex items-center shrink-0 {layout.gap}">
		{#each groups as group, i (group.fueltech_id)}
			<span
				class="rounded-full block {layout.ring} {i > 0 ? layout.margin : ''}"
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
