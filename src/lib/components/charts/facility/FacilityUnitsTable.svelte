<script>
	/**
	 * FacilityUnitsTable - Shows facility units with timeline-like card design
	 *
	 * Supports compact (default) and detailed modes.
	 * Detailed mode shows additional info: emissions factor, dispatch type, capacity breakdown, data dates.
	 */

	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import { fuelTechColourMap, statusColours } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { buildUnitColourMap } from './helpers.js';

	const formatter0 = getNumberFormat(0);
	const formatter1 = getNumberFormat(1);
	const formatter2 = getNumberFormat(2);

	/**
	 * Format capacity value with conditional decimal places
	 * @param {number | undefined | null} value
	 * @returns {string}
	 */
	function formatCapacity(value) {
		if (value === undefined || value === null) return '-';
		if (value < 10) return formatter1.format(value);
		return formatter0.format(value);
	}

	/**
	 * Format emissions factor, converting from tCO₂/MWh to kgCO₂/MWh
	 * @param {number | undefined | null} value - Value in tCO₂/MWh
	 * @returns {string}
	 */
	function formatEmissions(value) {
		if (value === undefined || value === null || value === 0) return '-';
		return formatter0.format(value * 1000);
	}

	/**
	 * Format an ISO date string to a short date display
	 * @param {string | undefined | null} dateStr
	 * @returns {string}
	 */
	function formatShortDate(dateStr) {
		if (!dateStr) return '-';
		try {
			const date = new Date(dateStr);
			return new Intl.DateTimeFormat('en-AU', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			}).format(date);
		} catch {
			return '-';
		}
	}

	/**
	 * Get color for a fuel tech code
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * Check if fuel tech needs dark text
	 * @param {string} ftCode
	 * @returns {boolean}
	 */
	function needsDarkText(ftCode) {
		const lightBgFuelTechs = ['solar_utility', 'solar_rooftop', 'solar_thermal', 'solar'];
		return lightBgFuelTechs.includes(ftCode);
	}

	/**
	 * @typedef {Object} Props
	 * @property {any[]} units - Array of unit objects
	 * @property {Record<string, string>} [unitColours] - Optional pre-computed colour map
	 * @property {boolean} [compact] - Use compact styling
	 * @property {boolean} [detailed] - Show additional unit details (emissions, dates, dispatch type)
	 */

	/** @type {Props} */
	let { units, unitColours = undefined, compact = false, detailed = false } = $props();

	// Compute colours if not provided
	let colours = $derived.by(() => {
		if (unitColours) return unitColours;
		if (!units?.length) return {};
		return buildUnitColourMap(units, getFuelTechColor);
	});
</script>

{#if units?.length}
	<ol class="divide-y divide-mid-warm-grey">
		{#each units as unit (unit.code)}
			{@const bgColor = colours[unit.code] || getFuelTechColor(unit.fueltech_id)}
			{@const isDarkText = needsDarkText(unit.fueltech_id)}
			{@const hasBothCapacities = unit.capacity_maximum && unit.capacity_registered && unit.capacity_maximum !== unit.capacity_registered}

			<li
				class="hover:bg-light-warm-grey transition-colors"
				class:px-3={!compact}
				class:py-3={!compact}
				class:px-2={compact}
				class:py-2={compact}
			>
				<div class="grid grid-cols-12 items-center gap-3">
					<!-- Fuel Tech Icon + Unit Info -->
					<div class="col-span-8 flex items-center gap-3 min-w-0">
						<span
							class="rounded-full flex-shrink-0 flex items-center justify-center"
							class:p-1.5={compact}
							class:p-2={!compact}
							class:text-black={isDarkText}
							class:text-white={!isDarkText}
							style="background-color: {bgColor};"
						>
							<FuelTechIcon fuelTech={unit.fueltech_id} sizeClass={compact ? 4 : 5} />
						</span>

						<div class="flex items-center gap-2 min-w-0">
							<span
								class="font-mono font-medium text-dark-grey truncate"
								class:text-sm={compact}
								class:text-base={!compact}
							>
								{unit.code}
							</span>
							<span class="text-mid-grey truncate" class:text-xs={compact} class:text-sm={!compact}>
								{fuelTechNameMap[unit.fueltech_id] || unit.fueltech_id}
							</span>
						</div>
					</div>

					<!-- Status -->
					<div class="col-span-2 flex items-center gap-1.5 justify-end">
						<span
							class="rounded-full"
							class:w-2.5={compact}
							class:h-2.5={compact}
							class:w-3={!compact}
							class:h-3={!compact}
							style="background-color: {statusColours[unit.status_id] || statusColours.operating};"
						></span>
						<span class="capitalize text-mid-grey" class:text-xs={compact} class:text-sm={!compact}>
							{unit.status_id}
						</span>
					</div>

					<!-- Capacity -->
					<div class="col-span-2 flex items-baseline gap-1 justify-end">
						<span
							class="font-mono text-dark-grey"
							class:text-sm={compact}
							class:text-base={!compact}
							title={unit.capacity_maximum ? 'Maximum Capacity' : 'Registered Capacity'}
						>
							{formatCapacity(unit.capacity_maximum || unit.capacity_registered)}
						</span>
						<span class="text-mid-grey" class:text-xs={compact} class:text-sm={!compact}>MW</span>
					</div>
				</div>

				<!-- Detailed Info Row -->
				{#if detailed}
					<div class="mt-1.5 ml-11 flex items-center gap-x-4 gap-y-1 flex-wrap text-xxs text-mid-grey">
						{#if unit.dispatch_type}
							<span class="inline-flex items-center gap-1">
								<span class="text-warm-grey">Type:</span>
								<span class="capitalize">{unit.dispatch_type.toLowerCase()}</span>
							</span>
						{/if}

						{#if hasBothCapacities}
							<span class="inline-flex items-center gap-1">
								<span class="text-warm-grey">Reg:</span>
								<span class="font-mono">{formatCapacity(unit.capacity_registered)}</span>
								<span>MW</span>
							</span>
						{/if}

						{#if unit.emissions_factor_co2}
							<span class="inline-flex items-center gap-1">
								<span class="text-warm-grey">Emissions:</span>
								<span class="font-mono">{formatEmissions(unit.emissions_factor_co2)}</span>
								<span>kgCO₂/MWh</span>
							</span>
						{/if}

						{#if unit.data_first_seen}
							<span class="inline-flex items-center gap-1">
								<span class="text-warm-grey">First seen:</span>
								<span>{formatShortDate(unit.data_first_seen)}</span>
							</span>
						{/if}

						{#if unit.data_last_seen}
							<span class="inline-flex items-center gap-1">
								<span class="text-warm-grey">Last seen:</span>
								<span>{formatShortDate(unit.data_last_seen)}</span>
							</span>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
{/if}
