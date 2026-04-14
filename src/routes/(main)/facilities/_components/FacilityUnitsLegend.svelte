<script>
	/**
	 * FacilityUnitsLegend — legend-style unit list for the facility detail panel.
	 *
	 * Displays units as a single horizontal row of pills that scrolls when the
	 * unit count exceeds the container width. Each pill shows a coloured dot
	 * (unit-specific colour), unit code, and capacity.
	 */

	import { buildUnitColourMap } from '$lib/components/charts/facility/helpers.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { getNumberFormat } from '$lib/utils/formatters';

	const formatter0 = getNumberFormat(0);
	const formatter1 = getNumberFormat(1);

	/** @type {{ units: any[] }} */
	let { units } = $props();

	/**
	 * @param {number | undefined | null} value
	 * @returns {string}
	 */
	function formatCapacity(value) {
		if (value === undefined || value === null) return '–';
		if (value < 10) return formatter1.format(value);
		return formatter0.format(value);
	}

	/**
	 * @param {string} ftCode
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	let unitColourMap = $derived(buildUnitColourMap(units, getFuelTechColor));
</script>

{#if units?.length}
	<div
		class="flex overflow-x-auto px-6 py-3 divide-x divide-warm-grey scrollbar-thin scrollbar-thumb-warm-grey scrollbar-track-transparent"
	>
		{#each units as unit (unit.code)}
			{@const colour = unitColourMap[unit.code] ?? '#888'}
			{@const capacity = unit.capacity_maximum ?? unit.capacity_registered}
			{@const isRetired = unit.status_id === 'retired'}
			<div
				class="shrink-0 inline-flex items-center gap-2 px-4 text-xs"
				class:opacity-60={isRetired}
				title={unit.fueltech_id}
			>
				<span
					class="w-3.5 h-3.5 rounded-full shrink-0"
					style:background-color={colour}
				></span>
				<span class="font-mono text-dark-grey">{unit.code}</span>
				<span class="text-mid-grey">·</span>
				{#if unit.capacity_storage}
					<span class="font-mono font-medium text-dark-grey">
						{formatCapacity(unit.capacity_storage)}
					</span>
					<span class="text-mid-grey text-xxs">MWh</span>
					<span class="text-mid-grey">/</span>
				{/if}
				<span class="font-mono font-medium text-dark-grey">{formatCapacity(capacity)}</span>
				<span class="text-mid-grey text-xxs">MW</span>
			</div>
		{/each}
	</div>
{/if}
