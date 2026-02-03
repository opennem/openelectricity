<script>
	/**
	 * FacilityUnitsTable - Shows facility units with timeline-like card design
	 */

	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import { fuelTechColourMap, statusColours } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { buildUnitColourMap } from './helpers.js';

	const formatter0 = getNumberFormat(0);
	const formatter1 = getNumberFormat(1);

	const BATTERY_FUEL_TECHS = ['battery', 'battery_charging', 'battery_discharging'];

	/**
	 * Format capacity value with conditional decimal places
	 * @param {number | undefined} value
	 * @returns {string}
	 */
	function formatCapacity(value) {
		if (value === undefined || value === null) return '-';
		if (value < 10) return formatter1.format(value);
		return formatter0.format(value);
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
	 */

	/** @type {Props} */
	let { units, unitColours = undefined, compact = false } = $props();

	// Compute colours if not provided
	let colours = $derived.by(() => {
		if (unitColours) return unitColours;
		if (!units?.length) return {};
		return buildUnitColourMap(units, getFuelTechColor);
	});

	/**
	 * Process units to group battery charging/discharging pairs
	 * @typedef {Object} SingleUnit
	 * @property {'single'} type
	 * @property {any} unit
	 *
	 * @typedef {Object} BatteryGroup
	 * @property {'battery-group'} type
	 * @property {string} code
	 * @property {any[]} subUnits
	 * @property {number} capacity
	 * @property {string} status_id
	 *
	 * @typedef {SingleUnit | BatteryGroup} ProcessedUnit
	 */
	/**
	 * Derive main battery code from charging/discharging code
	 * e.g., WDBESSL2 -> WDBESS2, WDBESSG2 -> WDBESS2
	 * @param {string} code
	 * @returns {string}
	 */
	function deriveBatteryCode(code) {
		// Remove L or G followed by number(s) at the end
		return code.replace(/[LG](\d+)$/, '$1');
	}

	let processedUnits = $derived.by(() => {
		if (!units?.length) return [];

		/** @type {(SingleUnit | BatteryGroup)[]} */
		const result = [];
		/** @type {any[]} */
		const batteryUnits = [];

		// Separate battery units from other units
		for (const unit of units) {
			if (BATTERY_FUEL_TECHS.includes(unit.fueltech_id)) {
				batteryUnits.push(unit);
			} else {
				result.push({ type: 'single', unit });
			}
		}

		// Group battery units if we have any
		if (batteryUnits.length > 0) {
			// Find the main battery unit (fueltech_id === 'battery')
			const mainBattery = batteryUnits.find((u) => u.fueltech_id === 'battery');
			// Get charging/discharging units for sub-rows
			const subUnits = batteryUnits.filter(
				(u) => u.fueltech_id === 'battery_charging' || u.fueltech_id === 'battery_discharging'
			);

			if (mainBattery) {
				const capacity = Number(mainBattery.capacity_maximum || mainBattery.capacity_registered) || 0;
				result.push({
					type: 'battery-group',
					code: mainBattery.code,
					subUnits,
					capacity,
					status_id: mainBattery.status_id
				});
			} else if (subUnits.length > 0) {
				// No main battery unit - derive code from charging/discharging codes
				const derivedCode = deriveBatteryCode(subUnits[0].code);
				// Use max capacity from sub-units
				const capacity = Math.max(
					...subUnits.map((u) => Number(u.capacity_maximum || u.capacity_registered) || 0)
				);
				result.push({
					type: 'battery-group',
					code: derivedCode,
					subUnits,
					capacity,
					status_id: subUnits[0].status_id
				});
			}
		}

		return result;
	});
</script>

{#if processedUnits?.length}
	<ol class="divide-y divide-mid-warm-grey">
		{#each processedUnits as item (item.type === 'single' ? item.unit.code : item.code)}
			{#if item.type === 'single'}
				{@const unit = item.unit}
				{@const bgColor = colours[unit.code] || getFuelTechColor(unit.fueltech_id)}
				{@const isDarkText = needsDarkText(unit.fueltech_id)}

				<li
					class="grid grid-cols-12 items-center gap-3 hover:bg-light-warm-grey transition-colors"
					class:px-3={!compact}
					class:py-3={!compact}
					class:px-2={compact}
					class:py-2={compact}
				>
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
							<span
								class="text-mid-grey truncate"
								class:text-xs={compact}
								class:text-sm={!compact}
							>
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
						<span
							class="capitalize text-mid-grey"
							class:text-xs={compact}
							class:text-sm={!compact}
						>
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
				</li>
			{:else if item.type === 'battery-group'}
				<!-- Battery Group -->
				{@const bgColor = getFuelTechColor('battery_discharging')}
				{@const isDarkText = false}
				{@const batteryCode = item.code}
				{@const batteryCapacity = item.capacity}
				{@const batterySubUnits = item.subUnits}
				{@const batteryStatusId = item.status_id}

				<!-- Parent Battery Row -->
				<li
					class="grid grid-cols-12 items-center gap-3 hover:bg-light-warm-grey transition-colors"
					class:px-3={!compact}
					class:py-3={!compact}
					class:px-2={compact}
					class:py-2={compact}
				>
					<div class="col-span-8 flex items-center gap-3 min-w-0">
						<span
							class="rounded-full flex-shrink-0 flex items-center justify-center"
							class:p-1.5={compact}
							class:p-2={!compact}
							class:text-black={isDarkText}
							class:text-white={!isDarkText}
							style="background-color: {bgColor};"
						>
							<FuelTechIcon fuelTech="battery_discharging" sizeClass={compact ? 4 : 5} />
						</span>

						<div class="flex items-center gap-2 min-w-0">
							<span
								class="font-mono font-medium text-dark-grey truncate"
								class:text-sm={compact}
								class:text-base={!compact}
							>
								{batteryCode}
							</span>
							<span
								class="text-mid-grey truncate"
								class:text-xs={compact}
								class:text-sm={!compact}
							>
								Battery
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
							style="background-color: {statusColours[batteryStatusId] || statusColours.operating};"
						></span>
						<span
							class="capitalize text-mid-grey"
							class:text-xs={compact}
							class:text-sm={!compact}
						>
							{batteryStatusId}
						</span>
					</div>

					<!-- Capacity -->
					<div class="col-span-2 flex items-baseline gap-1 justify-end">
						<span
							class="font-mono text-dark-grey"
							class:text-sm={compact}
							class:text-base={!compact}
							title="Maximum Capacity"
						>
							{formatCapacity(batteryCapacity)}
						</span>
						<span class="text-mid-grey" class:text-xs={compact} class:text-sm={!compact}>MW</span>
					</div>
				</li>

				<!-- Sub-rows for charging/discharging - Hidden for now -->
				{#if false}
				{#each batterySubUnits as subUnit (subUnit.fueltech_id)}
					{@const subBgColor = colours[subUnit.code] || getFuelTechColor(subUnit.fueltech_id)}
					{@const subIsDarkText = needsDarkText(subUnit.fueltech_id)}

					<li
						class="grid grid-cols-12 items-center gap-3 bg-light-warm-grey/50"
						class:px-3={!compact}
						class:py-2={!compact}
						class:px-2={compact}
						class:py-1.5={compact}
					>
						<div class="col-span-8 flex items-center gap-3 min-w-0 pl-6">
							<span
								class="rounded-full flex-shrink-0 flex items-center justify-center p-1"
								class:text-black={subIsDarkText}
								class:text-white={!subIsDarkText}
								style="background-color: {subBgColor};"
							>
								<FuelTechIcon fuelTech={subUnit.fueltech_id} sizeClass={compact ? 3 : 4} />
							</span>

							<span
								class="text-mid-grey truncate"
								class:text-xs={compact}
								class:text-sm={!compact}
							>
								{subUnit.fueltech_id === 'battery_charging' ? 'Charging' : 'Discharging'}
							</span>
						</div>

						<!-- Empty status column for alignment -->
						<div class="col-span-2"></div>

						<!-- Empty capacity column for sub-rows -->
						<div class="col-span-2"></div>
					</li>
				{/each}
				{/if}
			{/if}
		{/each}
	</ol>
{/if}
