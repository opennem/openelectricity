<script>
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import UnitGroup from './UnitGroup.svelte';
	import { regions } from '../_utils/filters';
	import formatValue from '../_utils/format-value';

	/** Fueltechs that need dark text for contrast */
	const LIGHT_FUELTECHS = ['solar_utility', 'gas_ocgt', 'gas_recip'];

	/**
	 * @type {{
	 *   facility: any,
	 *   onmouseenter?: (facility: any) => void,
	 *   onmouseleave?: () => void
	 * }}
	 */
	let { facility, onmouseenter, onmouseleave } = $props();

	/**
	 * Check if fueltech needs dark text (for light backgrounds)
	 * @param {string} fueltech
	 * @returns {boolean}
	 */
	function needsDarkText(fueltech) {
		return LIGHT_FUELTECHS.includes(fueltech);
	}

	/**
	 * Get the background color for a fueltech
	 * @param {string} fueltech
	 * @returns {string}
	 */
	function getFueltechColor(fueltech) {
		return fuelTechColourMap[fueltech] || '#FFFFFF';
	}

	/**
	 * Get the region label
	 * @param {string} network_id
	 * @param {string} network_region
	 * @returns {string}
	 */
	function getRegionLabel(network_id, network_region) {
		if (network_region) {
			return regions.find((r) => r.value === network_region.toLowerCase())?.label || network_region;
		}
		return network_id?.toUpperCase();
	}

	/**
	 * Sum a numeric field across units
	 * @param {any[]} units
	 * @param {string} field
	 * @returns {number}
	 */
	function sumField(units, field) {
		return units.reduce((sum, unit) => sum + (Number(unit[field]) || 0), 0);
	}

	/**
	 * @typedef {Object} UnitSummary
	 * @property {string} fueltech_id
	 * @property {string} status_id
	 * @property {number} capacity_maximum
	 * @property {number} capacity_registered
	 * @property {number} max_generation
	 */

	/**
	 * @typedef {Object} UnitGroup
	 * @property {string} fueltech_id
	 * @property {string} status_id
	 * @property {any[]} units
	 * @property {boolean} isCommissioning
	 * @property {number} totalCapacity
	 * @property {string} bgColor
	 * @property {UnitSummary} unitSummary
	 */

	/**
	 * Group units by fueltech_id and status_id
	 * @returns {UnitGroup[]}
	 */
	function groupUnits() {
		if (!facility.units || facility.units.length === 0) return [];

		/** @type {Map<string, {fueltech_id: string, status_id: string, units: any[]}>} */
		const groups = new Map();

		for (const unit of facility.units) {
			const key = `${unit.fueltech_id}|||${unit.status_id}`;

			if (!groups.has(key)) {
				groups.set(key, {
					fueltech_id: unit.fueltech_id,
					status_id: unit.status_id,
					units: []
				});
			}
			groups.get(key)?.units.push({ ...unit, isCommissioning: unit.isCommissioning });
		}

		return Array.from(groups.values()).map((group) => {
			const capacity_maximum = sumField(group.units, 'capacity_maximum');
			const capacity_registered = sumField(group.units, 'capacity_registered');
			const max_generation = sumField(group.units, 'max_generation');

			return {
				fueltech_id: group.fueltech_id,
				status_id: group.status_id,
				units: group.units,
				isCommissioning: group.units.some((unit) => unit.isCommissioning),
				totalCapacity: capacity_maximum || capacity_registered,
				bgColor: getFueltechColor(group.fueltech_id),
				unitSummary: {
					fueltech_id: group.fueltech_id,
					status_id: group.status_id,
					capacity_maximum,
					capacity_registered,
					max_generation
				}
			};
		});
	}

	let unitGroups = $derived(groupUnits());
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let hasMultipleGroups = $derived(unitGroups.length > 1);
	let primaryGroup = $derived(unitGroups[0]);

	let path = $derived(`https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`);
</script>

{#snippet fuelTechBadge(/** @type {UnitGroup} */ group)}
	<span
		class="rounded-full p-2 block relative"
		class:text-black={needsDarkText(group.fueltech_id)}
		class:text-white={!needsDarkText(group.fueltech_id)}
		style="background-color: {group.bgColor};"
		title="{group.fueltech_id} ({group.status_id})"
	>
		<FuelTechIcon fuelTech={group.fueltech_id} sizeClass={8} />
		<div class="absolute top-0 left-0 z-10">
			<FacilityStatusIcon status={group.status_id} isCommissioning={group.isCommissioning} />
		</div>
	</span>
{/snippet}

<li
	class="@container border-b border-warm-grey last:border-b-0"
	onmouseenter={() => onmouseenter?.(facility)}
	onmouseleave={() => onmouseleave?.()}
>
	<a
		class="grid grid-cols-12 items-center gap-2 sm:pr-6 group relative hover:no-underline hover:bg-warm-grey"
		class:bg-light-warm-grey={primaryGroup?.status_id === 'committed'}
		target="_blank"
		href={path}
	>
		<div class="p-4 pb-2 sm:pb-4 flex items-center gap-4 @container col-span-12 sm:col-span-7">
			<div class="flex gap-1 items-center">
				{#if hasMultipleGroups}
					<div class="flex -space-x-2 ml-2">
						{#each unitGroups as group}
							{@render fuelTechBadge(group)}
						{/each}
					</div>
				{:else if primaryGroup}
					<div class="ml-2">
						{@render fuelTechBadge(primaryGroup)}
					</div>
				{/if}
			</div>

			<div
				class="text-base leading-base font-medium text-dark-grey flex flex-col @sm:flex-row items-bottom gap-0 @sm:gap-3"
			>
				{facility.name || 'Unnamed Facility'}
			</div>
		</div>

		<div
			class="col-span-12 sm:col-span-5 grid grid-cols-5 px-8 sm:px-0 py-2 sm:py-0 border-t border-warm-grey sm:border-t-0"
		>
			<div class="text-xs text-mid-grey col-span-2">
				<span
					class="block w-18 border-r-0 border-warm-grey pr-4 group-hover:border-light-warm-grey sm:border-r"
				>
					{getRegionLabel(facility.network_id, facility.network_region)}
				</span>
			</div>

			<div class="col-span-3 flex justify-end items-center gap-2 group">
				<div class="flex justify-end items-baseline gap-2">
					<span class="font-mono text-sm text-dark-grey" title="Total Capacity">
						{formatValue(totalCapacity)}
					</span>
					<span class="text-xs text-mid-grey">MW</span>
				</div>

				{#if primaryGroup}
					<div class="group-hover:block hidden absolute z-30 top-0 right-0">
						<div class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[220px] flex flex-col divide-y divide-white/20 [&>*]:py-2 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
							{#each unitGroups as group}
								<UnitGroup
									fueltech_id={group.unitSummary.fueltech_id}
									status_id={group.unitSummary.status_id}
									isCommissioning={group.isCommissioning}
									capacity_maximum={group.unitSummary.capacity_maximum}
									capacity_registered={group.unitSummary.capacity_registered}
									max_generation={group.unitSummary.max_generation}
									network_id={facility.network_id}
									bgColor={group.bgColor}
								/>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</a>
</li>
