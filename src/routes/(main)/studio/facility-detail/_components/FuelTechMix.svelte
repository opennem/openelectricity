<script>
	import { groupUnits } from '../../../facilities/_utils/units.js';
	import { fuelTechName } from '$lib/fuel_techs.js';

	/** @type {{ facility: any }} */
	let { facility } = $props();

	let groups = $derived.by(() => {
		const raw = groupUnits(facility, { skipBattery: true });
		/** @type {Map<string, { fueltech_id: string, totalCapacity: number, bgColor: string }>} */
		const merged = new Map();
		for (const g of raw) {
			if (g.totalCapacity <= 0) continue;
			const existing = merged.get(g.fueltech_id);
			if (existing) {
				existing.totalCapacity += g.totalCapacity;
			} else {
				merged.set(g.fueltech_id, {
					fueltech_id: g.fueltech_id,
					totalCapacity: g.totalCapacity,
					bgColor: g.bgColor
				});
			}
		}
		return Array.from(merged.values()).sort((a, b) => b.totalCapacity - a.totalCapacity);
	});

	let totalCapacity = $derived(groups.reduce((sum, g) => sum + g.totalCapacity, 0));

	let segments = $derived(
		groups.map((g) => ({
			fueltech_id: g.fueltech_id,
			label: fuelTechName(g.fueltech_id),
			colour: g.bgColor,
			capacity: g.totalCapacity,
			pct: totalCapacity > 0 ? (g.totalCapacity / totalCapacity) * 100 : 0
		}))
	);
</script>

{#if segments.length > 0 && totalCapacity > 0}
	<div class="flex flex-col gap-2">
		<!-- Stacked bar -->
		<div class="flex h-2 w-full overflow-hidden rounded-full">
			{#each segments as seg (seg.fueltech_id)}
				<div
					style="width: {seg.pct}%; background-color: {seg.colour}"
					title="{seg.label}: {seg.pct.toFixed(1)}%"
				></div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap gap-x-3 gap-y-1">
			{#each segments as seg (seg.fueltech_id)}
				<div class="flex items-center gap-1">
					<span
						class="inline-block h-2 w-2 shrink-0 rounded-full"
						style="background-color: {seg.colour}"
					></span>
					<span class="text-xxs text-mid-grey">
						{seg.label}
					</span>
					<span class="text-xxs font-mono tabular-nums text-mid-grey">
						{seg.pct.toFixed(1)}%
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
