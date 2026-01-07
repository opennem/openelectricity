<script>
	import { getNumberFormat } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import UnitTooltip from './UnitTooltip.svelte';
	import { regions } from './page-data-options/filters';
	import isCommissioningCheck from './page-data-options/is-commissioning';

	const numberFormatter = getNumberFormat(0);

	let { facility } = $props();

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
	 * Calculate total capacity from all units
	 * @returns {number}
	 */
	function getTotalCapacity() {
		if (!facility.units || facility.units.length === 0) return 0;
		return facility.units.reduce((/** @type {number} */ total, /** @type {any} */ unit) => {
			const capacity = unit.capacity_maximum || unit.capacity_registered || 0;
			return total + (Number(capacity) || 0);
		}, 0);
	}

	/**
	 * Calculate total storage capacity from all units
	 * @returns {number}
	 */
	function getTotalStorageCapacity() {
		if (!facility.units || facility.units.length === 0) return 0;
		return facility.units.reduce((/** @type {number} */ total, /** @type {any} */ unit) => {
			const capacity = unit.capacity_storage || 0;
			return total + (Number(capacity) || 0);
		}, 0);
	}

	/**
	 * Group units by fueltech_id and status_id
	 * @returns {Array<{fueltech_id: string, status_id: string, units: any[], isCommissioning: boolean, totalCapacity: number}>}
	 */
	function groupUnits() {
		if (!facility.units || facility.units.length === 0) return [];

		/** @type {Map<string, {fueltech_id: string, status_id: string, units: any[]}>} */
		const groups = new Map();

		facility.units.forEach((/** @type {any} */ unit) => {
			const isCommissioning = isCommissioningCheck(unit);
			const statusId = isCommissioning ? 'commissioning' : unit.status_id;
			const key = `${unit.fueltech_id}|||${statusId}`;

			if (!groups.has(key)) {
				groups.set(key, {
					fueltech_id: unit.fueltech_id,
					status_id: statusId,
					units: []
				});
			}
			const group = groups.get(key);
			if (group) {
				group.units.push({ ...unit, isCommissioning });
			}
		});

		return Array.from(groups.values()).map((group) => {
			const totalCapacity = group.units.reduce((sum, unit) => {
				const cap = unit.capacity_maximum || unit.capacity_registered || 0;
				return sum + (Number(cap) || 0);
			}, 0);

			// Get isCommissioning from any unit in the group (all should be the same)
			const isCommissioning = group.units.some((unit) => unit.isCommissioning);

			return {
				fueltech_id: group.fueltech_id,
				status_id: group.status_id,
				units: group.units,
				isCommissioning,
				totalCapacity
			};
		});
	}

	let unitGroups = $derived(groupUnits());
	let totalCapacity = $derived(getTotalCapacity());
	let totalStorageCapacity = $derived(getTotalStorageCapacity());
	let hasMultipleGroups = $derived(unitGroups.length > 1);
	let primaryGroup = $derived(unitGroups[0]);
	let primaryBgColor = $derived(
		primaryGroup ? getFueltechColor(primaryGroup.fueltech_id) : '#FFFFFF'
	);

	const path = `https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`;
</script>

<li class="@container">
	<a
		class="grid grid-cols-12 items-center gap-2 sm:pr-6 group relative hover:no-underline hover:bg-warm-grey rounded-lg"
		class:bg-light-warm-grey={primaryGroup && primaryGroup.status_id === 'committed'}
		target="_blank"
		href={path}
	>
		<div class="p-4 pb-2 sm:pb-4 flex items-center gap-4 @container col-span-12 sm:col-span-7">
			<div class="flex gap-1 items-center">
				{#if hasMultipleGroups}
					<!-- Show multiple fuel tech icons stacked -->
					<div class="flex -space-x-2">
						{#each unitGroups as group}
							{@const bgColor = getFueltechColor(group.fueltech_id)}
							<span
								class="rounded-full p-2 block border-2 border-white relative"
								class:text-black={group.fueltech_id === 'solar_utility' ||
									group.fueltech_id === 'gas_ocgt' ||
									group.fueltech_id === 'gas_recip'}
								class:text-white={group.fueltech_id !== 'solar_utility' &&
									group.fueltech_id !== 'gas_ocgt' &&
									group.fueltech_id !== 'gas_recip'}
								style="background-color: {bgColor};"
								title="{group.fueltech_id} ({group.status_id})"
							>
								<FuelTechIcon fuelTech={group.fueltech_id} sizeClass={8} />
								<div class="absolute -top-1 -left-1 z-10">
									<FacilityStatusIcon
										status={group.status_id}
										isCommissioning={group.isCommissioning}
									/>
								</div>
							</span>
						{/each}
					</div>
				{:else if primaryGroup}
					<!-- Show single fuel tech icon -->
					<span
						class="rounded-full p-2 block ml-2 relative"
						class:text-black={primaryGroup.fueltech_id === 'solar_utility' ||
							primaryGroup.fueltech_id === 'gas_ocgt' ||
							primaryGroup.fueltech_id === 'gas_recip'}
						class:text-white={primaryGroup.fueltech_id !== 'solar_utility' &&
							primaryGroup.fueltech_id !== 'gas_ocgt' &&
							primaryGroup.fueltech_id !== 'gas_recip'}
						style="background-color: {primaryBgColor};"
					>
						<FuelTechIcon fuelTech={primaryGroup.fueltech_id} sizeClass={8} />
						<div class="absolute -top-1 -left-1 z-10">
							<FacilityStatusIcon
								status={primaryGroup.status_id}
								isCommissioning={primaryGroup.isCommissioning}
							/>
						</div>
					</span>
				{/if}
			</div>

			<div
				class="text-base leading-base font-medium text-dark-grey flex flex-col @sm:flex-row items-bottom gap-0 @sm:gap-3"
			>
				{facility.name || 'Unnamed Facility'}

				<!-- {#if totalStorageCapacity > 0}
					<span class="text-xs items-baseline text-mid-grey" title="Total Storage Capacity">
						(<span class="font-mono">
							{numberFormatter.format(totalStorageCapacity)}
						</span>
						<span class="text-xxs">MWh</span>)
					</span>
				{/if} -->
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
						{numberFormatter.format(totalCapacity)}
					</span>
					<span class="text-xs text-mid-grey">MW</span>
				</div>

				{#if primaryGroup}
					<div class="group-hover:block hidden absolute z-30 top-0 right-0">
						{#if hasMultipleGroups}
							<!-- Show tooltips for each group, stacked vertically -->
							<div class="flex flex-col gap-2">
								{#each unitGroups as group}
									{@const bgColor = getFueltechColor(group.fueltech_id)}
									{@const firstUnit = group.units[0]}
									<UnitTooltip
										network_id={facility.network_id}
										unit={firstUnit}
										fill={bgColor}
										isCommissioning={group.isCommissioning}
									/>
								{/each}
							</div>
						{:else}
							<!-- Show single tooltip for primary group -->
							<UnitTooltip
								network_id={facility.network_id}
								unit={primaryGroup.units[0]}
								fill={primaryBgColor}
								isCommissioning={primaryGroup.isCommissioning}
							/>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</a>
</li>
