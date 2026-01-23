<script>
	/**
	 * FacilityUnitsTable - Reusable table showing facility units with fuel tech colors
	 */

	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { buildUnitColourMap } from './helpers.js';

	/**
	 * Get color for a fuel tech code
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} Props
	 * @property {any[]} units - Array of unit objects
	 * @property {Record<string, string>} [unitColours] - Optional pre-computed colour map
	 * @property {boolean} [compact] - Use compact styling
	 */

	/** @type {Props} */
	let { units, unitColours = undefined, compact = false } = $props();

	// Compute colours if not provided
	let colours = $derived.by(() => {
		if (unitColours) return unitColours;
		if (!units?.length) return {};
		return buildUnitColourMap(units, getFuelTechColor);
	});
</script>

{#if units?.length}
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-warm-grey">
					<th class="text-left py-2 px-3" class:py-1={compact} class:px-2={compact}>Code</th>
					<th class="text-left py-2 px-3" class:py-1={compact} class:px-2={compact}>Fuel Tech</th>
					<th class="text-left py-2 px-3" class:py-1={compact} class:px-2={compact}>Type</th>
					<th class="text-right py-2 px-3" class:py-1={compact} class:px-2={compact}>
						Capacity (MW)
					</th>
					<th class="text-left py-2 px-3" class:py-1={compact} class:px-2={compact}>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each units as unit (unit.code)}
					<tr class="border-b border-light-warm-grey hover:bg-light-warm-grey">
						<td class="py-2 px-3 font-mono" class:py-1={compact} class:px-2={compact}
							>{unit.code}</td
						>
						<td class="py-2 px-3" class:py-1={compact} class:px-2={compact}>
							<span class="flex items-center gap-2">
								<span
									class="w-3 h-3 rounded-full flex-shrink-0"
									class:w-2={compact}
									class:h-2={compact}
									style="background-color: {colours[unit.code] ||
										getFuelTechColor(unit.fueltech_id)}"
								></span>
								<span class:text-xs={compact}>
									{fuelTechNameMap[unit.fueltech_id] || unit.fueltech_id}
								</span>
							</span>
						</td>
						<td class="py-2 px-3" class:py-1={compact} class:px-2={compact}>
							{unit.dispatch_type === 'LOAD' ? 'Load' : 'Generator'}
						</td>
						<td class="py-2 px-3 text-right font-mono" class:py-1={compact} class:px-2={compact}>
							{(unit.capacity_registered || unit.capacity_maximum)?.toLocaleString() || '-'}
						</td>
						<td class="py-2 px-3 capitalize" class:py-1={compact} class:px-2={compact}
							>{unit.status_id}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
